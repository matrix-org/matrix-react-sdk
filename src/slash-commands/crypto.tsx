/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2018 New Vector Ltd
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
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

import { _t, _td, UserFriendlyError } from "../languageHandler";
import { isCurrentLocalRoom, reject, success } from "./utils";
import { getDeviceCryptoInfo } from "../utils/crypto/deviceInfo";
import Modal from "../Modal";
import InfoDialog from "../components/views/dialogs/InfoDialog";
import { TimelineRenderingType } from "../contexts/RoomContext";
import SettingsStore from "../settings/SettingsStore";
import { Command } from "./command";
import { CommandCategories } from "./interface";

export const verify = new Command({
    command: "verify",
    args: "<user-id> <device-id> <device-signing-key>",
    description: _td("Verifies a user, session, and pubkey tuple"),
    runFn: function (cli, roomId, threadId, args) {
        if (args) {
            const matches = args.match(/^(\S+) +(\S+) +(\S+)$/);
            if (matches) {
                const userId = matches[1];
                const deviceId = matches[2];
                const fingerprint = matches[3];

                return success(
                    (async (): Promise<void> => {
                        const device = await getDeviceCryptoInfo(cli, userId, deviceId);
                        if (!device) {
                            throw new UserFriendlyError("Unknown (user, session) pair: (%(userId)s, %(deviceId)s)", {
                                userId,
                                deviceId,
                                cause: undefined,
                            });
                        }
                        const deviceTrust = await cli.getCrypto()?.getDeviceVerificationStatus(userId, deviceId);

                        if (deviceTrust?.isVerified()) {
                            if (device.getFingerprint() === fingerprint) {
                                throw new UserFriendlyError("Session already verified!");
                            } else {
                                throw new UserFriendlyError(
                                    "WARNING: session already verified, but keys do NOT MATCH!",
                                );
                            }
                        }

                        if (device.getFingerprint() !== fingerprint) {
                            const fprint = device.getFingerprint();
                            throw new UserFriendlyError(
                                "WARNING: KEY VERIFICATION FAILED! The signing key for %(userId)s and session" +
                                    ' %(deviceId)s is "%(fprint)s" which does not match the provided key ' +
                                    '"%(fingerprint)s". This could mean your communications are being intercepted!',
                                {
                                    fprint,
                                    userId,
                                    deviceId,
                                    fingerprint,
                                    cause: undefined,
                                },
                            );
                        }

                        await cli.setDeviceVerified(userId, deviceId, true);

                        // Tell the user we verified everything
                        Modal.createDialog(InfoDialog, {
                            title: _t("Verified key"),
                            description: (
                                <div>
                                    <p>
                                        {_t(
                                            "The signing key you provided matches the signing key you received " +
                                                "from %(userId)s's session %(deviceId)s. Session marked as verified.",
                                            { userId, deviceId },
                                        )}
                                    </p>
                                </div>
                            ),
                        });
                    })(),
                );
            }
        }
        return reject(this.getUsage());
    },
    category: CommandCategories.advanced,
    renderingTypes: [TimelineRenderingType.Room],
});

export const discardsession = new Command({
    command: "discardsession",
    description: _td("Forces the current outbound group session in an encrypted room to be discarded"),
    isEnabled: (cli) => !isCurrentLocalRoom(cli),
    runFn: function (cli, roomId) {
        try {
            cli.forceDiscardSession(roomId);
        } catch (e) {
            return reject(e instanceof Error ? e.message : e);
        }
        return success();
    },
    category: CommandCategories.advanced,
    renderingTypes: [TimelineRenderingType.Room],
});

export const remakeolm = new Command({
    command: "remakeolm",
    description: _td("Developer command: Discards the current outbound group session and sets up new Olm sessions"),
    isEnabled: (cli) => {
        return SettingsStore.getValue("developerMode") && !isCurrentLocalRoom(cli);
    },
    runFn: (cli, roomId) => {
        try {
            const room = cli.getRoom(roomId);

            cli.forceDiscardSession(roomId);

            return success(
                room?.getEncryptionTargetMembers().then((members) => {
                    // noinspection JSIgnoredPromiseFromCall
                    cli.crypto?.ensureOlmSessionsForUsers(
                        members.map((m) => m.userId),
                        true,
                    );
                }),
            );
        } catch (e) {
            return reject(e instanceof Error ? e.message : e);
        }
    },
    category: CommandCategories.advanced,
    renderingTypes: [TimelineRenderingType.Room],
});
