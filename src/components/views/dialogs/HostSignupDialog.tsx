/*
Copyright 2021 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React from "react";
import classNames from "classnames";
import { logger } from "matrix-js-sdk/src/logger";

import AccessibleButton from "../elements/AccessibleButton";
import Modal from "../../../Modal";
import QuestionDialog from './QuestionDialog';
import SdkConfig from "../../../SdkConfig";
import { _t } from "../../../languageHandler";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import { HostSignupStore } from "../../../stores/HostSignupStore";
import { OwnProfileStore } from "../../../stores/OwnProfileStore";
import {
    IPostmessage,
    IPostmessageResponseData,
    PostmessageAction,
} from "./HostSignupDialogTypes";
import { IConfigOptions } from "../../../IConfigOptions";
import { SnakedObject } from "../../../utils/SnakedObject";

interface IProps {}

interface IState {
    completed: boolean;
    error: string;
    minimized: boolean;
}

export default class HostSignupDialog extends React.PureComponent<IProps, IState> {
    private iframeRef: React.RefObject<HTMLIFrameElement> = React.createRef();
    private readonly config: SnakedObject<IConfigOptions["host_signup"]>;

    constructor(props: IProps) {
        super(props);

        this.state = {
            completed: false,
            error: null,
            minimized: false,
        };

        this.config = SdkConfig.getObject("host_signup");
    }

    private messageHandler = async (message: IPostmessage) => {
        if (!this.config.get("url").startsWith(message.origin)) {
            return;
        }
        switch (message.data.action) {
            case PostmessageAction.HostSignupAccountDetailsRequest:
                this.onAccountDetailsRequest();
                break;
            case PostmessageAction.Maximize:
                this.setState({
                    minimized: false,
                });
                break;
            case PostmessageAction.Minimize:
                this.setState({
                    minimized: true,
                });
                break;
            case PostmessageAction.SetupComplete:
                this.setState({
                    completed: true,
                });
                break;
            case PostmessageAction.CloseDialog:
                return this.closeDialog();
        }
    };

    private maximizeDialog = () => {
        this.setState({
            minimized: false,
        });
        // Send this action to the iframe so it can act accordingly
        this.sendMessage({
            action: PostmessageAction.Maximize,
        });
    };

    private minimizeDialog = () => {
        this.setState({
            minimized: true,
        });
        // Send this action to the iframe so it can act accordingly
        this.sendMessage({
            action: PostmessageAction.Minimize,
        });
    };

    private closeDialog = async () => {
        window.removeEventListener("message", this.messageHandler);
        // Finally clear the flag in
        return HostSignupStore.instance.setHostSignupActive(false);
    };

    private onCloseClick = async () => {
        if (this.state.completed) {
            // We're done, close
            return this.closeDialog();
        } else {
            Modal.createDialog(
                QuestionDialog,
                {
                    title: _t("Confirm abort of host creation"),
                    description: _t(
                        "Are you sure you wish to abort creation of the host? The process cannot be continued.",
                    ),
                    button: _t("Abort"),
                    onFinished: result => {
                        if (result) {
                            return this.closeDialog();
                        }
                    },
                },
            );
        }
    };

    private sendMessage = (message: IPostmessageResponseData) => {
        this.iframeRef.current.contentWindow.postMessage(message, this.config.get("url"));
    };

    private async sendAccountDetails() {
        const openIdToken = await MatrixClientPeg.get().getOpenIdToken();
        if (!openIdToken || !openIdToken.access_token) {
            logger.warn("Failed to connect to homeserver for OpenID token.");
            this.setState({
                completed: true,
                error: _t("Failed to connect to your homeserver. Please close this dialog and try again."),
            });
            return;
        }
        this.sendMessage({
            action: PostmessageAction.HostSignupAccountDetails,
            account: {
                accessToken: await MatrixClientPeg.get().getAccessToken(),
                name: OwnProfileStore.instance.displayName,
                openIdToken: openIdToken.access_token,
                serverName: await MatrixClientPeg.get().getDomain(),
                userLocalpart: await MatrixClientPeg.get().getUserIdLocalpart(),
                termsAccepted: true,
            },
        });
    }

    private onAccountDetailsDialogFinished = async (result) => {
        if (result) {
            return this.sendAccountDetails();
        }
        return this.closeDialog();
    };

    private onAccountDetailsRequest = () => {
        const cookiePolicyUrl = this.config.get("cookie_policy_url");
        const privacyPolicyUrl = this.config.get("privacy_policy_url");
        const tosUrl = this.config.get("terms_of_service_url");

        const textComponent = (
            <>
                <p>
                    { _t("Continuing temporarily allows the %(hostSignupBrand)s setup process to access your " +
                        "account to fetch verified email addresses. This data is not stored.", {
                        hostSignupBrand: this.config.get("brand"),
                    }) }
                </p>
                <p>
                    { _t("Learn more in our <privacyPolicyLink />, <termsOfServiceLink /> and <cookiePolicyLink />.",
                        {},
                        {
                            cookiePolicyLink: () => (
                                <a href={cookiePolicyUrl} target="_blank" rel="noreferrer noopener">
                                    { _t("Cookie Policy") }
                                </a>
                            ),
                            privacyPolicyLink: () => (
                                <a href={privacyPolicyUrl} target="_blank" rel="noreferrer noopener">
                                    { _t("Privacy Policy") }
                                </a>
                            ),
                            termsOfServiceLink: () => (
                                <a href={tosUrl} target="_blank" rel="noreferrer noopener">
                                    { _t("Terms of Service") }
                                </a>
                            ),
                        },
                    ) }
                </p>
            </>
        );
        Modal.createDialog(
            QuestionDialog,
            {
                title: _t("You should know"),
                description: textComponent,
                button: _t("Continue"),
                onFinished: this.onAccountDetailsDialogFinished,
            },
        );
    };

    public componentDidMount() {
        window.addEventListener("message", this.messageHandler);
    }

    public componentWillUnmount() {
        if (HostSignupStore.instance.isHostSignupActive) {
            // Run the close dialog actions if we're still active, otherwise good to go
            return this.closeDialog();
        }
    }

    public render(): React.ReactNode {
        return (
            <div className={classNames({ "mx_Dialog_wrapper": !this.state.minimized })}>
                <div
                    className={classNames("mx_Dialog",
                        {
                            "mx_HostSignupDialog_minimized": this.state.minimized,
                            "mx_HostSignupDialog": !this.state.minimized,
                        },
                    )}
                >
                    { this.state.minimized &&
                        <div className="mx_Dialog_header mx_Dialog_headerWithButton">
                            <div className="mx_Dialog_title">
                                { _t("%(hostSignupBrand)s Setup", {
                                    hostSignupBrand: this.config.get("brand"),
                                }) }
                            </div>
                            <AccessibleButton
                                className="mx_HostSignup_maximize_button"
                                onClick={this.maximizeDialog}
                                aria-label={_t("Maximise dialog")}
                                title={_t("Maximise dialog")}
                            />
                        </div>
                    }
                    { !this.state.minimized &&
                        <div className="mx_Dialog_header mx_Dialog_headerWithCancel">
                            <AccessibleButton
                                onClick={this.minimizeDialog}
                                className="mx_HostSignup_minimize_button"
                                aria-label={_t("Minimise dialog")}
                                title={_t("Minimise dialog")}
                            />
                            <AccessibleButton
                                onClick={this.onCloseClick}
                                className="mx_Dialog_cancelButton"
                                aria-label={_t("Close dialog")}
                                title={_t("Close dialog")}
                            />
                        </div>
                    }
                    { this.state.error &&
                        <div>
                            { this.state.error }
                        </div>
                    }
                    { !this.state.error &&
                        <iframe
                            title={_t(
                                "Upgrade to %(hostSignupBrand)s",
                                {
                                    hostSignupBrand: this.config.get("brand"),
                                },
                            )}
                            src={this.config.get("url")}
                            ref={this.iframeRef}
                            sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
                        />
                    }
                </div>
            </div>
        );
    }
}
