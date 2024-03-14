/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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
import {
    MSC4108SignInWithQR,
    RendezvousFailureReason,
    RendezvousIntent,
    buildLoginFromScannedCode,
} from "matrix-js-sdk/src/rendezvous";
import { MSC4108RendezvousSession } from "matrix-js-sdk/src/rendezvous/transports";
import { MSC4108SecureChannel } from "matrix-js-sdk/src/rendezvous/channels";
import { logger } from "matrix-js-sdk/src/logger";
import { MatrixClient, discoverAndValidateOIDCIssuerWellKnown, generateScope } from "matrix-js-sdk/src/matrix";
import { OnResultFunction } from "react-qr-reader";
import { OidcClient } from "oidc-client-ts";

import LoginWithQRFlow from "./LoginWithQRFlow";
import { getOidcClientId } from "../../../utils/oidc/registerClient";
import SdkConfig from "../../../SdkConfig";
import { completeDeviceAuthorizationGrant, completeLoginWithQr } from "../../../Lifecycle";

/**
 * The intention of this enum is to have a mode that scans a QR code instead of generating one.
 */
export enum Mode {
    /**
     * A QR code with be generated and shown
     */
    Show = "show",
    Scan = "scan",
}

export enum Phase {
    Loading = "loading",
    ScanningQR = "scanningQR",
    ShowingQR = "showingQR",
    Connecting = "connecting",
    OutOfBandConfirmation = "outOfBandConfirmation",
    ShowChannelSecure = "showChannelSecure",
    WaitingForDevice = "waitingForDevice",
    Verifying = "verifying",
    Continue = "continue",
    Error = "error",
}

export enum Click {
    Cancel,
    Decline,
    Approve,
    TryAgain,
    Back,
    ScanQr,
    ShowQr,
}

interface IProps {
    client?: MatrixClient;
    mode: Mode;
    onFinished(...args: any): void;
}

interface IState {
    phase: Phase;
    rendezvous?: MSC4108SignInWithQR;
    verificationUri?: string;
    userCode?: string;
    failureReason?: RendezvousFailureReason;
    mediaPermissionError?: boolean;
    lastScannedCode?: Buffer;
    ourIntent: RendezvousIntent;
    homeserverBaseUrl?: string;
}

export enum LoginWithQRFailureReason {
    RateLimited = "rate_limited",
}

export type FailureReason = RendezvousFailureReason | LoginWithQRFailureReason;

/**
 * A component that allows sign in and E2EE set up with a QR code.
 *
 * It implements `login.reciprocate` capabilities and showing QR codes.
 *
 * This uses the unstable feature of MSC3906: https://github.com/matrix-org/matrix-spec-proposals/pull/3906
 */
export default class LoginWithQR extends React.Component<IProps, IState> {
    public constructor(props: IProps) {
        super(props);

        this.state = {
            phase: Phase.Loading,
            ourIntent: this.props.client
                ? RendezvousIntent.RECIPROCATE_LOGIN_ON_EXISTING_DEVICE
                : RendezvousIntent.LOGIN_ON_NEW_DEVICE,
        };
    }

    public componentDidMount(): void {
        this.updateMode(this.props.mode).then(() => {});
    }

    public componentDidUpdate(prevProps: Readonly<IProps>): void {
        if (prevProps.mode !== this.props.mode) {
            this.updateMode(this.props.mode).then(() => {});
        }
    }

    private async updateMode(mode: Mode): Promise<void> {
        logger.info(`updateMode: ${mode}`);
        this.setState({ phase: Phase.Loading });
        if (this.state.rendezvous) {
            const rendezvous = this.state.rendezvous;
            rendezvous.onFailure = undefined;
            // await rendezvous.cancel(RendezvousFailureReason.UserCancelled);
            this.setState({ rendezvous: undefined });
        }
        if (mode === Mode.Show) {
            await this.generateAndShowCode();
        } else {
            await this.requestMediaPermissions();
            this.setState({ phase: Phase.ScanningQR });
        }
    }

    public componentWillUnmount(): void {
        if (this.state.rendezvous) {
            // eslint-disable-next-line react/no-direct-mutation-state
            this.state.rendezvous.onFailure = undefined;
            // calling cancel will call close() as well to clean up the resources
            this.state.rendezvous.cancel(RendezvousFailureReason.UserCancelled).then(() => {});
        }
    }

    private getOidcClient = async (homeserverBaseUrl: string): Promise<OidcClient> => {
        // oidc discovery
        const tempClient = new MatrixClient({ baseUrl: homeserverBaseUrl });
        // this should fall back to the well-known
        const { issuer } = await tempClient.getAuthIssuer();
        // AutoDiscovery;
        const metadata = await discoverAndValidateOIDCIssuerWellKnown(issuer);
        // oidc registration
        const clientId = await getOidcClientId(metadata, SdkConfig.get().oidc_static_clients);

        const scope = generateScope();
        const oidcClient = new OidcClient({
            ...metadata,
            client_id: clientId,
            redirect_uri: window.location.href,
            authority: issuer,
            scope,
        });

        return oidcClient;
    };

    private generateAndShowCode = async (): Promise<void> => {
        let rendezvous: MSC4108SignInWithQR;
        try {
            const fallbackRzServer =
                this.props.client?.getClientWellKnown()?.["io.element.rendezvous"]?.server ??
                "https://rendezvous.lab.element.dev";
            const transport = new MSC4108RendezvousSession({
                onFailure: this.onFailure,
                client: this.props.client,
                fallbackRzServer,
            });
            await transport.send("");

            const channel = new MSC4108SecureChannel(transport, undefined, this.onFailure);

            rendezvous = new MSC4108SignInWithQR(channel, false, this.props.client, this.onFailure);

            await rendezvous.generateCode();
            this.setState({
                phase: Phase.ShowingQR,
                rendezvous,
                failureReason: undefined,
            });
        } catch (e) {
            logger.error("Error whilst generating QR code", e);
            this.setState({ phase: Phase.Error, failureReason: RendezvousFailureReason.HomeserverLacksSupport });
            return;
        }

        try {
            const { homeserverBaseUrl } = await rendezvous.loginStep1();

            if (this.state.ourIntent === RendezvousIntent.LOGIN_ON_NEW_DEVICE) {
                if (!homeserverBaseUrl) {
                    throw new Error("We don't know the homeserver");
                }
                // PROTOTYPE: this feels bad, we have taken the homeserver URL that was sent by the other device
                // before the channel was confirmed to the secure
                // this could cause us to leak the OIDC registration data to a malicious server
                // TODO: has this been implemented incorrectly? or is it a flaw in MSC4108?
                await rendezvous.loginStep2(await this.getOidcClient(homeserverBaseUrl));
            }

            const { verificationUri } = await rendezvous.loginStep3();
            this.setState({
                phase: Phase.OutOfBandConfirmation,
                verificationUri,
                homeserverBaseUrl,
            });

            // we ask the user to confirm that the channel is secure
        } catch (e) {
            logger.error("Error whilst doing QR login", e);
            // only set to error phase if it hasn't already been set by onFailure or similar
            if (this.state.phase !== Phase.Error) {
                this.setState({ phase: Phase.Error, failureReason: RendezvousFailureReason.Unknown });
            }
        }
    };

    private processScannedCode = async (scannedCode: Buffer): Promise<void> => {
        logger.info(scannedCode.toString());
        try {
            if (this.state.lastScannedCode?.equals(scannedCode)) {
                return; // suppress duplicate scans
            }
            if (this.state.rendezvous) {
                await this.state.rendezvous.cancel(RendezvousFailureReason.UserCancelled);
                this.reset();
            }

            const { signin: rendezvous, homeserverBaseUrl: homeserverBaseUrlFromCode } =
                await buildLoginFromScannedCode(this.props.client, scannedCode, this.onFailure);

            this.setState({
                phase: Phase.Connecting,
                lastScannedCode: scannedCode,
                rendezvous,
                failureReason: undefined,
            });

            const { homeserverBaseUrl: homeserverBaseUrlFromStep1 } = await rendezvous.loginStep1();

            if (this.state.ourIntent === RendezvousIntent.LOGIN_ON_NEW_DEVICE) {
                const homeserverBaseUrl = homeserverBaseUrlFromCode;

                if (!homeserverBaseUrl) {
                    throw new Error("We don't know the homeserver");
                }
                const oidcClient = await this.getOidcClient(homeserverBaseUrl);
                await rendezvous.loginStep2(oidcClient);

                this.setState({
                    phase: Phase.ShowChannelSecure,
                });
                const { userCode } = await rendezvous.loginStep3();
                this.setState({
                    phase: Phase.ShowChannelSecure,
                    userCode,
                });

                // wait  for grant:
                const tokenResponse = await rendezvous.loginStep4();

                const { credentials } = await completeDeviceAuthorizationGrant(
                    oidcClient,
                    tokenResponse,
                    homeserverBaseUrl,
                    undefined,
                );

                if (!credentials) {
                    throw new Error("Failed to complete device authorization grant");
                }

                // wait for secrets:
                const { secrets } = await rendezvous.loginStep5(credentials.deviceId);

                await completeLoginWithQr(credentials, secrets);

                // done
                this.props.onFinished(credentials);
            } else {
                const homeserverBaseUrl = homeserverBaseUrlFromStep1;
                this.setState({
                    phase: Phase.ShowChannelSecure,
                });
                const { verificationUri } = await rendezvous.loginStep3();
                this.setState({
                    phase: Phase.Continue,
                    verificationUri,
                    homeserverBaseUrl,
                });
            }
        } catch (e) {
            alert(e);
            throw e;
        }
    };

    private approveLoginAfterShowingCode = async (): Promise<void> => {
        if (!this.state.rendezvous) {
            throw new Error("Rendezvous not found");
        }

        if (this.state.ourIntent === RendezvousIntent.RECIPROCATE_LOGIN_ON_EXISTING_DEVICE) {
            this.setState({ phase: Phase.Loading });

            if (this.state.verificationUri) {
                window.open(this.state.verificationUri, "_blank");
            }

            this.setState({ phase: Phase.WaitingForDevice });

            // send secrets
            await this.state.rendezvous.loginStep5();

            // done
            this.props.onFinished(true);
        } else {
            if (!this.state.homeserverBaseUrl) {
                throw new Error("We don't know the homeserver");
            }
            const { homeserverBaseUrl } = this.state;
            const oidcClient = await this.getOidcClient(homeserverBaseUrl);
            await this.state.rendezvous.loginStep2(oidcClient);
            const { userCode } = await this.state.rendezvous.loginStep3();
            this.setState({ phase: Phase.WaitingForDevice, userCode });

            // wait for grant:
            const tokenResponse = await this.state.rendezvous.loginStep4();

            const { credentials } = await completeDeviceAuthorizationGrant(
                oidcClient,
                tokenResponse,
                homeserverBaseUrl,
                undefined,
            );

            if (!credentials) {
                throw new Error("Failed to complete device authorization grant");
            }

            // wait for secrets
            const { secrets } = await this.state.rendezvous.loginStep5(credentials.deviceId);

            await completeLoginWithQr(credentials, secrets);

            // done
            this.props.onFinished(credentials);
        }
    };

    private onFailure = (reason: RendezvousFailureReason): void => {
        logger.info(`Rendezvous failed: ${reason}`);
        this.setState({ phase: Phase.Error, failureReason: reason });
    };

    public reset(): void {
        this.setState({
            rendezvous: undefined,
            verificationUri: undefined,
            failureReason: undefined,
            userCode: undefined,
            homeserverBaseUrl: undefined,
            lastScannedCode: undefined,
            mediaPermissionError: false,
        });
    }

    private onClick = async (type: Click): Promise<void> => {
        switch (type) {
            case Click.Cancel:
                await this.state.rendezvous?.cancel(RendezvousFailureReason.UserCancelled);
                this.reset();
                this.props.onFinished(false);
                break;
            case Click.Approve:
                await this.approveLoginAfterShowingCode();
                break;
            case Click.Decline:
                await this.state.rendezvous?.declineLoginOnExistingDevice();
                this.reset();
                this.props.onFinished(false);
                break;
            case Click.TryAgain:
                this.reset();
                await this.updateMode(this.props.mode);
                break;
            case Click.Back:
                await this.state.rendezvous?.cancel(RendezvousFailureReason.UserCancelled);
                this.props.onFinished(false);
                break;
            case Click.ScanQr:
                await this.updateMode(Mode.Scan);
                break;
            case Click.ShowQr:
                await this.updateMode(Mode.Show);
                break;
        }
    };

    private onScannedQRCode: OnResultFunction = (result, error): void => {
        if (result) {
            void this.processScannedCode(Buffer.from((result.getResultMetadata().get(2) as [Uint8Array])[0]));
        }
    };

    private requestMediaPermissions = async (): Promise<void> => {
        try {
            await navigator.mediaDevices.getUserMedia({ video: true });
            this.setState({ mediaPermissionError: false });
        } catch (err) {
            this.setState({ mediaPermissionError: true });
        }
    };

    public render(): React.ReactNode {
        logger.info("LoginWithQR render");
        return (
            <LoginWithQRFlow
                onClick={this.onClick}
                phase={this.state.phase}
                code={this.state.phase === Phase.ShowingQR ? this.state.rendezvous?.code : undefined}
                failureReason={this.state.phase === Phase.Error ? this.state.failureReason : undefined}
                onScannedQRCode={this.onScannedQRCode}
                userCode={this.state.userCode}
            />
        );
    }
}
