/*
Copyright 2017 - 2021 The Matrix.org Foundation C.I.C.

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

import {
    AuthType,
    IAuthData,
    IAuthDict,
    IInputs,
    InteractiveAuth,
    IStageStatus,
} from "matrix-js-sdk/src/interactive-auth";
import { MatrixClient } from "matrix-js-sdk/src/client";
import React, { createRef } from 'react';
import { logger } from "matrix-js-sdk/src/logger";

import getEntryComponentForLoginType, { IStageComponent } from '../views/auth/InteractiveAuthEntryComponents';
import Spinner from "../views/elements/Spinner";

export const ERROR_USER_CANCELLED = new Error("User cancelled auth session");

type InteractiveAuthCallbackSuccess = (
    success: true,
    response: IAuthData,
    extra?: { emailSid?: string, clientSecret?: string }
) => void;
type InteractiveAuthCallbackFailure = (
    success: false,
    response: IAuthData | Error,
) => void;
export type InteractiveAuthCallback = InteractiveAuthCallbackSuccess & InteractiveAuthCallbackFailure;

interface IProps {
    // matrix client to use for UI auth requests
    matrixClient: MatrixClient;
    // response from initial request. If not supplied, will do a request on mount.
    authData?: IAuthData;
    // Inputs provided by the user to the auth process
    // and used by various stages. As passed to js-sdk
    // interactive-auth
    inputs?: IInputs;
    sessionId?: string;
    clientSecret?: string;
    emailSid?: string;
    // If true, poll to see if the auth flow has been completed out-of-band
    poll?: boolean;
    // If true, components will be told that the 'Continue' button
    // is managed by some other party and should not be managed by
    // the component itself.
    continueIsManaged?: boolean;
    // continueText and continueKind are passed straight through to the AuthEntryComponent.
    continueText?: string;
    continueKind?: string;
    // callback
    makeRequest(auth: IAuthData): Promise<IAuthData>;
    // callback called when the auth process has finished,
    // successfully or unsuccessfully.
    // @param {boolean} status True if the operation requiring
    //     auth was completed successfully, false if canceled.
    // @param {object} result The result of the authenticated call
    //     if successful, otherwise the error object.
    // @param {object} extra Additional information about the UI Auth
    //     process:
    //      * emailSid {string} If email auth was performed, the sid of
    //            the auth session.
    //      * clientSecret {string} The client secret used in auth
    //            sessions with the ID server.
    onAuthFinished: InteractiveAuthCallback;
    // As js-sdk interactive-auth
    requestEmailToken?(email: string, secret: string, attempt: number, session: string): Promise<{ sid: string }>;
    // Called when the stage changes, or the stage's phase changes. First
    // argument is the stage, second is the phase. Some stages do not have
    // phases and will be counted as 0 (numeric).
    onStagePhaseChange?(stage: string, phase: string | number): void;
}

interface IState {
    authStage?: AuthType;
    stageState?: IStageStatus;
    busy: boolean;
    errorText?: string;
    errorCode?: string;
    submitButtonEnabled: boolean;
}

export default class InteractiveAuthComponent extends React.Component<IProps, IState> {
    private readonly authLogic: InteractiveAuth;
    private readonly intervalId: number = null;
    private readonly stageComponent = createRef<IStageComponent>();

    private unmounted = false;

    constructor(props) {
        super(props);

        this.state = {
            authStage: null,
            busy: false,
            errorText: null,
            errorCode: null,
            submitButtonEnabled: false,
        };

        this.authLogic = new InteractiveAuth({
            authData: this.props.authData,
            doRequest: this.requestCallback,
            busyChanged: this.onBusyChanged,
            inputs: this.props.inputs,
            stateUpdated: this.authStateUpdated,
            matrixClient: this.props.matrixClient,
            sessionId: this.props.sessionId,
            clientSecret: this.props.clientSecret,
            emailSid: this.props.emailSid,
            requestEmailToken: this.requestEmailToken,
        });

        if (this.props.poll) {
            this.intervalId = setInterval(() => {
                this.authLogic.poll();
            }, 2000);
        }
    }

    // TODO: [REACT-WARNING] Replace component with real class, use constructor for refs
    UNSAFE_componentWillMount() { // eslint-disable-line @typescript-eslint/naming-convention, camelcase
        this.authLogic.attemptAuth().then((result) => {
            const extra = {
                emailSid: this.authLogic.getEmailSid(),
                clientSecret: this.authLogic.getClientSecret(),
            };
            this.props.onAuthFinished(true, result, extra);
        }).catch((error) => {
            this.props.onAuthFinished(false, error);
            logger.error("Error during user-interactive auth:", error);
            if (this.unmounted) {
                return;
            }

            const msg = error.message || error.toString();
            this.setState({
                errorText: msg,
                errorCode: error.errcode,
            });
        });
    }

    componentWillUnmount() {
        this.unmounted = true;

        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
        }
    }

    private requestEmailToken = async (
        email: string,
        secret: string,
        attempt: number,
        session: string,
    ): Promise<{sid: string}> => {
        this.setState({
            busy: true,
        });
        try {
            return await this.props.requestEmailToken(email, secret, attempt, session);
        } finally {
            this.setState({
                busy: false,
            });
        }
    };

    private authStateUpdated = (stageType: AuthType, stageState: IStageStatus): void => {
        const oldStage = this.state.authStage;
        this.setState({
            busy: false,
            authStage: stageType,
            stageState: stageState,
            errorText: stageState.error,
            errorCode: stageState.errcode,
        }, () => {
            if (oldStage !== stageType) {
                this.setFocus();
            } else if (!stageState.error) {
                this.stageComponent.current?.attemptFailed?.();
            }
        });
    };

    private requestCallback = (auth: IAuthData, background: boolean): Promise<IAuthData> => {
        // This wrapper just exists because the js-sdk passes a second
        // 'busy' param for backwards compat. This throws the tests off
        // so discard it here.
        return this.props.makeRequest(auth);
    };

    private onBusyChanged = (busy: boolean): void => {
        // if we've started doing stuff, reset the error messages
        if (busy) {
            this.setState({
                busy: true,
                errorText: null,
                errorCode: null,
            });
        }
        // The JS SDK eagerly reports itself as "not busy" right after any
        // immediate work has completed, but that's not really what we want at
        // the UI layer, so we ignore this signal and show a spinner until
        // there's a new screen to show the user. This is implemented by setting
        // `busy: false` in `authStateUpdated`.
        // See also https://github.com/vector-im/element-web/issues/12546
    };

    private setFocus(): void {
        this.stageComponent.current?.focus?.();
    }

    private submitAuthDict = (authData: IAuthDict): void => {
        this.authLogic.submitAuthDict(authData);
    };

    private onPhaseChange = (newPhase: number): void => {
        this.props.onStagePhaseChange?.(this.state.authStage, newPhase || 0);
    };

    private onStageCancel = (): void => {
        this.props.onAuthFinished(false, ERROR_USER_CANCELLED);
    };

    private onAuthStageFailed = (e: Error): void => {
        this.props.onAuthFinished(false, e);
    };

    private setEmailSid = (sid: string): void => {
        this.authLogic.setEmailSid(sid);
    };

    render() {
        const stage = this.state.authStage;
        if (!stage) {
            if (this.state.busy) {
                return <Spinner />;
            } else {
                return null;
            }
        }

        const StageComponent = getEntryComponentForLoginType(stage);
        return (
            <StageComponent
                ref={this.stageComponent as any}
                loginType={stage}
                matrixClient={this.props.matrixClient}
                authSessionId={this.authLogic.getSessionId()}
                clientSecret={this.authLogic.getClientSecret()}
                stageParams={this.authLogic.getStageParams(stage)}
                submitAuthDict={this.submitAuthDict}
                errorText={this.state.errorText}
                errorCode={this.state.errorCode}
                busy={this.state.busy}
                inputs={this.props.inputs}
                stageState={this.state.stageState}
                fail={this.onAuthStageFailed}
                setEmailSid={this.setEmailSid}
                showContinue={!this.props.continueIsManaged}
                onPhaseChange={this.onPhaseChange}
                requestEmailToken={this.authLogic.requestEmailToken}
                continueText={this.props.continueText}
                continueKind={this.props.continueKind}
                onCancel={this.onStageCancel}
            />
        );
    }
}
