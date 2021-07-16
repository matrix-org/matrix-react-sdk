/*
Copyright 2019 The Matrix.org Foundation C.I.C.

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

import dis from '../dispatcher/dispatcher';
import { pendingVerificationRequestForUser } from '../verification';
import { Store } from 'flux/utils';
import SettingsStore from "../settings/SettingsStore";
import { RightPanelPhases, RIGHT_PANEL_PHASES_NO_ARGS } from "./RightPanelStorePhases";
import { ActionPayload } from "../dispatcher/payloads";
import { Action } from '../dispatcher/actions';
import { SettingLevel } from "../settings/SettingLevel";

interface RightPanelStoreState {
    // Whether or not to show the right panel at all.
    showRoomPanel: boolean;

    // The last phase (screen) the right panel was showing
    lastRoomPhase: RightPanelPhases;
    previousPhase?: RightPanelPhases;

    // Extra information about the last phase
    lastRoomPhaseParams: {[key: string]: any};
}

const INITIAL_STATE: RightPanelStoreState = {
    showRoomPanel: SettingsStore.getValue("showRightPanelInRoom"),
    lastRoomPhase: SettingsStore.getValue("lastRightPanelPhaseForRoom"),
    lastRoomPhaseParams: {},
};

const MEMBER_INFO_PHASES = [
    RightPanelPhases.RoomMemberInfo,
    RightPanelPhases.Room3pidMemberInfo,
    RightPanelPhases.EncryptionPanel,
];

/**
 * A class for tracking the state of the right panel between layouts and
 * sessions.
 */
export default class RightPanelStore extends Store<ActionPayload> {
    private static instance: RightPanelStore;
    private state: RightPanelStoreState;
    private lastRoomId: string;

    constructor() {
        super(dis);

        // Initialise state
        this.state = INITIAL_STATE;
    }

    get isOpenForRoom(): boolean {
        return this.state.showRoomPanel;
    }

    get roomPanelPhase(): RightPanelPhases {
        return this.state.lastRoomPhase;
    }

    get previousPhase(): RightPanelPhases | null {
        return RIGHT_PANEL_PHASES_NO_ARGS.includes(this.state.previousPhase) ? this.state.previousPhase : null;
    }

    get visibleRoomPanelPhase(): RightPanelPhases {
        return this.isOpenForRoom ? this.roomPanelPhase : null;
    }

    get roomPanelPhaseParams(): any {
        return this.state.lastRoomPhaseParams || {};
    }

    private setState(newState: Partial<RightPanelStoreState>) {
        this.state = Object.assign(this.state, newState);

        SettingsStore.setValue(
            "showRightPanelInRoom",
            null,
            SettingLevel.DEVICE,
            this.state.showRoomPanel,
        );

        if (RIGHT_PANEL_PHASES_NO_ARGS.includes(this.state.lastRoomPhase)) {
            SettingsStore.setValue(
                "lastRightPanelPhaseForRoom",
                null,
                SettingLevel.DEVICE,
                this.state.lastRoomPhase,
            );
        }

        this.__emitChange();
    }

    __onDispatch(payload: ActionPayload) {
        switch (payload.action) {
            case 'view_room':
                if (payload.room_id === this.lastRoomId) break; // skip this transition, probably a permalink
                this.lastRoomId = payload.room_id;

                // Reset to the member list if we're viewing member info
                if (MEMBER_INFO_PHASES.includes(this.state.lastRoomPhase)) {
                    this.setState({ lastRoomPhase: RightPanelPhases.RoomMemberList, lastRoomPhaseParams: {} });
                }
                break;

            case Action.SetRightPanelPhase: {
                let targetPhase = payload.phase;
                let refireParams = payload.refireParams;
                const allowClose = payload.allowClose ?? true;
                // redirect to EncryptionPanel if there is an ongoing verification request
                if (targetPhase === RightPanelPhases.RoomMemberInfo && payload.refireParams) {
                    const { member } = payload.refireParams;
                    const pendingRequest = pendingVerificationRequestForUser(member);
                    if (pendingRequest) {
                        targetPhase = RightPanelPhases.EncryptionPanel;
                        refireParams = {
                            verificationRequest: pendingRequest,
                            member,
                        };
                    }
                }
                if (!RightPanelPhases[targetPhase]) {
                    console.warn(`Tried to switch right panel to unknown phase: ${targetPhase}`);
                    return;
                }

                if (targetPhase === this.state.lastRoomPhase && !refireParams && allowClose) {
                    this.setState({
                        showRoomPanel: !this.state.showRoomPanel,
                        previousPhase: null,
                    });
                } else {
                    this.setState({
                        lastRoomPhase: targetPhase,
                        showRoomPanel: true,
                        lastRoomPhaseParams: refireParams || {},
                        previousPhase: this.state.lastRoomPhase,
                    });
                }

                // Let things like the member info panel actually open to the right member.
                dis.dispatch({
                    action: Action.AfterRightPanelPhaseChange,
                    phase: targetPhase,
                    ...(refireParams || {}),
                });
                break;
            }

            case Action.ToggleRightPanel:
                this.setState({ showRoomPanel: !this.state.showRoomPanel });
                break;
        }
    }

    static getSharedInstance(): RightPanelStore {
        if (!RightPanelStore.instance) {
            RightPanelStore.instance = new RightPanelStore();
        }
        return RightPanelStore.instance;
    }
}

window.mxRightPanelStore = RightPanelStore.getSharedInstance();
