/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import * as React from "react";
import * as sdk from '../../../index';
import Modal from "../../../Modal";
import ModalWidgetDialog from "./ModalWidgetDialog";
import SdkConfig from "../../../SdkConfig";
import { _t } from "../../../languageHandler";
import { IModalWidgetOpenRequestData } from "matrix-widget-api";
// import { MatrixClientPeg } from "../../../MatrixClientPeg";

interface IProps {
    requestClose(): void;
}

interface IState {
    completed: boolean;
    error: string;
    widgetData: IModalWidgetOpenRequestData;
}

export default class HostingSignupDialog extends React.PureComponent<IProps, IState> {
    constructor(props: IProps) {
        super(props);

        this.state = {
            completed: false,
            error: null,
            widgetData: {
                type: 'm.custom',
                url: SdkConfig.get().hosting_signup.url,
                name: _t("Set up your own personal Element host"),
            },
        };
    }

    // private messageHandler = (message) => {
    //     if (!this.state.widgetData.url.startsWith(message.origin)) {
    //         return;
    //     }
    //     switch (message.data.action) {
    //         case 'account_credentials_request':
    //             // noinspection JSIgnoredPromiseFromCall
    //             this.sendAccountDetails();
    //             break;
    //         case 'setup_complete':
    //             // Set as completed but let the user close the modal themselves
    //             // so they have time to finish reading any information
    //             this.setState({
    //                 completed: true,
    //             });
    //             break;
    //         case 'close_dialog':
    //             this.onFinished(true);
    //             break;
    //     }
    // }

    private onFinished = (result: boolean) => {
        if (result || this.state.completed) {
            // We're done, close
            this.props.requestClose();
        } else {
            const ConfirmDialog = sdk.getComponent('views.dialogs.ConfirmCloseHostingSignupDialog');
            Modal.createDialog(
                ConfirmDialog,
                {
                    onFinished: result => {
                        if (result) {
                            this.props.requestClose();
                        }
                    },
                },
            );
        }
    }

    // private sendMessage = (message) => {
    //     this.iframeRef.contentWindow.postMessage(
    //         message,
    //         this.state.widgetData.url,
    //     )
    // }

    // private async sendAccountDetails() {
    //     this.sendMessage({
    //         action: 'account_credentials',
    //         credentials: {
    //             accessToken: await MatrixClientPeg.get().getAccessToken(),
    //             serverName: await MatrixClientPeg.get().getDomain(),
    //             userLocalpart: await MatrixClientPeg.get().getUserIdLocalpart(),
    //         },
    //     });
    // }
    //
    // public componentDidMount() {
    //     window.addEventListener("message", this.messageHandler);
    // }
    //
    // public componentWillUnmount() {
    //     window.removeEventListener("message", this.messageHandler);
    // }

    public render(): React.ReactNode {
        return (
            <ModalWidgetDialog
                onFinished={this.onFinished}
                sourceWidgetId='hosting_signup_dialog'
                widgetDefinition={this.state.widgetData}
            >
            </ModalWidgetDialog>
        );
    }
}
