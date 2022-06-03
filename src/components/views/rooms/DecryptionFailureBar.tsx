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

import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Room } from 'matrix-js-sdk/src/models/room';

import Modal from '../../../Modal';
import { _t } from '../../../languageHandler';
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import AccessibleButton from '../elements/AccessibleButton';
import { OpenToTabPayload } from "../../../dispatcher/payloads/OpenToTabPayload";
import { UserTab } from "../dialogs/UserTab";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import SetupEncryptionDialog from '../dialogs/security/SetupEncryptionDialog';
import { SetupEncryptionStore } from '../../../stores/SetupEncryptionStore';

interface IProps {
    room: Room;
    failures: Set<string>;
}

export const DecryptionFailureBar: React.FC<IProps> = ({ failures, room }) => {
    const context = useContext(MatrixClientContext);

    const [needsVerification, setNeedsVerification] = useState<boolean>(false);
    const [hasOtherVerifiedDevices, setHasOtherVerifiedDevices] = useState<boolean>(false);
    const [hasKeyBackup, setHasKeyBackup] = useState<boolean>(false);

    const [requestedSessions, setRequestedSessions] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (needsVerification || !hasOtherVerifiedDevices) return;

        const newRequestedSessions = new Set<string>();
        for (const eventId of failures) {
            const event = room.findEventById(eventId);
            if (!event) continue;
            const sessionId = event.getWireContent().session_id;
            if (!sessionId || requestedSessions.has(sessionId) || newRequestedSessions.has(sessionId)) continue;
            newRequestedSessions.add(sessionId);
            context.cancelAndResendEventRoomKeyRequest(event);
        }
        if (newRequestedSessions.size > 0) {
            setRequestedSessions(oldRequestedSessions => {
                const requestedSessions = new Set(oldRequestedSessions);
                for (const session of newRequestedSessions) {
                    requestedSessions.add(session);
                }
                return requestedSessions;
            });
        }
    }, [needsVerification, hasOtherVerifiedDevices, failures, room, requestedSessions, context]);

    const updateDeviceInfo = useCallback(async () => {
        const deviceId = context.getDeviceId();
        let verified = true; // if we can't get a clear answer, don't bug the user about verifying
        try {
            verified = context.checkIfOwnDeviceCrossSigned(deviceId);
        } catch (e) {
            console.error("Error getting device cross-signing info", e);
        }
        setNeedsVerification(!verified);

        let otherVerifiedDevices = false;
        try {
            const { devices } = await context.getDevices();
            otherVerifiedDevices = devices.some(
                (device) => context.checkIfOwnDeviceCrossSigned(device.device_id),
            );
        } catch (e) {
            console.error("Error getting info about other devices", e);
        }
        setHasOtherVerifiedDevices(otherVerifiedDevices);

        let keyBackup = false;
        try {
            const keys = await context.isSecretStored('m.cross_signing.master');
            keyBackup = (keys !== null && Object.keys(keys).length > 0);
        } catch (e) {
            console.error("Error getting info about key backups", e);
        }
        setHasKeyBackup(keyBackup);
    }, [context]);

    useEffect(() => {
        updateDeviceInfo().catch(console.error);
    }, [updateDeviceInfo]);

    const onVerifyClick = (): void => {
        Modal.createTrackedDialog("Verify session", "Verify session", SetupEncryptionDialog, {
            onFinished: updateDeviceInfo,
        });
    };

    const onDeviceListClick = (): void => {
        const payload: OpenToTabPayload = { action: Action.ViewUserSettings, initialTabId: UserTab.Security };
        defaultDispatcher.dispatch(payload);
    }

    let headline: JSX.Element;
    let body: JSX.Element;
    let button: JSX.Element;
    if (needsVerification) {
        if (hasOtherVerifiedDevices || hasKeyBackup) {
            headline = <React.Fragment>
                { _t("Verify this device to access all messages") }
            </React.Fragment>;
            body = <React.Fragment>
                { _t("This device was unable to decrypt some messages because it has not been verified yet.") }
            </React.Fragment>
            button = <AccessibleButton kind="primary" onClick={onVerifyClick}>
                { _t("Verify") }
            </AccessibleButton>;
        } else {
            headline = <React.Fragment>
                { _t("Reset your keys to prevent future decryption errors") }
            </React.Fragment>;
            body = <React.Fragment>
                { _t("You will not be able to access old undecryptable messages, but resetting your keys will allow you to receive new messages. You may need to re-verify your identity with your contacts.") }
            </React.Fragment>;
            const store = SetupEncryptionStore.sharedInstance();
            button = <AccessibleButton kind="primary" onClick={store.resetConfirm}>
                { _t("Reset") }
            </AccessibleButton>;
        }
    } else if (!needsVerification && hasOtherVerifiedDevices) {
        headline = <React.Fragment>
            { _t("Open another device to load encrypted messages") }
        </React.Fragment>;
        body = <React.Fragment>
            { _t("This device is requesting keys from your other devices to access messages it was unable to decrypt. Opening one of your other devices may help this device retrieve keys more quickly.") }
        </React.Fragment>;
        button = <AccessibleButton kind="primary_outline" onClick={onDeviceListClick}>
            { _t("View your device list") }
        </AccessibleButton>;
    } else {
        headline = <React.Fragment>
            { _t("Requesting keys to decrypt messages...") }
        </React.Fragment>;
        body = <React.Fragment>
            { _t("Some messages could not be decrypted. This device is requesting keys from the messages' senders.") }
        </React.Fragment>;
    }

    return (
        <div className="mx_DecryptionFailureBar">
            <div className="mx_DecryptionFailureBar_icon" />
            <div className="mx_DecryptionFailureBar_message">
                <div className="mx_DecryptionFailureBar_message_headline">
                    { headline }
                </div>
                <div className="mx_DecryptionFailureBar_message_body">
                    { body }
                </div>
            </div>
            <div className="mx_DecryptionFailureBar_button">
                { button }
            </div>
        </div>
    );
};
