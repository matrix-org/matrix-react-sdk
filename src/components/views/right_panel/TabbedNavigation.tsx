/*
Copyright 2024 The Matrix.org Foundation C.I.C.

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
import { NavBar, NavItem } from "@vector-im/compound-web";

import { RightPanelPhases } from "../../../stores/right-panel/RightPanelStorePhases";
import RightPanelStore from "../../../stores/right-panel/RightPanelStore";
import PosthogTrackers from "../../../PosthogTrackers";

export function shouldShowTabsForPhase(phase?: RightPanelPhases): boolean {
    const foo = [RightPanelPhases.RoomSummary, RightPanelPhases.RoomMemberList, RightPanelPhases.ThreadPanel];
    return !!phase && foo.includes(phase);
}

type Props = {
    phase: RightPanelPhases;
};

export const TabbedNavigation: React.FC<Props> = ({ phase }): JSX.Element | null => {
    if (!shouldShowTabsForPhase(phase)) return null;

    return (
        <div className="mx_RightPanel_navBarContainer">
            <NavBar className="mx_RightPanel_navBar" aria-label="right panel" role="tablist">
                <NavItem
                    aria-controls="room-summary-panel"
                    id="room-summary-panel-tab"
                    onClick={() => {
                        RightPanelStore.instance.pushCard({ phase: RightPanelPhases.RoomSummary }, true);
                    }}
                    active={phase === RightPanelPhases.RoomSummary}
                >
                    Info
                </NavItem>
                <NavItem
                    aria-controls="memberlist-panel"
                    id="memberlist-panel-tab"
                    onClick={(ev) => {
                        RightPanelStore.instance.pushCard({ phase: RightPanelPhases.RoomMemberList }, true);
                        PosthogTrackers.trackInteraction("WebRightPanelRoomInfoPeopleButton", ev);
                    }}
                    active={phase === RightPanelPhases.RoomMemberList}
                >
                    People
                </NavItem>
                <NavItem
                    aria-controls="thread-panel"
                    id="thread-panel-tab"
                    onClick={() => {
                        RightPanelStore.instance.pushCard({ phase: RightPanelPhases.ThreadPanel }, true);
                    }}
                    active={phase === RightPanelPhases.ThreadPanel}
                >
                    Threads
                </NavItem>
            </NavBar>
        </div>
    );
};
