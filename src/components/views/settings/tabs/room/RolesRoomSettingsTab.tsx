/*
Copyright 2019-2021 The Matrix.org Foundation C.I.C.

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
import { EventType } from "matrix-js-sdk/src/@types/event";
import { RoomMember } from "matrix-js-sdk/src/models/room-member";
import { RoomState, RoomStateEvent } from "matrix-js-sdk/src/models/room-state";
import { logger } from "matrix-js-sdk/src/logger";
import { throttle } from "lodash";

import { _t, _td } from "../../../../../languageHandler";
import { MatrixClientPeg } from "../../../../../MatrixClientPeg";
import AccessibleButton from "../../../elements/AccessibleButton";
import Modal from "../../../../../Modal";
import { compare } from "../../../../../utils/strings";
import ErrorDialog from '../../../dialogs/ErrorDialog';
import PowerSelector from "../../../elements/PowerSelector";
import SettingsFieldset from '../../SettingsFieldset';
import SettingsStore from "../../../../../settings/SettingsStore";

interface IEventShowOpts {
    isState?: boolean;
    hideForSpace?: boolean;
    hideForRoom?: boolean;
}

interface IPowerLevelDescriptor {
    desc: string;
    defaultValue: number;
    hideForSpace?: boolean;
}

const plEventsToShow: Record<string, IEventShowOpts> = {
    // If an event is listed here, it will be shown in the PL settings. Defaults will be calculated.
    [EventType.RoomAvatar]: { isState: true },
    [EventType.RoomName]: { isState: true },
    [EventType.RoomCanonicalAlias]: { isState: true },
    [EventType.SpaceChild]: { isState: true, hideForRoom: true },
    [EventType.RoomHistoryVisibility]: { isState: true, hideForSpace: true },
    [EventType.RoomPowerLevels]: { isState: true },
    [EventType.RoomTopic]: { isState: true },
    [EventType.RoomTombstone]: { isState: true, hideForSpace: true },
    [EventType.RoomEncryption]: { isState: true, hideForSpace: true },
    [EventType.RoomServerAcl]: { isState: true, hideForSpace: true },
    [EventType.RoomPinnedEvents]: { isState: true, hideForSpace: true },
    [EventType.Reaction]: { isState: false, hideForSpace: true },
    [EventType.RoomRedaction]: { isState: false, hideForSpace: true },

    // TODO: Enable support for m.widget event type (https://github.com/vector-im/element-web/issues/13111)
    "im.vector.modular.widgets": { isState: true, hideForSpace: true },
};

// parse a string as an integer; if the input is undefined, or cannot be parsed
// as an integer, return a default.
function parseIntWithDefault(val, def) {
    const res = parseInt(val);
    return isNaN(res) ? def : res;
}

interface IBannedUserProps {
    canUnban?: boolean;
    member: RoomMember;
    by: string;
    reason?: string;
}

export class BannedUser extends React.Component<IBannedUserProps> {
    private onUnbanClick = (e) => {
        MatrixClientPeg.get().unban(this.props.member.roomId, this.props.member.userId).catch((err) => {
            logger.error("Failed to unban: " + err);
            Modal.createDialog(ErrorDialog, {
                title: _t('Error'),
                description: _t('Failed to unban'),
            });
        });
    };

    render() {
        let unbanButton;

        if (this.props.canUnban) {
            unbanButton = (
                <AccessibleButton className='mx_RolesRoomSettingsTab_unbanBtn'
                    kind='danger_sm'
                    onClick={this.onUnbanClick}
                >
                    { _t('Unban') }
                </AccessibleButton>
            );
        }

        const userId = this.props.member.name === this.props.member.userId ? null : this.props.member.userId;
        return (
            <li>
                { unbanButton }
                <span title={_t("Banned by %(displayName)s", { displayName: this.props.by })}>
                    <strong>{ this.props.member.name }</strong> { userId }
                    { this.props.reason ? " " + _t('Reason') + ": " + this.props.reason : "" }
                </span>
            </li>
        );
    }
}

interface IProps {
    roomId: string;
}

export default class RolesRoomSettingsTab extends React.Component<IProps> {
    componentDidMount() {
        MatrixClientPeg.get().on(RoomStateEvent.Update, this.onRoomStateUpdate);
    }

    componentWillUnmount() {
        const client = MatrixClientPeg.get();
        if (client) {
            client.removeListener(RoomStateEvent.Update, this.onRoomStateUpdate);
        }
    }

    private onRoomStateUpdate = (state: RoomState) => {
        if (state.roomId !== this.props.roomId) return;
        this.onThisRoomMembership();
    };

    private onThisRoomMembership = throttle(() => {
        this.forceUpdate();
    }, 200, { leading: true, trailing: true });

    private populateDefaultPlEvents(eventsSection: Record<string, number>, stateLevel: number, eventsLevel: number) {
        for (const desiredEvent of Object.keys(plEventsToShow)) {
            if (!(desiredEvent in eventsSection)) {
                eventsSection[desiredEvent] = (plEventsToShow[desiredEvent].isState ? stateLevel : eventsLevel);
            }
        }
    }

    private onPowerLevelsChanged = (value: number, powerLevelKey: string) => {
        const client = MatrixClientPeg.get();
        const room = client.getRoom(this.props.roomId);
        const plEvent = room.currentState.getStateEvents(EventType.RoomPowerLevels, '');
        let plContent = plEvent ? (plEvent.getContent() || {}) : {};

        // Clone the power levels just in case
        plContent = Object.assign({}, plContent);

        const eventsLevelPrefix = "event_levels_";

        if (powerLevelKey.startsWith(eventsLevelPrefix)) {
            // deep copy "events" object, Object.assign itself won't deep copy
            plContent["events"] = Object.assign({}, plContent["events"] || {});
            plContent["events"][powerLevelKey.slice(eventsLevelPrefix.length)] = value;
        } else {
            const keyPath = powerLevelKey.split('.');
            let parentObj;
            let currentObj = plContent;
            for (const key of keyPath) {
                if (!currentObj[key]) {
                    currentObj[key] = {};
                }
                parentObj = currentObj;
                currentObj = currentObj[key];
            }
            parentObj[keyPath[keyPath.length - 1]] = value;
        }

        client.sendStateEvent(this.props.roomId, EventType.RoomPowerLevels, plContent).catch(e => {
            logger.error(e);

            Modal.createDialog(ErrorDialog, {
                title: _t('Error changing power level requirement'),
                description: _t(
                    "An error occurred changing the room's power level requirements. Ensure you have sufficient " +
                    "permissions and try again.",
                ),
            });
        });
    };

    private onUserPowerLevelChanged = (value: number, powerLevelKey: string) => {
        const client = MatrixClientPeg.get();
        const room = client.getRoom(this.props.roomId);
        const plEvent = room.currentState.getStateEvents(EventType.RoomPowerLevels, '');
        let plContent = plEvent ? (plEvent.getContent() || {}) : {};

        // Clone the power levels just in case
        plContent = Object.assign({}, plContent);

        // powerLevelKey should be a user ID
        if (!plContent['users']) plContent['users'] = {};
        plContent['users'][powerLevelKey] = value;

        client.sendStateEvent(this.props.roomId, EventType.RoomPowerLevels, plContent).catch(e => {
            logger.error(e);

            Modal.createDialog(ErrorDialog, {
                title: _t('Error changing power level'),
                description: _t(
                    "An error occurred changing the user's power level. Ensure you have sufficient " +
                    "permissions and try again.",
                ),
            });
        });
    };

    render() {
        const client = MatrixClientPeg.get();
        const room = client.getRoom(this.props.roomId);
        const isSpaceRoom = room.isSpaceRoom();

        const plEvent = room.currentState.getStateEvents(EventType.RoomPowerLevels, '');
        const plContent = plEvent ? (plEvent.getContent() || {}) : {};
        const canChangeLevels = room.currentState.mayClientSendStateEvent(EventType.RoomPowerLevels, client);

        const plEventsToLabels = {
            // These will be translated for us later.
            [EventType.RoomAvatar]: isSpaceRoom ? _td("Change space avatar") : _td("Change room avatar"),
            [EventType.RoomName]: isSpaceRoom ? _td("Change space name") : _td("Change room name"),
            [EventType.RoomCanonicalAlias]: isSpaceRoom
                ? _td("Change main address for the space")
                : _td("Change main address for the room"),
            [EventType.SpaceChild]: _td("Manage rooms in this space"),
            [EventType.RoomHistoryVisibility]: _td("Change history visibility"),
            [EventType.RoomPowerLevels]: _td("Change permissions"),
            [EventType.RoomTopic]: isSpaceRoom ? _td("Change description") : _td("Change topic"),
            [EventType.RoomTombstone]: _td("Upgrade the room"),
            [EventType.RoomEncryption]: _td("Enable room encryption"),
            [EventType.RoomServerAcl]: _td("Change server ACLs"),
            [EventType.Reaction]: _td("Send reactions"),
            [EventType.RoomRedaction]: _td("Remove messages sent by me"),

            // TODO: Enable support for m.widget event type (https://github.com/vector-im/element-web/issues/13111)
            "im.vector.modular.widgets": isSpaceRoom ? null : _td("Modify widgets"),
        };

        if (SettingsStore.getValue("feature_pinning")) {
            plEventsToLabels[EventType.RoomPinnedEvents] = _td("Manage pinned events");
        }

        const powerLevelDescriptors: Record<string, IPowerLevelDescriptor> = {
            "users_default": {
                desc: _t('Default role'),
                defaultValue: 0,
            },
            "events_default": {
                desc: _t('Send messages'),
                defaultValue: 0,
                hideForSpace: true,
            },
            "invite": {
                desc: _t('Invite users'),
                defaultValue: 0,
            },
            "state_default": {
                desc: _t('Change settings'),
                defaultValue: 50,
            },
            "kick": {
                desc: _t('Remove users'),
                defaultValue: 50,
            },
            "ban": {
                desc: _t('Ban users'),
                defaultValue: 50,
            },
            "redact": {
                desc: _t('Remove messages sent by others'),
                defaultValue: 50,
                hideForSpace: true,
            },
            "notifications.room": {
                desc: _t('Notify everyone'),
                defaultValue: 50,
                hideForSpace: true,
            },
        };

        const eventsLevels = plContent.events || {};
        const userLevels = plContent.users || {};
        const banLevel = parseIntWithDefault(plContent.ban, powerLevelDescriptors.ban.defaultValue);
        const defaultUserLevel = parseIntWithDefault(
            plContent.users_default,
            powerLevelDescriptors.users_default.defaultValue,
        );

        let currentUserLevel = userLevels[client.getUserId()];
        if (currentUserLevel === undefined) {
            currentUserLevel = defaultUserLevel;
        }

        this.populateDefaultPlEvents(
            eventsLevels,
            parseIntWithDefault(plContent.state_default, powerLevelDescriptors.state_default.defaultValue),
            parseIntWithDefault(plContent.events_default, powerLevelDescriptors.events_default.defaultValue),
        );

        let privilegedUsersSection = <div>{ _t('No users have specific privileges in this room') }</div>;
        let mutedUsersSection;
        if (Object.keys(userLevels).length) {
            const privilegedUsers = [];
            const mutedUsers = [];

            Object.keys(userLevels).forEach((user) => {
                if (!Number.isInteger(userLevels[user])) { return; }
                const canChange = userLevels[user] < currentUserLevel && canChangeLevels;
                if (userLevels[user] > defaultUserLevel) { // privileged
                    privilegedUsers.push(
                        <PowerSelector
                            value={userLevels[user]}
                            disabled={!canChange}
                            label={user}
                            key={user}
                            powerLevelKey={user} // Will be sent as the second parameter to `onChange`
                            onChange={this.onUserPowerLevelChanged}
                        />,
                    );
                } else if (userLevels[user] < defaultUserLevel) { // muted
                    mutedUsers.push(
                        <PowerSelector
                            value={userLevels[user]}
                            disabled={!canChange}
                            label={user}
                            key={user}
                            powerLevelKey={user} // Will be sent as the second parameter to `onChange`
                            onChange={this.onUserPowerLevelChanged}
                        />,
                    );
                }
            });

            // comparator for sorting PL users lexicographically on PL descending, MXID ascending. (case-insensitive)
            const comparator = (a, b) => {
                const plDiff = userLevels[b.key] - userLevels[a.key];
                return plDiff !== 0 ? plDiff : compare(a.key.toLocaleLowerCase(), b.key.toLocaleLowerCase());
            };

            privilegedUsers.sort(comparator);
            mutedUsers.sort(comparator);

            if (privilegedUsers.length) {
                privilegedUsersSection =
                <SettingsFieldset legend={_t('Privileged Users')}>
                    { privilegedUsers }
                </SettingsFieldset>;
            }
            if (mutedUsers.length) {
                mutedUsersSection =
                    <SettingsFieldset legend={_t('Muted Users')}>
                        { mutedUsers }
                    </SettingsFieldset>;
            }
        }

        const banned = room.getMembersWithMembership("ban");
        let bannedUsersSection;
        if (banned.length) {
            const canBanUsers = currentUserLevel >= banLevel;
            bannedUsersSection =
                <SettingsFieldset legend={_t('Banned users')}>
                    <ul>
                        { banned.map((member) => {
                            const banEvent = member.events.member.getContent();
                            const sender = room.getMember(member.events.member.getSender());
                            let bannedBy = member.events.member.getSender(); // start by falling back to mxid
                            if (sender) bannedBy = sender.name;
                            return (
                                <BannedUser
                                    key={member.userId}
                                    canUnban={canBanUsers}
                                    member={member}
                                    reason={banEvent.reason}
                                    by={bannedBy}
                                />
                            );
                        }) }
                    </ul>
                </SettingsFieldset>;
        }

        const powerSelectors = Object.keys(powerLevelDescriptors).map((key, index) => {
            const descriptor = powerLevelDescriptors[key];
            if (isSpaceRoom && descriptor.hideForSpace) {
                return null;
            }

            const keyPath = key.split('.');
            let currentObj = plContent;
            for (const prop of keyPath) {
                if (currentObj === undefined) {
                    break;
                }
                currentObj = currentObj[prop];
            }

            const value = parseIntWithDefault(currentObj, descriptor.defaultValue);
            return <div key={index} className="">
                <PowerSelector
                    label={descriptor.desc}
                    value={value}
                    usersDefault={defaultUserLevel}
                    disabled={!canChangeLevels || currentUserLevel < value}
                    powerLevelKey={key} // Will be sent as the second parameter to `onChange`
                    onChange={this.onPowerLevelsChanged}
                />
            </div>;
        }).filter(Boolean);

        // hide the power level selector for enabling E2EE if it the room is already encrypted
        if (client.isRoomEncrypted(this.props.roomId)) {
            delete eventsLevels[EventType.RoomEncryption];
        }

        const eventPowerSelectors = Object.keys(eventsLevels).map((eventType, i) => {
            if (isSpaceRoom && plEventsToShow[eventType]?.hideForSpace) {
                return null;
            } else if (!isSpaceRoom && plEventsToShow[eventType]?.hideForRoom) {
                return null;
            }

            let label = plEventsToLabels[eventType];
            if (label) {
                label = _t(label);
            } else {
                label = _t("Send %(eventType)s events", { eventType });
            }
            return (
                <div className="" key={eventType}>
                    <PowerSelector
                        label={label}
                        value={eventsLevels[eventType]}
                        usersDefault={defaultUserLevel}
                        disabled={!canChangeLevels || currentUserLevel < eventsLevels[eventType]}
                        powerLevelKey={"event_levels_" + eventType}
                        onChange={this.onPowerLevelsChanged}
                    />
                </div>
            );
        }).filter(Boolean);

        return (
            <div className="mx_SettingsTab mx_RolesRoomSettingsTab">
                <div className="mx_SettingsTab_heading">{ _t("Roles & Permissions") }</div>
                { privilegedUsersSection }
                { mutedUsersSection }
                { bannedUsersSection }
                <SettingsFieldset
                    legend={_t("Permissions")}
                    description={
                        isSpaceRoom
                            ? _t('Select the roles required to change various parts of the space')
                            : _t('Select the roles required to change various parts of the room')
                    }
                >
                    { powerSelectors }
                    { eventPowerSelectors }
                </SettingsFieldset>
            </div>
        );
    }
}
