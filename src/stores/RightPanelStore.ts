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

import defaultDispatcher from '../dispatcher/dispatcher';
import { pendingVerificationRequestForUser } from '../verification';
import SettingsStore from "../settings/SettingsStore";
import { RightPanelPhases/*, RIGHT_PANEL_PHASES_NO_ARGS */ } from "./RightPanelStorePhases";
import { ActionPayload } from "../dispatcher/payloads";
import { Action } from '../dispatcher/actions';
import { SettingLevel } from "../settings/SettingLevel";

import { logger } from "matrix-js-sdk/src/logger";
import { AsyncStore } from './AsyncStore';
// import RightPanel from '../components/structures/RightPanel';
// import { Playback } from '../audio/Playback';
// import { RoomView } from '../components/structures/RoomView';

interface IState {
    // Whether or not to show the right panel at all. We split out rooms and groups
    // because they're different flows for the user to follow.
    // showRoomPanel: boolean;
    // showGroupPanel: boolean;

    // The last phase (screen) the right panel was showing
    // lastRoomPhase: RightPanelPhases;
    // lastGroupPhase: RightPanelPhases;

    // previousPhase?: RightPanelPhases;

    // Extra information about the last phase
    // lastRoomPhaseParams: {[key: string]: any};

    // Replicate everything for group
    phaseHistoryRoom: Array<IPhaseAndState>;
    currentRoom?: IPhaseAndState;
    previousRoom?: IPhaseAndState;
    isOpenRoom?: boolean;
}
interface IPhaseAndState {
    phase: RightPanelPhases;
    state: any;
}

const INITIAL_STATE: IState = {
    phaseHistoryRoom: [],
    currentRoom: null,
    previousRoom: null,
    isOpenRoom: null,
    // byRoom: {},
    // byGroup: {},
    // showGroupPanel: SettingsStore.getValue("showRightPanelInGroup"),
    // lastRoomPhase: SettingsStore.getValue("lastRightPanelPhaseForRoom"),
    // lastGroupPhase: SettingsStore.getValue("lastRightPanelPhaseForGroup"),
    // lastRoomPhaseParams: {},
};

const GROUP_PHASES = [
    RightPanelPhases.GroupMemberList,
    RightPanelPhases.GroupRoomList,
    RightPanelPhases.GroupRoomInfo,
    RightPanelPhases.GroupMemberInfo,
];

const MEMBER_INFO_PHASES = [
    RightPanelPhases.RoomMemberInfo,
    RightPanelPhases.Room3pidMemberInfo,
    RightPanelPhases.EncryptionPanel,
];

/**
 * A class for tracking the state of the right panel between layouts and
 * sessions.
 */
export default class RightPanelStore extends AsyncStore<IState> {
    private static internalInstance: RightPanelStore;
    private viewedRoomId: string;
    private isViewingRoom?: boolean;
    // private viewedGroupId: string;
    private byRoom: {
        [roomId: string]: {
            isOpen: boolean;
            history: Array<IPhaseAndState>;
        };
    } = {};
    private global?: {
        isOpen: boolean;
        history: Array<IPhaseAndState>;
    } = null;
    // private byGroup: {
    //     [groupId: string]: {
    //         isOpen: boolean;
    //         history: Array<IPhaseAndState>;
    //     };
    // };
    // private state: RightPanelStoreState;
    // private lastRoomId: string;

    private constructor() {
        super(defaultDispatcher, INITIAL_STATE);
    }

    // get isOpenForRoom(roomId:): boolean {
    //     return this.state.showRoomPanel;
    // }

    get isOpenForRoom(): boolean {
        return this.state.isOpenRoom ?? false;
        // return this.state.byRoom[this.viewedRoomId]?.isOpen;
    }

    // get isOpenForGroup(): boolean {
    //     return this.state.showGroupPanel;
    // }

    get isOpenForGroup(): boolean {
        return this.state.isOpenRoom ?? false;
        // return this.state.byGroup[this.viewedGroupId]?.isOpen;
    }

    // get roomPanelPhase(): RightPanelPhases {
    //     return this.state.lastRoomPhase;
    // }
    get roomPhaseHistory(): Array<IPhaseAndState> {
        return this.state.phaseHistoryRoom;
        // if (!this.viewedRoomId) return null;
        // return this.state.byRoom[this.viewedRoomId]?.history ?? [];
    }
    get currentRoom(): IPhaseAndState {
        return this.state.currentRoom ?? { state: {}, phase: null };
        // const hist = this.roomPhaseHistory;
        // if (hist.length >= 1) {
        //     return hist[hist.length - 1];
        // }
        // return null;
    }
    get previousRoom(): IPhaseAndState {
        return this.state.previousRoom ?? { state: {}, phase: null };
        // const hist = this.roomPhaseHistory;
        // if (hist.length >= 2) {
        //     return hist[hist.length - 2];
        // }
    }
    // get groupPanelPhase(): RightPanelPhases {
    //     return this.state.lastGroupPhase;
    // }
    get groupPhaseHistory(): Array<IPhaseAndState> {
        return this.roomPhaseHistory;
        // if (!this.viewedGroupId) return null;
        // return this.state.byRoom[this.viewedGroupId]?.history ?? [];
    }
    get currentGroup(): IPhaseAndState {
        return this.currentRoom;
        // const hist = this.groupPhaseHistory;
        // if (hist.length >= 1) {
        //     return hist[hist.length - 1];
        // }
        // return null;
    }
    get previousGroup(): IPhaseAndState {
        return this.previousRoom;
        // const hist = this.groupPhaseHistory;
        // if (hist.length >= 2) {
        //     return hist[hist.length - 2];
        // }
        // return null;
    }

    // get previousPhase(): RightPanelPhases | null {
    //     return RIGHT_PANEL_PHASES_NO_ARGS.includes(this.state.previousPhase) ? this.state.previousPhase : null;
    // }

    // get visibleRoomPanelPhase(): RightPanelPhases {
    //     return this.isOpenForRoom ? this.roomPanelPhase : null;
    // }

    // get visibleGroupPanelPhase(): RightPanelPhases {
    //     return this.isOpenForGroup ? this.groupPanelPhase : null;
    // }

    // get roomPanelPhaseParams(): any {
    //     return this.state.lastRoomPhaseParams || {};
    // }

    // private setState(newState: Partial<IState>) {
    //     this.updateState(newState);

    //     SettingsStore.setValue(
    //         "showRightPanelInRoom",
    //         null,
    //         SettingLevel.DEVICE,
    //         this.state.showRoomPanel,
    //     );
    //     SettingsStore.setValue(
    //         "showRightPanelInGroup",
    //         null,
    //         SettingLevel.DEVICE,
    //         this.state.showGroupPanel,
    //     );

    //     if (RIGHT_PANEL_PHASES_NO_ARGS.includes(this.state.lastRoomPhase)) {
    //         SettingsStore.setValue(
    //             "lastRightPanelPhaseForRoom",
    //             null,
    //             SettingLevel.DEVICE,
    //             this.state.lastRoomPhase,
    //         );
    //     }
    //     if (RIGHT_PANEL_PHASES_NO_ARGS.includes(this.state.lastGroupPhase)) {
    //         SettingsStore.setValue(
    //             "lastRightPanelPhaseForGroup",
    //             null,
    //             SettingLevel.DEVICE,
    //             this.state.lastGroupPhase,
    //         );
    //     }
    // }
    // getCurrentRoomCache() {
    //     if (!!this.global) {
    //         return this.global;
    //     } else {
    //         return this.byRoom[this.viewedRoomId];
    //     }
    // }
    // setCurrentRoomCache(roomCache, global) {
    //     if (!!global) {
    //         this.global = roomCache;
    //     } else {
    //         this.byRoom[this.viewedRoomId] = roomCache;
    //     }
    // }
    loadCacheFromSettings() {
        this.global = this.global ?? SettingsStore.getValue("RightPanel.phasesGlobal");
        this.byRoom[this.viewedRoomId] = this.byRoom[this.viewedRoomId]
            ?? SettingsStore.getValue("RightPanel.phases", this.viewedRoomId);
    }
    updateStateAndSettingsFromCache() {
        let previous: IPhaseAndState;
        let current: IPhaseAndState;
        const cacheGlobal = this.global;
        const cacheThisRoom = this.byRoom[this.viewedRoomId];
        SettingsStore.setValue("RightPanel.phasesGlobal", null, SettingLevel.DEVICE, cacheGlobal);
        SettingsStore.setValue("RightPanel.phases", this.viewedRoomId, SettingLevel.DEVICE, cacheThisRoom);
        const roomCache = cacheGlobal ?? cacheThisRoom;
        const hist = roomCache?.history ?? [];
        if (hist?.length >= 2) {
            previous = hist[hist.length - 2];
        }
        if (hist?.length >= 1) {
            current = hist[hist.length - 1];
        }
        this.updateState({
            isOpenRoom: roomCache?.isOpen ?? false,
            currentRoom: current,
            previousRoom: previous,
            phaseHistoryRoom: hist,
        });
    }
    // NEEDED:
    // set rigth panel: overrides the history
    private setRightPanel(targetPhase, refireParams) {
        this.byRoom[this.viewedRoomId] ={
            history: [{ phase: targetPhase, state: refireParams }],
            isOpen: true,
        };
        this.updateStateAndSettingsFromCache();
    }
    // // push right panel: appends to the history
    // private pushRightPanel(payload) {

    // }
    // // pop right panel: removes last eelemnt from history
    // private popRightPanel(_payload) {

    // }

    // CHECKS:
    //  - RoomMemberInfo -> needs to be changed to EncryptionPanel if pendingVerificationRequestForUser
    //  - hide/show when setting the same panel twice
    private togglePanel() {
        this.byRoom[this.viewedRoomId].isOpen = !this.byRoom[this.viewedRoomId].isOpen;
        this.updateStateAndSettingsFromCache();
    }

    private getVerificationRedirect(targetPhase, payload): { targetPhase: RightPanelPhases, refireParams: {} } {
        if (targetPhase === RightPanelPhases.RoomMemberInfo && payload.refireParams) {
            const { member } = payload.refireParams;
            const pendingRequest = pendingVerificationRequestForUser(member);
            if (pendingRequest) {
                return {
                    targetPhase: RightPanelPhases.EncryptionPanel,
                    refireParams: {
                        verificationRequest: pendingRequest,
                        member,
                    },
                };
            }
        }
        return null;
    }

    private isPhaseActionIsValid(targetPhase) {
        if (!RightPanelPhases[targetPhase]) {
            logger.warn(`Tried to switch right panel to unknown phase: ${targetPhase}`);
            return false;
        }
        if (GROUP_PHASES.includes(targetPhase) && this.isViewingRoom) {
            logger.warn(`Tried to switch right panel to a group phase: ${targetPhase}, 
            but we are currently not viewing a group`);
            return false;
        } else if (!GROUP_PHASES.includes(targetPhase) && !this.isViewingRoom) {
            logger.warn(`Tried to switch right panel to a room phase: ${targetPhase}, 
            but we are currently not viewing a room`);
            return false;
        }
        return true;
    }

    onDispatch(payload: ActionPayload) {
        // __onDispatch(payload: ActionPayload) { // eslint-disable-line @typescript-eslint/naming-convention
        switch (payload.action) {
            case 'view_group':
            case Action.ViewRoom: {
                console.log("ORDER_DEBUG: action:", payload.action);
                if (payload.room_id === this.viewedRoomId) break; // skip this transition, probably a permalink

                // Put group in the same/similar view to what was open from the previously viewed room
                // Is contradictory to the new "per room" philosophy but it is the legacy behaviour for groups.
                if ((this.isViewingRoom ? Action.ViewRoom : "view_group") != payload.action) {
                    if (payload.action == Action.ViewRoom && MEMBER_INFO_PHASES.includes(this.currentRoom?.phase)) {
                        // switch from group to room
                        this.setRightPanel(RightPanelPhases.RoomMemberList, {});
                        // this.setState({ lastRoomPhase: RightPanelPhases.RoomMemberList, lastRoomPhaseParams: {} });
                    } else if (payload.action == "view_group"
                        && this.state.currentRoom?.phase === RightPanelPhases.GroupMemberInfo) {
                        // switch from room to group
                        this.setRightPanel(RightPanelPhases.GroupMemberList, {});
                        // this.setState({ lastGroupPhase: RightPanelPhases.GroupMemberList });
                    }
                }

                // Update the current room here, so that all the other functions dont need to be room dependant.
                // The right panel store always will return the state for the current room.
                this.viewedRoomId = payload.room_id;
                this.isViewingRoom = payload.action == Action.ViewRoom;
                // load values from byRoomCache with the viewedRoomId.
                this.loadCacheFromSettings();
                this.updateStateAndSettingsFromCache();
                console.log("right panel store for current room: ", this.byRoom[this.viewedRoomId]);
                break;

                // Reset to the member list if we're viewing member info
            }

            // case 'view_group':
            //     this.viewedGroupId = payload.room_id;
            //     this.viewedRoomId = undefined;

            //     Not necassary anymore since we store everything per room/ per group
            //     this.lastRoomId = payload.room_id;

            // // Reset to the member list if we're viewing member info
            // if (MEMBER_INFO_PHASES.includes(this.currentRoomPhaseState.phase)) {
            //     this.setState({ lastRoomPhase: RightPanelPhases.RoomMemberList, lastRoomPhaseParams: {} });
            // }

            // // Do the same for groups
            // if (this.state.lastGroupPhase === RightPanelPhases.GroupMemberInfo) {
            //     this.setState({ lastGroupPhase: RightPanelPhases.GroupMemberList });
            // }
            //     break;

            case Action.SetRightPanelPhase: {
                console.log("ORDER_DEBUG: action:", Action.SetRightPanelPhase);
                // this was previously a very multifuncitonal command:
                // TogglePanel: if the same phase is send but without refireParams
                // UpdateState: if the same phase is send but with refireParams
                // SetRightPanel and erase history: if a "differnt to the current" phase is send (with or without refireParams)
                const redirect = this.getVerificationRedirect(payload, payload.phase);
                const targetPhase = redirect?.targetPhase ?? payload.phase;
                const refireParams = redirect?.refireParams ?? payload.refireParams;

                const allowClose = payload.allowClose ?? true;

                // Checks for wrong SetRightPanelPhase requests
                if (!this.isPhaseActionIsValid(targetPhase)) break;

                if (targetPhase === this.currentRoom?.phase && allowClose && !refireParams) {
                    // Toggle command: a toggle command needs to fullfill the following:
                    // - the same phase
                    // - the panel can be closed
                    // - does not contain any state information (refireParams)
                    this.togglePanel();
                    break;
                } else if ((targetPhase === this.currentRoom?.phase && !!refireParams)) {
                    // Update Command: set right panel phase with a new state but keep the phase (dont know it this is ever needed...)
                    const hist = this.byRoom[this.viewedRoomId].history;
                    hist[hist.length - 1].state = refireParams;
                    this.updateStateAndSettingsFromCache();
                    break;
                } else if (targetPhase !== this.currentRoom?.phase) {
                    // SetRightPanel and erase history.
                    this.setRightPanel(targetPhase, refireParams);
                    // this.byRoom[this.viewedRoomId] = {
                    //     history: [{ phase: targetPhase, state: refireParams }],
                    //     isOpen: true,
                    // };
                    // this.updateStateFromCache();
                }
                // redirect to EncryptionPanel if there is an ongoing verification request
                // if (targetPhase === RightPanelPhases.RoomMemberInfo && payload.refireParams) {
                //     const { member } = payload.refireParams;
                //     const pendingRequest = pendingVerificationRequestForUser(member);
                //     if (pendingRequest) {
                //         targetPhase = RightPanelPhases.EncryptionPanel;
                //         refireParams = {
                //             verificationRequest: pendingRequest,
                //             member,
                //         };
                //     }
                // }

                // if (GROUP_PHASES.includes(targetPhase)) {
                //     if (targetPhase === this.state.lastGroupPhase) {
                //     // hide when already open
                //         this.setState({
                //             showGroupPanel: !this.state.showGroupPanel,
                //             previousPhase: null,
                //         });
                //     } else {
                //         this.setState({
                //             lastGroupPhase: targetPhase,
                //             showGroupPanel: true,
                //             previousPhase: this.state.lastGroupPhase,
                //         });
                //     }
                // } else {
                //     if (targetPhase === this.state.lastRoomPhase && !refireParams && allowClose) {
                //         this.setState({
                //             showRoomPanel: !this.state.showRoomPanel,
                //             previousPhase: null,
                //         });
                //     } else {
                //         this.setState({
                //             lastRoomPhase: targetPhase,
                //             showRoomPanel: true,
                //             lastRoomPhaseParams: refireParams || {},
                //             previousPhase: this.state.lastRoomPhase,
                //         });
                //     }
                // }

                // Let things like the member info panel actually open to the right member.
                // Dont do the dispatch anymore, instead use a listener
                // defaultDispatcher.dispatch({
                //     action: Action.AfterRightPanelPhaseChange,
                //     phase: targetPhase,
                //     ...(refireParams || {}),
                // });
                break;
            }
            case Action.PushRightPanelPhase: {
                console.log("ORDER_DEBUG: action:", payload.action);
                const redirect = this.getVerificationRedirect(payload, payload.phase);
                const targetPhase = redirect?.targetPhase ?? payload.phase;
                const refireParams = redirect?.refireParams ?? payload.refireParams;

                const allowClose = payload.allowClose ?? true;

                // Checks for wrong SetRightPanelPhase requests
                if (!this.isPhaseActionIsValid(targetPhase)) break;

                let roomCache = this.byRoom[this.viewedRoomId];
                if (!!roomCache) {
                    // append new phase
                    roomCache.history.push({ state: refireParams, phase: targetPhase });
                    roomCache.isOpen = allowClose ? roomCache.isOpen : true;
                } else {
                    // create new phase
                    roomCache = {
                        history: [{ phase: targetPhase, state: refireParams }],
                        // if there was no right panel store object the the panel was closed -> keep it closed, except if allowClose==false
                        isOpen: !allowClose,
                    };
                }

                this.updateStateAndSettingsFromCache();
                break;
            }
            case Action.PopRightPanelPhase: {
                const roomCache = this.byRoom[this.viewedRoomId];
                roomCache.history.pop();
                this.updateStateAndSettingsFromCache();
                break;
            }

            case Action.ToggleRightPanel:
                console.log("ORDER_DEBUG: action:", payload.action);
                this.togglePanel();
                break;
            // if (payload.type === "room") {
            //     this.setState({ showRoomPanel: !this.state.showRoomPanel });
            // } else { // group
            //     this.setState({ showGroupPanel: !this.state.showGroupPanel });
            // }
            // break;
        }
    }
    public static get instance(): RightPanelStore {
        if (!RightPanelStore.internalInstance) {
            RightPanelStore.internalInstance = new RightPanelStore();
        }
        return RightPanelStore.internalInstance;
    }
}

window.mxRightPanelStore = RightPanelStore.instance;
