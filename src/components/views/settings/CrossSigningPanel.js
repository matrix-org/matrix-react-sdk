/*
Copyright 2019, 2020 The Matrix.org Foundation C.I.C.

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

import React from 'react';

import {MatrixClientPeg} from '../../../MatrixClientPeg';
import { _t } from '../../../languageHandler';
import * as sdk from '../../../index';
import Modal from '../../../Modal';
import Spinner from '../elements/Spinner';
import InteractiveAuthDialog from '../dialogs/InteractiveAuthDialog';
import ConfirmDestroyCrossSigningDialog from '../dialogs/security/ConfirmDestroyCrossSigningDialog';
import {replaceableComponent} from "../../../utils/replaceableComponent";

@replaceableComponent("views.settings.CrossSigningPanel")
export default class CrossSigningPanel extends React.PureComponent {
    constructor(props) {
        super(props);

        this._unmounted = false;

        this.state = {
            error: null,
            crossSigningPublicKeysOnDevice: null,
            crossSigningPrivateKeysInStorage: null,
            masterPrivateKeyCached: null,
            selfSigningPrivateKeyCached: null,
            userSigningPrivateKeyCached: null,
            homeserverSupportsCrossSigning: null,
            crossSigningReady: null,
        };
    }

    componentDidMount() {
        const cli = MatrixClientPeg.get();
        cli.on("accountData", this.onAccountData);
        cli.on("userTrustStatusChanged", this.onStatusChanged);
        cli.on("crossSigning.keysChanged", this.onStatusChanged);
        this._getUpdatedStatus();
    }

    componentWillUnmount() {
        this._unmounted = true;
        const cli = MatrixClientPeg.get();
        if (!cli) return;
        cli.removeListener("accountData", this.onAccountData);
        cli.removeListener("userTrustStatusChanged", this.onStatusChanged);
        cli.removeListener("crossSigning.keysChanged", this.onStatusChanged);
    }

    onAccountData = (event) => {
        const type = event.getType();
        if (type.startsWith("m.cross_signing") || type.startsWith("m.secret_storage")) {
            this._getUpdatedStatus();
        }
    };

    _onBootstrapClick = () => {
        this._bootstrapCrossSigning({ forceReset: false });
    };

    onStatusChanged = () => {
        this._getUpdatedStatus();
    };

    async _getUpdatedStatus() {
        const cli = MatrixClientPeg.get();
        const pkCache = cli.getCrossSigningCacheCallbacks();
        const crossSigning = cli.crypto._crossSigningInfo;
        const secretStorage = cli.crypto._secretStorage;
        const crossSigningPublicKeysOnDevice = crossSigning.getId();
        const crossSigningPrivateKeysInStorage = await crossSigning.isStoredInSecretStorage(secretStorage);
        const masterPrivateKeyCached = !!(pkCache && await pkCache.getCrossSigningKeyCache("master"));
        const selfSigningPrivateKeyCached = !!(pkCache && await pkCache.getCrossSigningKeyCache("self_signing"));
        const userSigningPrivateKeyCached = !!(pkCache && await pkCache.getCrossSigningKeyCache("user_signing"));
        const homeserverSupportsCrossSigning =
            await cli.doesServerSupportUnstableFeature("org.matrix.e2e_cross_signing");
        const crossSigningReady = await cli.isCrossSigningReady();

        this.setState({
            crossSigningPublicKeysOnDevice,
            crossSigningPrivateKeysInStorage,
            masterPrivateKeyCached,
            selfSigningPrivateKeyCached,
            userSigningPrivateKeyCached,
            homeserverSupportsCrossSigning,
            crossSigningReady,
        });
    }

    /**
     * Bootstrapping cross-signing take one of these paths:
     * 1. Create cross-signing keys locally and store in secret storage (if it
     *    already exists on the account).
     * 2. Access existing secret storage by requesting passphrase and accessing
     *    cross-signing keys as needed.
     * 3. All keys are loaded and there's nothing to do.
     * @param {bool} [forceReset] Bootstrap again even if keys already present
     */
    _bootstrapCrossSigning = async ({ forceReset = false }) => {
        this.setState({ error: null });
        try {
            const cli = MatrixClientPeg.get();
            await cli.bootstrapCrossSigning({
                authUploadDeviceSigningKeys: async (makeRequest) => {
                    const { finished } = Modal.createTrackedDialog(
                        'Cross-signing keys dialog', '', InteractiveAuthDialog,
                        {
                            title: _t("Setting up keys"),
                            matrixClient: cli,
                            makeRequest,
                        },
                    );
                    const [confirmed] = await finished;
                    if (!confirmed) {
                        throw new Error("Cross-signing key upload auth canceled");
                    }
                },
                setupNewCrossSigning: forceReset,
            });
        } catch (e) {
            this.setState({ error: e });
            console.error("Error bootstrapping cross-signing", e);
        }
        if (this._unmounted) return;
        this._getUpdatedStatus();
    }

    _resetCrossSigning = () => {
        Modal.createDialog(ConfirmDestroyCrossSigningDialog, {
            onFinished: (act) => {
                if (!act) return;
                this._bootstrapCrossSigning({ forceReset: true });
            },
        });
    }

    render() {
        const AccessibleButton = sdk.getComponent("elements.AccessibleButton");
        const {
            error,
            crossSigningPublicKeysOnDevice,
            crossSigningPrivateKeysInStorage,
            masterPrivateKeyCached,
            selfSigningPrivateKeyCached,
            userSigningPrivateKeyCached,
            homeserverSupportsCrossSigning,
            crossSigningReady,
        } = this.state;

        let errorSection;
        if (error) {
            errorSection = <div className="error">{error.toString()}</div>;
        }

        let summarisedStatus;
        if (homeserverSupportsCrossSigning === undefined) {
            summarisedStatus = <Spinner />;
        } else if (!homeserverSupportsCrossSigning) {
            summarisedStatus = <p>{_t(
                "Your homeserver does not support cross-signing.",
            )}</p>;
        } else if (crossSigningReady) {
            summarisedStatus = <p>✅ {_t(
                "Cross-signing is ready for use.",
            )}</p>;
        } else if (crossSigningPrivateKeysInStorage) {
            summarisedStatus = <p>{_t(
                "Your account has a cross-signing identity in secret storage, " +
                "but it is not yet trusted by this session.",
            )}</p>;
        } else {
            summarisedStatus = <p>{_t(
                "Cross-signing is not set up.",
            )}</p>;
        }

        const keysExistAnywhere = (
            crossSigningPublicKeysOnDevice ||
            crossSigningPrivateKeysInStorage ||
            masterPrivateKeyCached ||
            selfSigningPrivateKeyCached ||
            userSigningPrivateKeyCached
        );
        const keysExistEverywhere = (
            crossSigningPublicKeysOnDevice &&
            crossSigningPrivateKeysInStorage &&
            masterPrivateKeyCached &&
            selfSigningPrivateKeyCached &&
            userSigningPrivateKeyCached
        );

        const actions = [];

        // TODO: determine how better to expose this to users in addition to prompts at login/toast
        if (!keysExistEverywhere && homeserverSupportsCrossSigning) {
            actions.push(
                <AccessibleButton key="setup" kind="primary" onClick={this._onBootstrapClick}>
                    {_t("Set up")}
                </AccessibleButton>,
            );
        }

        if (keysExistAnywhere) {
            actions.push(
                <AccessibleButton key="reset" kind="danger" onClick={this._resetCrossSigning}>
                    {_t("Reset")}
                </AccessibleButton>,
            );
        }

        let actionRow;
        if (actions.length) {
            actionRow = <div className="mx_CrossSigningPanel_buttonRow">
                {actions}
            </div>;
        }

        return (
            <div>
                {summarisedStatus}
                <details>
                    <summary>{_t("Advanced")}</summary>
                    <table className="mx_CrossSigningPanel_statusList"><tbody>
                        <tr>
                            <td>{_t("Cross-signing public keys:")}</td>
                            <td>{crossSigningPublicKeysOnDevice ? _t("in memory") : _t("not found")}</td>
                        </tr>
                        <tr>
                            <td>{_t("Cross-signing private keys:")}</td>
                            <td>{crossSigningPrivateKeysInStorage ? _t("in secret storage") : _t("not found in storage")}</td>
                        </tr>
                        <tr>
                            <td>{_t("Master private key:")}</td>
                            <td>{masterPrivateKeyCached ? _t("cached locally") : _t("not found locally")}</td>
                        </tr>
                        <tr>
                            <td>{_t("Self signing private key:")}</td>
                            <td>{selfSigningPrivateKeyCached ? _t("cached locally") : _t("not found locally")}</td>
                        </tr>
                        <tr>
                            <td>{_t("User signing private key:")}</td>
                            <td>{userSigningPrivateKeyCached ? _t("cached locally") : _t("not found locally")}</td>
                        </tr>
                        <tr>
                            <td>{_t("Homeserver feature support:")}</td>
                            <td>{homeserverSupportsCrossSigning ? _t("exists") : _t("not found")}</td>
                        </tr>
                    </tbody></table>
                </details>
                {errorSection}
                {actionRow}
            </div>
        );
    }
}
