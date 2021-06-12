/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017, 2018 Vector Creations Ltd
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
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

import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { MatrixClient } from 'matrix-js-sdk/src/client';
import { RoomMember } from 'matrix-js-sdk/src/models/room-member';
import { User } from 'matrix-js-sdk/src/models/user';
import { Room } from 'matrix-js-sdk/src/models/room';
import { EventTimeline } from 'matrix-js-sdk/src/models/event-timeline';
import { MatrixEvent } from 'matrix-js-sdk/src/models/event';
import { VerificationRequest } from "matrix-js-sdk/src/crypto/verification/request/VerificationRequest";

import dis from '../../../dispatcher/dispatcher';
import Modal from '../../../Modal';
import { _t } from '../../../languageHandler';
import createRoom, { findDMForUser, privateShouldBeEncrypted } from '../../../createRoom';
import DMRoomMap from '../../../utils/DMRoomMap';
import AccessibleButton from '../elements/AccessibleButton';
import SdkConfig from '../../../SdkConfig';
import SettingsStore from "../../../settings/SettingsStore";
import RoomViewStore from "../../../stores/RoomViewStore";
import MultiInviter from "../../../utils/MultiInviter";
import GroupStore from "../../../stores/GroupStore";
import {MatrixClientPeg} from "../../../MatrixClientPeg";
import E2EIcon from "../rooms/E2EIcon";
import { useEventEmitter } from "../../../hooks/useEventEmitter";
import { textualPowerLevel } from '../../../Roles';
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { RightPanelPhases } from "../../../stores/RightPanelStorePhases";
import EncryptionPanel from "./EncryptionPanel";
import { useAsyncMemo } from '../../../hooks/useAsyncMemo';
import { legacyVerifyUser, verifyDevice, verifyUser } from '../../../verification';
import { Action } from "../../../dispatcher/actions";
import { USER_SECURITY_TAB } from "../dialogs/UserSettingsDialog";
import { useIsEncrypted } from "../../../hooks/useIsEncrypted";
import BaseCard from "./BaseCard";
import { E2EStatus } from "../../../utils/ShieldUtils";
import ImageView from "../elements/ImageView";
import Spinner from "../elements/Spinner";
import PowerSelector from "../elements/PowerSelector";
import MemberAvatar from "../avatars/MemberAvatar";
import PresenceLabel from "../rooms/PresenceLabel";
import ShareDialog from "../dialogs/ShareDialog";
import ErrorDialog from "../dialogs/ErrorDialog";
import QuestionDialog from "../dialogs/QuestionDialog";
import ConfirmUserActionDialog from "../dialogs/ConfirmUserActionDialog";
import InfoDialog from "../dialogs/InfoDialog";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { SetRightPanelPhasePayload } from "../../../dispatcher/payloads/SetRightPanelPhasePayload";
import RoomAvatar from "../avatars/RoomAvatar";
import RoomName from "../elements/RoomName";
import { mediaFromMxc } from "../../../customisations/Media";
import UIStore from "../../../stores/UIStore";

export interface IDevice {
    deviceId: string;
    ambiguous?: boolean;
    getDisplayName(): string;
}

const disambiguateDevices = (devices: IDevice[]) => {
    const names = Object.create(null);
    for (let i = 0; i < devices.length; i++) {
        const name = devices[i].getDisplayName();
        const indexList = names[name] || [];
        indexList.push(i);
        names[name] = indexList;
    }
    for (const name in names) {
        if (names[name].length > 1) {
            names[name].forEach((j)=>{
                devices[j].ambiguous = true;
            });
        }
    }
};

export const getE2EStatus = (cli: MatrixClient, userId: string, devices: IDevice[]): E2EStatus => {
    const isMe = userId === cli.getUserId();
    const userTrust = cli.checkUserTrust(userId);
    if (!userTrust.isCrossSigningVerified()) {
        return userTrust.wasCrossSigningVerified() ? E2EStatus.Warning : E2EStatus.Normal;
    }

    const anyDeviceUnverified = devices.some(device => {
        const { deviceId } = device;
        // For your own devices, we use the stricter check of cross-signing
        // verification to encourage everyone to trust their own devices via
        // cross-signing so that other users can then safely trust you.
        // For other people's devices, the more general verified check that
        // includes locally verified devices can be used.
        const deviceTrust = cli.checkDeviceTrust(userId, deviceId);
        return isMe ? !deviceTrust.isCrossSigningVerified() : !deviceTrust.isVerified();
    });
    return anyDeviceUnverified ? E2EStatus.Warning : E2EStatus.Verified;
};

async function openDMForUser(matrixClient: MatrixClient, userId: string) {
    const lastActiveRoom = findDMForUser(matrixClient, userId);

    if (lastActiveRoom) {
        dis.dispatch({
            action: 'view_room',
            room_id: lastActiveRoom.roomId,
        });
        return;
    }

    const createRoomOptions = {
        dmUserId: userId,
        encryption: undefined,
    };

    if (privateShouldBeEncrypted()) {
        // Check whether all users have uploaded device keys before.
        // If so, enable encryption in the new room.
        const usersToDevicesMap = await matrixClient.downloadKeys([userId]);
        const allHaveDeviceKeys = Object.values(usersToDevicesMap).every(devices => {
            // `devices` is an object of the form { deviceId: deviceInfo, ... }.
            return Object.keys(devices).length > 0;
        });
        if (allHaveDeviceKeys) {
            createRoomOptions.encryption = true;
        }
    }

    return createRoom(createRoomOptions);
}

type SetUpdating = (updating: boolean) => void;

function useHasCrossSigningKeys(cli: MatrixClient, member: RoomMember, canVerify: boolean, setUpdating: SetUpdating) {
    return useAsyncMemo(async () => {
        if (!canVerify) {
            return undefined;
        }
        setUpdating(true);
        try {
            await cli.downloadKeys([member.userId]);
            const xsi = cli.getStoredCrossSigningForUser(member.userId);
            const key = xsi && xsi.getId();
            return !!key;
        } finally {
            setUpdating(false);
        }
    }, [cli, member, canVerify], undefined);
}

function DeviceItem({userId, device}: {userId: string, device: IDevice}) {
    const cli = useContext(MatrixClientContext);
    const isMe = userId === cli.getUserId();
    const deviceTrust = cli.checkDeviceTrust(userId, device.deviceId);
    const userTrust = cli.checkUserTrust(userId);
    // For your own devices, we use the stricter check of cross-signing
    // verification to encourage everyone to trust their own devices via
    // cross-signing so that other users can then safely trust you.
    // For other people's devices, the more general verified check that
    // includes locally verified devices can be used.
    const isVerified = isMe ? deviceTrust.isCrossSigningVerified() : deviceTrust.isVerified();

    const classes = classNames("mx_UserInfo_device", {
        mx_UserInfo_device_verified: isVerified,
        mx_UserInfo_device_unverified: !isVerified,
    });
    const iconClasses = classNames("mx_E2EIcon", {
        mx_E2EIcon_normal: !userTrust.isVerified(),
        mx_E2EIcon_verified: isVerified,
        mx_E2EIcon_warning: userTrust.isVerified() && !isVerified,
    });

    const onDeviceClick = () => {
        verifyDevice(cli.getUser(userId), device);
    };

    let deviceName;
    if (!device.getDisplayName()?.trim()) {
        deviceName = device.deviceId;
    } else {
        deviceName = device.ambiguous ?
            device.getDisplayName() + " (" + device.deviceId + ")" :
            device.getDisplayName();
    }

    let trustedLabel = null;
    if (userTrust.isVerified()) trustedLabel = isVerified ? _t("Trusted") : _t("Not trusted");


    if (isVerified) {
        return (
            <div className={classes} title={device.deviceId} >
                <div className={iconClasses} />
                <div className="mx_UserInfo_device_name">{deviceName}</div>
                <div className="mx_UserInfo_device_trusted">{trustedLabel}</div>
            </div>
        );
    } else {
        return (
            <AccessibleButton
                className={classes}
                title={device.deviceId}
                onClick={onDeviceClick}
            >
                <div className={iconClasses} />
                <div className="mx_UserInfo_device_name">{deviceName}</div>
                <div className="mx_UserInfo_device_trusted">{trustedLabel}</div>
            </AccessibleButton>
        );
    }
}

function DevicesSection({devices, userId, loading}: {devices: IDevice[], userId: string, loading: boolean}) {
    const cli = useContext(MatrixClientContext);
    const userTrust = cli.checkUserTrust(userId);

    const [isExpanded, setExpanded] = useState(false);

    if (loading) {
        // still loading
        return <Spinner />;
    }
    if (devices === null) {
        return <>{_t("Unable to load session list")}</>;
    }
    const isMe = userId === cli.getUserId();
    const deviceTrusts = devices.map(d => cli.checkDeviceTrust(userId, d.deviceId));

    let expandSectionDevices = [];
    const unverifiedDevices = [];

    let expandCountCaption;
    let expandHideCaption;
    let expandIconClasses = "mx_E2EIcon";

    if (userTrust.isVerified()) {
        for (let i = 0; i < devices.length; ++i) {
            const device = devices[i];
            const deviceTrust = deviceTrusts[i];
            // For your own devices, we use the stricter check of cross-signing
            // verification to encourage everyone to trust their own devices via
            // cross-signing so that other users can then safely trust you.
            // For other people's devices, the more general verified check that
            // includes locally verified devices can be used.
            const isVerified = isMe ? deviceTrust.isCrossSigningVerified() : deviceTrust.isVerified();

            if (isVerified) {
                expandSectionDevices.push(device);
            } else {
                unverifiedDevices.push(device);
            }
        }
        expandCountCaption = _t("%(count)s verified sessions", {count: expandSectionDevices.length});
        expandHideCaption = _t("Hide verified sessions");
        expandIconClasses += " mx_E2EIcon_verified";
    } else {
        expandSectionDevices = devices;
        expandCountCaption = _t("%(count)s sessions", {count: devices.length});
        expandHideCaption = _t("Hide sessions");
        expandIconClasses += " mx_E2EIcon_normal";
    }

    let expandButton;
    if (expandSectionDevices.length) {
        if (isExpanded) {
            expandButton = (<AccessibleButton className="mx_UserInfo_expand mx_linkButton"
                onClick={() => setExpanded(false)}
            >
                <div>{expandHideCaption}</div>
            </AccessibleButton>);
        } else {
            expandButton = (<AccessibleButton className="mx_UserInfo_expand mx_linkButton"
                onClick={() => setExpanded(true)}
            >
                <div className={expandIconClasses} />
                <div>{expandCountCaption}</div>
            </AccessibleButton>);
        }
    }

    let deviceList = unverifiedDevices.map((device, i) => {
        return (<DeviceItem key={i} userId={userId} device={device} />);
    });
    if (isExpanded) {
        const keyStart = unverifiedDevices.length;
        deviceList = deviceList.concat(expandSectionDevices.map((device, i) => {
            return (<DeviceItem key={i + keyStart} userId={userId} device={device} />);
        }));
    }

    return (
        <div className="mx_UserInfo_devices">
            <div>{deviceList}</div>
            <div>{expandButton}</div>
        </div>
    );
}

const UserOptionsSection: React.FC<{
    member: RoomMember;
    isIgnored: boolean;
    canInvite: boolean;
    isSpace?: boolean;
}> = ({member, isIgnored, canInvite, isSpace}) => {
    const cli = useContext(MatrixClientContext);

    let ignoreButton = null;
    let insertPillButton = null;
    let inviteUserButton = null;
    let readReceiptButton = null;

    const isMe = member.userId === cli.getUserId();

    const onShareUserClick = () => {
        Modal.createTrackedDialog('share room member dialog', '', ShareDialog, {
            target: member,
        });
    };

    // Only allow the user to ignore the user if its not ourselves
    // same goes for jumping to read receipt
    if (!isMe) {
        const onIgnoreToggle = () => {
            const ignoredUsers = cli.getIgnoredUsers();
            if (isIgnored) {
                const index = ignoredUsers.indexOf(member.userId);
                if (index !== -1) ignoredUsers.splice(index, 1);
            } else {
                ignoredUsers.push(member.userId);
            }

            cli.setIgnoredUsers(ignoredUsers);
        };

        ignoreButton = (
            <AccessibleButton
                onClick={onIgnoreToggle}
                className={classNames("mx_UserInfo_field", {mx_UserInfo_destructive: !isIgnored})}
            >
                { isIgnored ? _t("Unignore") : _t("Ignore") }
            </AccessibleButton>
        );

        if (member.roomId && !isSpace) {
            const onReadReceiptButton = function() {
                const room = cli.getRoom(member.roomId);
                dis.dispatch({
                    action: 'view_room',
                    highlighted: true,
                    event_id: room.getEventReadUpTo(member.userId),
                    room_id: member.roomId,
                });
            };

            const onInsertPillButton = function() {
                dis.dispatch({
                    action: 'insert_mention',
                    user_id: member.userId,
                });
            };

            const room = cli.getRoom(member.roomId);
            if (room?.getEventReadUpTo(member.userId)) {
                readReceiptButton = (
                    <AccessibleButton onClick={onReadReceiptButton} className="mx_UserInfo_field">
                        { _t('Jump to read receipt') }
                    </AccessibleButton>
                );
            }

            insertPillButton = (
                <AccessibleButton onClick={onInsertPillButton} className={"mx_UserInfo_field"}>
                    { _t('Mention') }
                </AccessibleButton>
            );
        }

        if (canInvite && (!member || !member.membership || member.membership === 'leave')) {
            const roomId = member && member.roomId ? member.roomId : RoomViewStore.getRoomId();
            const onInviteUserButton = async () => {
                try {
                    // We use a MultiInviter to re-use the invite logic, even though
                    // we're only inviting one user.
                    const inviter = new MultiInviter(roomId);
                    await inviter.invite([member.userId]).then(() => {
                        if (inviter.getCompletionState(member.userId) !== "invited") {
                            throw new Error(inviter.getErrorText(member.userId));
                        }
                    });
                } catch (err) {
                    Modal.createTrackedDialog('Failed to invite', '', ErrorDialog, {
                        title: _t('Failed to invite'),
                        description: ((err && err.message) ? err.message : _t("Operation failed")),
                    });
                }
            };

            inviteUserButton = (
                <AccessibleButton onClick={onInviteUserButton} className="mx_UserInfo_field">
                    { _t('Invite') }
                </AccessibleButton>
            );
        }
    }

    const shareUserButton = (
        <AccessibleButton onClick={onShareUserClick} className="mx_UserInfo_field">
            { _t('Share Link to User') }
        </AccessibleButton>
    );

    let directMessageButton;
    if (!isMe) {
        directMessageButton = (
            <AccessibleButton onClick={() => openDMForUser(cli, member.userId)} className="mx_UserInfo_field">
                { _t('Direct message') }
            </AccessibleButton>
        );
    }

    return (
        <div className="mx_UserInfo_container">
            <h3>{ _t("Options") }</h3>
            <div>
                { directMessageButton }
                { readReceiptButton }
                { shareUserButton }
                { insertPillButton }
                { inviteUserButton }
                { ignoreButton }
            </div>
        </div>
    );
};

const warnSelfDemote = async (isSpace: boolean) => {
    const {finished} = Modal.createTrackedDialog('Demoting Self', '', QuestionDialog, {
        title: _t("Demote yourself?"),
        description:
            <div>
                { isSpace
                    ? _t("You will not be able to undo this change as you are demoting yourself, " +
                        "if you are the last privileged user in the space it will be impossible " +
                        "to regain privileges.")
                    : _t("You will not be able to undo this change as you are demoting yourself, " +
                        "if you are the last privileged user in the room it will be impossible " +
                        "to regain privileges.") }
            </div>,
        button: _t("Demote"),
    });

    const [confirmed] = await finished;
    return confirmed;
};

const GenericAdminToolsContainer: React.FC<{}> = ({children}) => {
    return (
        <div className="mx_UserInfo_container">
            <h3>{ _t("Admin Tools") }</h3>
            <div className="mx_UserInfo_buttons">
                { children }
            </div>
        </div>
    );
};

interface IPowerLevelsContent {
    events?: Record<string, number>;
    // eslint-disable-next-line camelcase
    users_default?: number;
    // eslint-disable-next-line camelcase
    events_default?: number;
    // eslint-disable-next-line camelcase
    state_default?: number;
    ban?: number;
    kick?: number;
    redact?: number;
}

const isMuted = (member: RoomMember, powerLevelContent: IPowerLevelsContent) => {
    if (!powerLevelContent || !member) return false;

    const levelToSend = (
        (powerLevelContent.events ? powerLevelContent.events["m.room.message"] : null) ||
        powerLevelContent.events_default
    );
    return member.powerLevel < levelToSend;
};

export const useRoomPowerLevels = (cli: MatrixClient, room: Room) => {
    const [powerLevels, setPowerLevels] = useState<IPowerLevelsContent>({});

    const update = useCallback((ev?: MatrixEvent) => {
        if (!room) return;
        if (ev && ev.getType() !== EventType.RoomPowerLevels) return;

        const event = room.currentState.getStateEvents(EventType.RoomPowerLevels, "");
        if (event) {
            setPowerLevels(event.getContent());
        } else {
            setPowerLevels({});
        }
    }, [room]);

    useEventEmitter(cli, "RoomState.events", update);
    useEffect(() => {
        update();
        return () => {
            setPowerLevels({});
        };
    }, [update]);
    return powerLevels;
};

interface IBaseProps {
    member: RoomMember;
    startUpdating(): void;
    stopUpdating(): void;
}

const RoomKickButton: React.FC<IBaseProps> = ({member, startUpdating, stopUpdating}) => {
    const cli = useContext(MatrixClientContext);

    // check if user can be kicked/disinvited
    if (member.membership !== "invite" && member.membership !== "join") return null;

    const onKick = async () => {
        const {finished} = Modal.createTrackedDialog(
            'Confirm User Action Dialog',
            'onKick',
            ConfirmUserActionDialog,
            {
                member,
                action: member.membership === "invite" ? _t("Disinvite") : _t("Kick"),
                title: member.membership === "invite" ? _t("Disinvite this user?") : _t("Kick this user?"),
                askReason: member.membership === "join",
                danger: true,
            },
        );

        const [proceed, reason] = await finished;
        if (!proceed) return;

        startUpdating();
        cli.kick(member.roomId, member.userId, reason || undefined).then(() => {
            // NO-OP; rely on the m.room.member event coming down else we could
            // get out of sync if we force setState here!
            console.log("Kick success");
        }, function(err) {
            console.error("Kick error: " + err);
            Modal.createTrackedDialog('Failed to kick', '', ErrorDialog, {
                title: _t("Failed to kick"),
                description: ((err && err.message) ? err.message : "Operation failed"),
            });
        }).finally(() => {
            stopUpdating();
        });
    };

    const kickLabel = member.membership === "invite" ? _t("Disinvite") : _t("Kick");
    return <AccessibleButton className="mx_UserInfo_field mx_UserInfo_destructive" onClick={onKick}>
        { kickLabel }
    </AccessibleButton>;
};

const RedactMessagesButton: React.FC<IBaseProps> = ({member}) => {
    const cli = useContext(MatrixClientContext);

    const onRedactAllMessages = async () => {
        const {roomId, userId} = member;
        const room = cli.getRoom(roomId);
        if (!room) {
            return;
        }
        let timeline = room.getLiveTimeline();
        let eventsToRedact = [];
        while (timeline) {
            eventsToRedact = timeline.getEvents().reduce((events, event) => {
                if (event.getSender() === userId && !event.isRedacted() && !event.isRedaction() &&
                    event.getType() !== EventType.RoomCreate &&
                    // Don't redact ACLs because that'll obliterate the room
                    // See https://github.com/matrix-org/synapse/issues/4042 for details.
                    event.getType() !== EventType.RoomServerAcl
                ) {
                    return events.concat(event);
                } else {
                    return events;
                }
            }, eventsToRedact);
            timeline = timeline.getNeighbouringTimeline(EventTimeline.BACKWARDS);
        }

        const count = eventsToRedact.length;
        const user = member.name;

        if (count === 0) {
            Modal.createTrackedDialog('No user messages found to remove', '', InfoDialog, {
                title: _t("No recent messages by %(user)s found", {user}),
                description:
                    <div>
                        <p>{ _t("Try scrolling up in the timeline to see if there are any earlier ones.") }</p>
                    </div>,
            });
        } else {
            const {finished} = Modal.createTrackedDialog('Remove recent messages by user', '', QuestionDialog, {
                title: _t("Remove recent messages by %(user)s", {user}),
                description:
                    <div>
                        <p>{ _t("You are about to remove %(count)s messages by %(user)s. " +
                            "This cannot be undone. Do you wish to continue?", {count, user}) }</p>
                        <p>{ _t("For a large amount of messages, this might take some time. " +
                            "Please don't refresh your client in the meantime.") }</p>
                    </div>,
                button: _t("Remove %(count)s messages", {count}),
            });

            const [confirmed] = await finished;
            if (!confirmed) {
                return;
            }

            // Submitting a large number of redactions freezes the UI,
            // so first yield to allow to rerender after closing the dialog.
            await Promise.resolve();

            console.info(`Started redacting recent ${count} messages for ${user} in ${roomId}`);
            await Promise.all(eventsToRedact.map(async event => {
                try {
                    await cli.redactEvent(roomId, event.getId());
                } catch (err) {
                    // log and swallow errors
                    console.error("Could not redact", event.getId());
                    console.error(err);
                }
            }));
            console.info(`Finished redacting recent ${count} messages for ${user} in ${roomId}`);
        }
    };

    return <AccessibleButton className="mx_UserInfo_field mx_UserInfo_destructive" onClick={onRedactAllMessages}>
        { _t("Remove recent messages") }
    </AccessibleButton>;
};

const BanToggleButton: React.FC<IBaseProps> = ({member, startUpdating, stopUpdating}) => {
    const cli = useContext(MatrixClientContext);

    const onBanOrUnban = async () => {
        const {finished} = Modal.createTrackedDialog(
            'Confirm User Action Dialog',
            'onBanOrUnban',
            ConfirmUserActionDialog,
            {
                member,
                action: member.membership === 'ban' ? _t("Unban") : _t("Ban"),
                title: member.membership === 'ban' ? _t("Unban this user?") : _t("Ban this user?"),
                askReason: member.membership !== 'ban',
                danger: member.membership !== 'ban',
            },
        );

        const [proceed, reason] = await finished;
        if (!proceed) return;

        startUpdating();
        let promise;
        if (member.membership === 'ban') {
            promise = cli.unban(member.roomId, member.userId);
        } else {
            promise = cli.ban(member.roomId, member.userId, reason || undefined);
        }
        promise.then(() => {
            // NO-OP; rely on the m.room.member event coming down else we could
            // get out of sync if we force setState here!
            console.log("Ban success");
        }, function(err) {
            console.error("Ban error: " + err);
            Modal.createTrackedDialog('Failed to ban user', '', ErrorDialog, {
                title: _t("Error"),
                description: _t("Failed to ban user"),
            });
        }).finally(() => {
            stopUpdating();
        });
    };

    let label = _t("Ban");
    if (member.membership === 'ban') {
        label = _t("Unban");
    }

    const classes = classNames("mx_UserInfo_field", {
        mx_UserInfo_destructive: member.membership !== 'ban',
    });

    return <AccessibleButton className={classes} onClick={onBanOrUnban}>
        { label }
    </AccessibleButton>;
};

interface IBaseRoomProps extends IBaseProps {
    room: Room;
    powerLevels: IPowerLevelsContent;
}

const MuteToggleButton: React.FC<IBaseRoomProps> = ({member, room, powerLevels, startUpdating, stopUpdating}) => {
    const cli = useContext(MatrixClientContext);

    // Don't show the mute/unmute option if the user is not in the room
    if (member.membership !== "join") return null;

    const muted = isMuted(member, powerLevels);
    const onMuteToggle = async () => {
        const roomId = member.roomId;
        const target = member.userId;

        // if muting self, warn as it may be irreversible
        if (target === cli.getUserId()) {
            try {
                if (!(await warnSelfDemote(SettingsStore.getValue("feature_spaces") && room?.isSpaceRoom()))) return;
            } catch (e) {
                console.error("Failed to warn about self demotion: ", e);
                return;
            }
        }

        const powerLevelEvent = room.currentState.getStateEvents("m.room.power_levels", "");
        if (!powerLevelEvent) return;

        const powerLevels = powerLevelEvent.getContent();
        const levelToSend = (
            (powerLevels.events ? powerLevels.events["m.room.message"] : null) ||
            powerLevels.events_default
        );
        let level;
        if (muted) { // unmute
            level = levelToSend;
        } else { // mute
            level = levelToSend - 1;
        }
        level = parseInt(level);

        if (!isNaN(level)) {
            startUpdating();
            cli.setPowerLevel(roomId, target, level, powerLevelEvent).then(() => {
                // NO-OP; rely on the m.room.member event coming down else we could
                // get out of sync if we force setState here!
                console.log("Mute toggle success");
            }, function(err) {
                console.error("Mute error: " + err);
                Modal.createTrackedDialog('Failed to mute user', '', ErrorDialog, {
                    title: _t("Error"),
                    description: _t("Failed to mute user"),
                });
            }).finally(() => {
                stopUpdating();
            });
        }
    };

    const classes = classNames("mx_UserInfo_field", {
        mx_UserInfo_destructive: !muted,
    });

    const muteLabel = muted ? _t("Unmute") : _t("Mute");
    return <AccessibleButton className={classes} onClick={onMuteToggle}>
        { muteLabel }
    </AccessibleButton>;
};

const RoomAdminToolsContainer: React.FC<IBaseRoomProps> = ({
    room,
    children,
    member,
    startUpdating,
    stopUpdating,
    powerLevels,
}) => {
    const cli = useContext(MatrixClientContext);
    let kickButton;
    let banButton;
    let muteButton;
    let redactButton;

    const editPowerLevel = (
        (powerLevels.events ? powerLevels.events["m.room.power_levels"] : null) ||
        powerLevels.state_default
    );

    // if these do not exist in the event then they should default to 50 as per the spec
    const {
        ban: banPowerLevel = 50,
        kick: kickPowerLevel = 50,
        redact: redactPowerLevel = 50,
    } = powerLevels;

    const me = room.getMember(cli.getUserId());
    if (!me) {
        // we aren't in the room, so return no admin tooling
        return <div />;
    }

    const isMe = me.userId === member.userId;
    const canAffectUser = member.powerLevel < me.powerLevel || isMe;

    if (canAffectUser && me.powerLevel >= kickPowerLevel) {
        kickButton = <RoomKickButton member={member} startUpdating={startUpdating} stopUpdating={stopUpdating} />;
    }
    if (me.powerLevel >= redactPowerLevel && (!SettingsStore.getValue("feature_spaces") || !room.isSpaceRoom())) {
        redactButton = (
            <RedactMessagesButton member={member} startUpdating={startUpdating} stopUpdating={stopUpdating} />
        );
    }
    if (canAffectUser && me.powerLevel >= banPowerLevel) {
        banButton = <BanToggleButton member={member} startUpdating={startUpdating} stopUpdating={stopUpdating} />;
    }
    if (canAffectUser && me.powerLevel >= editPowerLevel) {
        muteButton = (
            <MuteToggleButton
                member={member}
                room={room}
                powerLevels={powerLevels}
                startUpdating={startUpdating}
                stopUpdating={stopUpdating}
            />
        );
    }

    if (kickButton || banButton || muteButton || redactButton || children) {
        return <GenericAdminToolsContainer>
            { muteButton }
            { kickButton }
            { banButton }
            { redactButton }
            { children }
        </GenericAdminToolsContainer>;
    }

    return <div />;
};

interface GroupMember {
    userId: string;
    displayname?: string; // XXX: GroupMember objects are inconsistent :((
    avatarUrl?: string;
}

const GroupAdminToolsSection: React.FC<{
    groupId: string;
    groupMember: GroupMember;
    startUpdating(): void;
    stopUpdating(): void;
}> = ({children, groupId, groupMember, startUpdating, stopUpdating}) => {
    const cli = useContext(MatrixClientContext);

    const [isPrivileged, setIsPrivileged] = useState(false);
    const [isInvited, setIsInvited] = useState(false);

    // Listen to group store changes
    useEffect(() => {
        let unmounted = false;

        const onGroupStoreUpdated = () => {
            if (unmounted) return;
            setIsPrivileged(GroupStore.isUserPrivileged(groupId));
            setIsInvited(GroupStore.getGroupInvitedMembers(groupId).some(
                (m) => m.userId === groupMember.userId,
            ));
        };

        GroupStore.registerListener(groupId, onGroupStoreUpdated);
        onGroupStoreUpdated();
        // Handle unmount
        return () => {
            unmounted = true;
            GroupStore.unregisterListener(onGroupStoreUpdated);
        };
    }, [groupId, groupMember.userId]);

    if (isPrivileged) {
        const onKick = async () => {
            const {finished} = Modal.createDialog(ConfirmUserActionDialog, {
                matrixClient: cli,
                groupMember,
                action: isInvited ? _t('Disinvite') : _t('Remove from community'),
                title: isInvited ? _t('Disinvite this user from community?')
                    : _t('Remove this user from community?'),
                danger: true,
            });

            const [proceed] = await finished;
            if (!proceed) return;

            startUpdating();
            cli.removeUserFromGroup(groupId, groupMember.userId).then(() => {
                // return to the user list
                dis.dispatch({
                    action: Action.ViewUser,
                    member: null,
                });
            }).catch((e) => {
                Modal.createTrackedDialog('Failed to remove user from group', '', ErrorDialog, {
                    title: _t('Error'),
                    description: isInvited ?
                        _t('Failed to withdraw invitation') :
                        _t('Failed to remove user from community'),
                });
                console.log(e);
            }).finally(() => {
                stopUpdating();
            });
        };

        const kickButton = (
            <AccessibleButton className="mx_UserInfo_field mx_UserInfo_destructive" onClick={onKick}>
                { isInvited ? _t('Disinvite') : _t('Remove from community') }
            </AccessibleButton>
        );

        // No make/revoke admin API yet
        /*const opLabel = this.state.isTargetMod ? _t("Revoke Moderator") : _t("Make Moderator");
        giveModButton = <AccessibleButton className="mx_UserInfo_field" onClick={this.onModToggle}>
            {giveOpLabel}
        </AccessibleButton>;*/

        return <GenericAdminToolsContainer>
            { kickButton }
            { children }
        </GenericAdminToolsContainer>;
    }

    return <div />;
};

const useIsSynapseAdmin = (cli: MatrixClient) => {
    const [isAdmin, setIsAdmin] = useState(false);
    useEffect(() => {
        cli.isSynapseAdministrator().then((isAdmin) => {
            setIsAdmin(isAdmin);
        }, () => {
            setIsAdmin(false);
        });
    }, [cli]);
    return isAdmin;
};

const useHomeserverSupportsCrossSigning = (cli: MatrixClient) => {
    return useAsyncMemo<boolean>(async () => {
        return cli.doesServerSupportUnstableFeature("org.matrix.e2e_cross_signing");
    }, [cli], false);
};

interface IRoomPermissions {
    modifyLevelMax: number;
    canEdit: boolean;
    canInvite: boolean;
}

function useRoomPermissions(cli: MatrixClient, room: Room, user: User): IRoomPermissions {
    const [roomPermissions, setRoomPermissions] = useState<IRoomPermissions>({
        // modifyLevelMax is the max PL we can set this user to, typically min(their PL, our PL) && canSetPL
        modifyLevelMax: -1,
        canEdit: false,
        canInvite: false,
    });
    const updateRoomPermissions = useCallback(() => {
        if (!room) {
            return;
        }

        const powerLevelEvent = room.currentState.getStateEvents("m.room.power_levels", "");
        if (!powerLevelEvent) return;
        const powerLevels = powerLevelEvent.getContent();
        if (!powerLevels) return;

        const me = room.getMember(cli.getUserId());
        if (!me) return;

        const them = user;
        const isMe = me.userId === them.userId;
        const canAffectUser = them.powerLevel < me.powerLevel || isMe;

        let modifyLevelMax = -1;
        if (canAffectUser) {
            const editPowerLevel = (
                (powerLevels.events ? powerLevels.events["m.room.power_levels"] : null) ||
                powerLevels.state_default
            );
            if (me.powerLevel >= editPowerLevel && (isMe || me.powerLevel > them.powerLevel)) {
                modifyLevelMax = me.powerLevel;
            }
        }

        setRoomPermissions({
            canInvite: me.powerLevel >= powerLevels.invite,
            canEdit: modifyLevelMax >= 0,
            modifyLevelMax,
        });
    }, [cli, user, room]);
    useEventEmitter(cli, "RoomState.members", updateRoomPermissions);
    useEffect(() => {
        updateRoomPermissions();
        return () => {
            setRoomPermissions({
                modifyLevelMax: -1,
                canEdit: false,
                canInvite: false,
            });
        };
    }, [updateRoomPermissions]);

    return roomPermissions;
}

const PowerLevelSection: React.FC<{
    user: User;
    room: Room;
    roomPermissions: IRoomPermissions;
    powerLevels: IPowerLevelsContent;
}> = ({user, room, roomPermissions, powerLevels}) => {
    if (roomPermissions.canEdit) {
        return (<PowerLevelEditor user={user} room={room} roomPermissions={roomPermissions} />);
    } else {
        const powerLevelUsersDefault = powerLevels.users_default || 0;
        const powerLevel = parseInt(user.powerLevel, 10);
        const role = textualPowerLevel(powerLevel, powerLevelUsersDefault);
        return (
            <div className="mx_UserInfo_profileField">
                <div className="mx_UserInfo_roleDescription">{role}</div>
            </div>
        );
    }
};

const PowerLevelEditor: React.FC<{
    user: User;
    room: Room;
    roomPermissions: IRoomPermissions;
}> = ({user, room, roomPermissions}) => {
    const cli = useContext(MatrixClientContext);

    const [selectedPowerLevel, setSelectedPowerLevel] = useState(parseInt(user.powerLevel, 10));
    const onPowerChange = useCallback(async (powerLevelStr: string) => {
        const powerLevel = parseInt(powerLevelStr, 10);
        setSelectedPowerLevel(powerLevel);

        const applyPowerChange = (roomId, target, powerLevel, powerLevelEvent) => {
            return cli.setPowerLevel(roomId, target, parseInt(powerLevel), powerLevelEvent).then(
                function() {
                    // NO-OP; rely on the m.room.member event coming down else we could
                    // get out of sync if we force setState here!
                    console.log("Power change success");
                }, function(err) {
                    console.error("Failed to change power level " + err);
                    Modal.createTrackedDialog('Failed to change power level', '', ErrorDialog, {
                        title: _t("Error"),
                        description: _t("Failed to change power level"),
                    });
                },
            );
        };

        const roomId = user.roomId;
        const target = user.userId;

        const powerLevelEvent = room.currentState.getStateEvents("m.room.power_levels", "");
        if (!powerLevelEvent) return;

        const myUserId = cli.getUserId();
        const myPower = powerLevelEvent.getContent().users[myUserId];
        if (myPower && parseInt(myPower) === powerLevel) {
            const {finished} = Modal.createTrackedDialog('Promote to PL100 Warning', '', QuestionDialog, {
                title: _t("Warning!"),
                description:
                    <div>
                        { _t("You will not be able to undo this change as you are promoting the user " +
                            "to have the same power level as yourself.") }<br />
                        { _t("Are you sure?") }
                    </div>,
                button: _t("Continue"),
            });

            const [confirmed] = await finished;
            if (!confirmed) return;
        } else if (myUserId === target) {
            // If we are changing our own PL it can only ever be decreasing, which we cannot reverse.
            try {
                if (!(await warnSelfDemote(SettingsStore.getValue("feature_spaces") && room?.isSpaceRoom()))) return;
            } catch (e) {
                console.error("Failed to warn about self demotion: ", e);
            }
        }

        await applyPowerChange(roomId, target, powerLevel, powerLevelEvent);
    }, [user.roomId, user.userId, cli, room]);

    const powerLevelEvent = room.currentState.getStateEvents("m.room.power_levels", "");
    const powerLevelUsersDefault = powerLevelEvent ? powerLevelEvent.getContent().users_default : 0;

    return (
        <div className="mx_UserInfo_profileField">
            <PowerSelector
                label={null}
                value={selectedPowerLevel}
                maxValue={roomPermissions.modifyLevelMax}
                usersDefault={powerLevelUsersDefault}
                onChange={onPowerChange}
            />
        </div>
    );
};

export const useDevices = (userId: string) => {
    const cli = useContext(MatrixClientContext);

    // undefined means yet to be loaded, null means failed to load, otherwise list of devices
    const [devices, setDevices] = useState(undefined);
    // Download device lists
    useEffect(() => {
        setDevices(undefined);

        let cancelled = false;

        async function downloadDeviceList() {
            try {
                await cli.downloadKeys([userId], true);
                const devices = cli.getStoredDevicesForUser(userId);

                if (cancelled) {
                    // we got cancelled - presumably a different user now
                    return;
                }

                disambiguateDevices(devices);
                setDevices(devices);
            } catch (err) {
                setDevices(null);
            }
        }
        downloadDeviceList();

        // Handle being unmounted
        return () => {
            cancelled = true;
        };
    }, [cli, userId]);

    // Listen to changes
    useEffect(() => {
        let cancel = false;
        const updateDevices = async () => {
            const newDevices = cli.getStoredDevicesForUser(userId);
            if (cancel) return;
            setDevices(newDevices);
        };
        const onDevicesUpdated = (users) => {
            if (!users.includes(userId)) return;
            updateDevices();
        };
        const onDeviceVerificationChanged = (_userId, device) => {
            if (_userId !== userId) return;
            updateDevices();
        };
        const onUserTrustStatusChanged = (_userId, trustStatus) => {
            if (_userId !== userId) return;
            updateDevices();
        };
        cli.on("crypto.devicesUpdated", onDevicesUpdated);
        cli.on("deviceVerificationChanged", onDeviceVerificationChanged);
        cli.on("userTrustStatusChanged", onUserTrustStatusChanged);
        // Handle being unmounted
        return () => {
            cancel = true;
            cli.removeListener("crypto.devicesUpdated", onDevicesUpdated);
            cli.removeListener("deviceVerificationChanged", onDeviceVerificationChanged);
            cli.removeListener("userTrustStatusChanged", onUserTrustStatusChanged);
        };
    }, [cli, userId]);

    return devices;
};

const BasicUserInfo: React.FC<{
    room: Room;
    member: User | RoomMember;
    groupId: string;
    devices: IDevice[];
    isRoomEncrypted: boolean;
}> = ({room, member, groupId, devices, isRoomEncrypted}) => {
    const cli = useContext(MatrixClientContext);

    const powerLevels = useRoomPowerLevels(cli, room);
    // Load whether or not we are a Synapse Admin
    const isSynapseAdmin = useIsSynapseAdmin(cli);

    // Check whether the user is ignored
    const [isIgnored, setIsIgnored] = useState(cli.isUserIgnored(member.userId));
    // Recheck if the user or client changes
    useEffect(() => {
        setIsIgnored(cli.isUserIgnored(member.userId));
    }, [cli, member.userId]);
    // Recheck also if we receive new accountData m.ignored_user_list
    const accountDataHandler = useCallback((ev) => {
        if (ev.getType() === "m.ignored_user_list") {
            setIsIgnored(cli.isUserIgnored(member.userId));
        }
    }, [cli, member.userId]);
    useEventEmitter(cli, "accountData", accountDataHandler);

    // Count of how many operations are currently in progress, if > 0 then show a Spinner
    const [pendingUpdateCount, setPendingUpdateCount] = useState(0);
    const startUpdating = useCallback(() => {
        setPendingUpdateCount(pendingUpdateCount + 1);
    }, [pendingUpdateCount]);
    const stopUpdating = useCallback(() => {
        setPendingUpdateCount(pendingUpdateCount - 1);
    }, [pendingUpdateCount]);

    const roomPermissions = useRoomPermissions(cli, room, member);

    const onSynapseDeactivate = useCallback(async () => {
        const {finished} = Modal.createTrackedDialog('Synapse User Deactivation', '', QuestionDialog, {
            title: _t("Deactivate user?"),
            description:
                <div>{ _t(
                    "Deactivating this user will log them out and prevent them from logging back in. Additionally, " +
                    "they will leave all the rooms they are in. This action cannot be reversed. Are you sure you " +
                    "want to deactivate this user?",
                ) }</div>,
            button: _t("Deactivate user"),
            danger: true,
        });

        const [accepted] = await finished;
        if (!accepted) return;
        try {
            await cli.deactivateSynapseUser(member.userId);
        } catch (err) {
            console.error("Failed to deactivate user");
            console.error(err);

            Modal.createTrackedDialog('Failed to deactivate Synapse user', '', ErrorDialog, {
                title: _t('Failed to deactivate user'),
                description: ((err && err.message) ? err.message : _t("Operation failed")),
            });
        }
    }, [cli, member.userId]);

    let synapseDeactivateButton;
    let spinner;

    // We don't need a perfect check here, just something to pass as "probably not our homeserver". If
    // someone does figure out how to bypass this check the worst that happens is an error.
    // FIXME this should be using cli instead of MatrixClientPeg.matrixClient
    if (isSynapseAdmin && member.userId.endsWith(`:${MatrixClientPeg.getHomeserverName()}`)) {
        synapseDeactivateButton = (
            <AccessibleButton onClick={onSynapseDeactivate} className="mx_UserInfo_field mx_UserInfo_destructive">
                {_t("Deactivate user")}
            </AccessibleButton>
        );
    }

    let adminToolsContainer;
    if (room && member.roomId) {
        adminToolsContainer = (
            <RoomAdminToolsContainer
                powerLevels={powerLevels}
                member={member}
                room={room}
                startUpdating={startUpdating}
                stopUpdating={stopUpdating}>
                { synapseDeactivateButton }
            </RoomAdminToolsContainer>
        );
    } else if (groupId) {
        adminToolsContainer = (
            <GroupAdminToolsSection
                groupId={groupId}
                groupMember={member}
                startUpdating={startUpdating}
                stopUpdating={stopUpdating}>
                { synapseDeactivateButton }
            </GroupAdminToolsSection>
        );
    } else if (synapseDeactivateButton) {
        adminToolsContainer = (
            <GenericAdminToolsContainer>
                { synapseDeactivateButton }
            </GenericAdminToolsContainer>
        );
    }

    if (pendingUpdateCount > 0) {
        spinner = <Spinner />;
    }

    let memberDetails;
    // hide the Roles section for DMs as it doesn't make sense there
    if (room && member.roomId && !DMRoomMap.shared().getUserIdForRoomId(member.roomId)) {
        memberDetails = <div className="mx_UserInfo_container">
            <h3>{ _t("Role") }</h3>
            <PowerLevelSection
                powerLevels={powerLevels}
                user={member}
                room={room}
                roomPermissions={roomPermissions}
            />
        </div>;
    }

    // only display the devices list if our client supports E2E
    const cryptoEnabled = cli.isCryptoEnabled();

    let text;
    if (!isRoomEncrypted) {
        if (!cryptoEnabled) {
            text = _t("This client does not support end-to-end encryption.");
        } else if (room && (!SettingsStore.getValue("feature_spaces") || !room.isSpaceRoom())) {
            text = _t("Messages in this room are not end-to-end encrypted.");
        }
    } else if (!SettingsStore.getValue("feature_spaces") || !room.isSpaceRoom()) {
        text = _t("Messages in this room are end-to-end encrypted.");
    }

    let verifyButton;
    const homeserverSupportsCrossSigning = useHomeserverSupportsCrossSigning(cli);

    const userTrust = cryptoEnabled && cli.checkUserTrust(member.userId);
    const userVerified = cryptoEnabled && userTrust.isCrossSigningVerified();
    const isMe = member.userId === cli.getUserId();
    const canVerify = cryptoEnabled && homeserverSupportsCrossSigning && !userVerified && !isMe &&
        devices && devices.length > 0;

    const setUpdating = (updating) => {
        setPendingUpdateCount(count => count + (updating ? 1 : -1));
    };
    const hasCrossSigningKeys =
        useHasCrossSigningKeys(cli, member, canVerify, setUpdating );

    const showDeviceListSpinner = devices === undefined;
    if (canVerify) {
        if (hasCrossSigningKeys !== undefined) {
            // Note: mx_UserInfo_verifyButton is for the end-to-end tests
            verifyButton = (
                <AccessibleButton className="mx_UserInfo_field mx_UserInfo_verifyButton" onClick={() => {
                    if (hasCrossSigningKeys) {
                        verifyUser(member);
                    } else {
                        legacyVerifyUser(member);
                    }
                }}>
                    {_t("Verify")}
                </AccessibleButton>
            );
        } else if (!showDeviceListSpinner) {
            // HACK: only show a spinner if the device section spinner is not shown,
            // to avoid showing a double spinner
            // We should ask for a design that includes all the different loading states here
            verifyButton = <Spinner />;
        }
    }

    let editDevices;
    if (member.userId == cli.getUserId()) {
        editDevices = (<p>
            <AccessibleButton className="mx_UserInfo_field" onClick={() => {
                dis.dispatch({
                    action: Action.ViewUserSettings,
                    initialTabId: USER_SECURITY_TAB,
                });
            }}>
                { _t("Edit devices") }
            </AccessibleButton>
        </p>)
    }

    const securitySection = (
        <div className="mx_UserInfo_container">
            <h3>{ _t("Security") }</h3>
            <p>{ text }</p>
            { verifyButton }
            { cryptoEnabled && <DevicesSection
                loading={showDeviceListSpinner}
                devices={devices}
                userId={member.userId} /> }
            { editDevices }
        </div>
    );

    return <React.Fragment>
        { memberDetails }

        { securitySection }
        <UserOptionsSection
            canInvite={roomPermissions.canInvite}
            isIgnored={isIgnored}
            member={member}
            isSpace={SettingsStore.getValue("feature_spaces") && room?.isSpaceRoom()}
        />

        { adminToolsContainer }

        { spinner }
    </React.Fragment>;
};

type Member = User | RoomMember | GroupMember;

const UserInfoHeader: React.FC<{
    member: Member;
    e2eStatus: E2EStatus;
}> = ({member, e2eStatus}) => {
    const cli = useContext(MatrixClientContext);

    const onMemberAvatarClick = useCallback(() => {
        const avatarUrl = member.getMxcAvatarUrl ? member.getMxcAvatarUrl() : member.avatarUrl;
        if (!avatarUrl) return;

        const httpUrl = mediaFromMxc(avatarUrl).srcHttp;
        const params = {
            src: httpUrl,
            name: member.name,
        };

        Modal.createDialog(ImageView, params, "mx_Dialog_lightbox", null, true);
    }, [member]);

    const avatarElement = (
        <div className="mx_UserInfo_avatar">
            <div>
                <div>
                    <MemberAvatar
                        key={member.userId} // to instantly blank the avatar when UserInfo changes members
                        member={member}
                        width={2 * 0.3 * UIStore.instance.windowHeight} // 2x@30vh
                        height={2 * 0.3 * UIStore.instance.windowHeight} // 2x@30vh
                        resizeMethod="scale"
                        fallbackUserId={member.userId}
                        onClick={onMemberAvatarClick}
                        urls={member.avatarUrl ? [member.avatarUrl] : undefined} />
                </div>
            </div>
        </div>
    );

    let presenceState;
    let presenceLastActiveAgo;
    let presenceCurrentlyActive;
    let statusMessage;

    if (member instanceof RoomMember && member.user) {
        presenceState = member.user.presence;
        presenceLastActiveAgo = member.user.lastActiveAgo;
        presenceCurrentlyActive = member.user.currentlyActive;

        if (SettingsStore.getValue("feature_custom_status")) {
            statusMessage = member.user._unstable_statusMessage;
        }
    }

    const enablePresenceByHsUrl = SdkConfig.get()["enable_presence_by_hs_url"];
    let showPresence = true;
    if (enablePresenceByHsUrl && enablePresenceByHsUrl[cli.baseUrl] !== undefined) {
        showPresence = enablePresenceByHsUrl[cli.baseUrl];
    }

    let presenceLabel = null;
    if (showPresence) {
        presenceLabel = (
            <PresenceLabel
                activeAgo={presenceLastActiveAgo}
                currentlyActive={presenceCurrentlyActive}
                presenceState={presenceState}
            />
        );
    }

    let statusLabel = null;
    if (statusMessage) {
        statusLabel = <span className="mx_UserInfo_statusMessage">{ statusMessage }</span>;
    }

    let e2eIcon;
    if (e2eStatus) {
        e2eIcon = <E2EIcon size={18} status={e2eStatus} isUser={true} />;
    }

    const displayName = member.rawDisplayName || member.displayname;
    return <React.Fragment>
        { avatarElement }

        <div className="mx_UserInfo_container mx_UserInfo_separator">
            <div className="mx_UserInfo_profile">
                <div>
                    <h2>
                        { e2eIcon }
                        <span title={displayName} aria-label={displayName}>
                            { displayName }
                        </span>
                    </h2>
                </div>
                <div>{ member.userId }</div>
                <div className="mx_UserInfo_profileStatus">
                    {presenceLabel}
                    {statusLabel}
                </div>
            </div>
        </div>
    </React.Fragment>;
};

interface IProps {
    user: Member;
    groupId?: string;
    room?: Room;
    phase: RightPanelPhases.RoomMemberInfo
        | RightPanelPhases.GroupMemberInfo
        | RightPanelPhases.SpaceMemberInfo
        | RightPanelPhases.EncryptionPanel;
    onClose(): void;
    verificationRequest?: VerificationRequest;
    verificationRequestPromise?: Promise<VerificationRequest>;
}

const UserInfo: React.FC<IProps> = ({
    user,
    groupId,
    room,
    onClose,
    phase = RightPanelPhases.RoomMemberInfo,
    ...props
}) => {
    const cli = useContext(MatrixClientContext);

    // fetch latest room member if we have a room, so we don't show historical information, falling back to user
    const member = useMemo(() => room ? (room.getMember(user.userId) || user) : user, [room, user]);

    const isRoomEncrypted = useIsEncrypted(cli, room);
    const devices = useDevices(user.userId);

    let e2eStatus;
    if (isRoomEncrypted && devices) {
        e2eStatus = getE2EStatus(cli, user.userId, devices);
    }

    const classes = ["mx_UserInfo"];

    let refireParams;
    let previousPhase: RightPanelPhases;
    // We have no previousPhase for when viewing a UserInfo from a Group or without a Room at this time
    if (room && phase === RightPanelPhases.EncryptionPanel) {
        previousPhase = RightPanelPhases.RoomMemberInfo;
        refireParams = {member: member};
    } else if (room) {
        previousPhase = previousPhase = SettingsStore.getValue("feature_spaces") && room.isSpaceRoom()
            ? RightPanelPhases.SpaceMemberList
            : RightPanelPhases.RoomMemberList;
    }

    const onEncryptionPanelClose = () => {
        dis.dispatch<SetRightPanelPhasePayload>({
            action: Action.SetRightPanelPhase,
            phase: previousPhase,
            refireParams: refireParams,
        });
    }

    let content;
    switch (phase) {
        case RightPanelPhases.RoomMemberInfo:
        case RightPanelPhases.GroupMemberInfo:
        case RightPanelPhases.SpaceMemberInfo:
            content = (
                <BasicUserInfo
                    room={room}
                    member={member}
                    groupId={groupId as string}
                    devices={devices}
                    isRoomEncrypted={isRoomEncrypted} />
            );
            break;
        case RightPanelPhases.EncryptionPanel:
            classes.push("mx_UserInfo_smallAvatar");
            content = (
                <EncryptionPanel
                    {...props as React.ComponentProps<typeof EncryptionPanel>}
                    member={member}
                    onClose={onEncryptionPanelClose}
                    isRoomEncrypted={isRoomEncrypted}
                />
            );
            break;
    }

    let closeLabel = undefined;
    if (phase === RightPanelPhases.EncryptionPanel) {
        const verificationRequest = (props as React.ComponentProps<typeof EncryptionPanel>).verificationRequest;
        if (verificationRequest && verificationRequest.pending) {
            closeLabel = _t("Cancel");
        }
    }

    let scopeHeader;
    if (SettingsStore.getValue("feature_spaces") && room?.isSpaceRoom()) {
        scopeHeader = <div className="mx_RightPanel_scopeHeader">
            <RoomAvatar room={room} height={32} width={32} />
            <RoomName room={room} />
        </div>;
    }

    const header = <React.Fragment>
        { scopeHeader }
        <UserInfoHeader member={member} e2eStatus={e2eStatus} />
    </React.Fragment>;
    return <BaseCard
        className={classes.join(" ")}
        header={header}
        onClose={onClose}
        closeLabel={closeLabel}
        previousPhase={previousPhase}
        refireParams={refireParams}
    >
        { content }
    </BaseCard>;
};

export default UserInfo;
