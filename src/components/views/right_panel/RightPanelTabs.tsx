/*
 *
 * Copyright 2024 The Matrix.org Foundation C.I.C.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * /
 */

import React, { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { NavBar, NavItem } from "@vector-im/compound-web";
import { Room } from "matrix-js-sdk/src/matrix";

import { RightPanelPhases } from "../../../stores/right-panel/RightPanelStorePhases";
import RightPanelStore from "../../../stores/right-panel/RightPanelStore";
import PosthogTrackers from "../../../PosthogTrackers";
import { CommonRoomInformationCard } from "./CommonRoomInformationCard";

interface HookProps {
    containerRef: RefObject<HTMLElement>;
    draggableRef: RefObject<HTMLElement>;
    maxHeight: number;
    disableCollapse?: boolean;
}

export const enum ExpandState {
    Expanded,
    Collapsed,
    Dragging,
}

interface HookReturn {
    height: number;
    expandState: ExpandState;
}

type MyHook = (props: HookProps) => HookReturn;

const useDragToExpand: MyHook = ({ containerRef, draggableRef, maxHeight, disableCollapse }) => {
    /**
     * The current height of the collapsible.
     * Will be equal to max height if collapse is disabled.
     */
    const [height, setHeight] = useState(disableCollapse ? maxHeight : 0);

    /**
     * Boolean representing whether the collapsible component is
     * being dragged at any given moment.
     */
    // const [isDragging, setIsDragging] = useState(false);

    const [expandState, setExpandState] = useState(disableCollapse ? ExpandState.Expanded : ExpandState.Collapsed);

    const startY = useRef(0);
    const startHeight = useRef(0);
    const minDelta = useRef(5);

    const [isHandlingClick, setIsHandlingClick] = useState(false);

    const lastAnimationFrameRef = useRef<number | null>(null);
    const debounce = (fn: () => void): void => {
        const lastAnimationFrame = lastAnimationFrameRef.current;
        if (lastAnimationFrame) cancelAnimationFrame(lastAnimationFrame);
        lastAnimationFrameRef.current = requestAnimationFrame(() => {
            fn();
        });
    };

    const handleMouseEvent = useCallback(
        (e: MouseEvent): void => {
            switch (e.type) {
                case "mousedown":
                    {
                        const draggable = draggableRef.current;
                        const element = e.target as HTMLElement;
                        const isValidClick =
                            !disableCollapse &&
                            e.button === 0 &&
                            (element === draggable || draggable?.contains(element));
                        if (isValidClick) {
                            startY.current = e.clientY;
                            startHeight.current = height;
                            setIsHandlingClick(!!isValidClick);
                        }
                    }
                    break;
                case "mouseup":
                    {
                        if (!isHandlingClick) return;
                        const isClick = expandState !== ExpandState.Dragging;
                        // setIsDragging(false);
                        setIsHandlingClick(false);
                        if (isClick) {
                            // This is a click
                            console.log("drag click");
                            return;
                        } else {
                            const newExpandState = height >= 60 ? ExpandState.Expanded : ExpandState.Collapsed;
                            const newHeight = newExpandState === ExpandState.Expanded ? maxHeight : 0;
                            setExpandState(newExpandState);
                            debounce(() => setHeight(newHeight));
                        }
                    }
                    break;
                case "mousemove":
                    {
                        if (!isHandlingClick) return;
                        const delta = e.clientY - startY.current;
                        if (Math.abs(delta) > minDelta.current) {
                            setExpandState(ExpandState.Dragging);
                            debounce(() => setHeight(startHeight.current + delta));
                        }
                    }
                    break;
            }
        },
        [disableCollapse, draggableRef, height, expandState, isHandlingClick, maxHeight],
    );

    /**
     * Whenever disableCollapse changes, collapse/expand the section.
     */
    useEffect(() => {
        if (disableCollapse) {
            setHeight(maxHeight);
            setExpandState(ExpandState.Expanded);
        } else {
            setHeight(0);
            setExpandState(ExpandState.Collapsed);
        }
    }, [disableCollapse, maxHeight]);

    /**
     * This code runs when containerRef is available and ensures
     * that all the event handlers are added/removed correctly.
     */
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        container.addEventListener("mousedown", handleMouseEvent);
        container.addEventListener("mouseup", handleMouseEvent);
        container.addEventListener("mousemove", handleMouseEvent);
        return () => {
            container.removeEventListener("mousedown", handleMouseEvent);
            container.removeEventListener("mouseup", handleMouseEvent);
            container.removeEventListener("mousemove", handleMouseEvent);
        };
    }, [containerRef, handleMouseEvent]);

    return { height, expandState };
};

export function shouldShowTabsForPhase(phase?: RightPanelPhases): boolean {
    const foo = [
        RightPanelPhases.RoomSummary,
        RightPanelPhases.RoomMemberList,
        RightPanelPhases.ThreadPanel,
        RightPanelPhases.FilePanel,
    ];
    return !!phase && foo.includes(phase);
}

type MProps = {
    room: Room;
    phase: RightPanelPhases;
    rightPanelRef: RefObject<HTMLElement>;
};

export const TabsWithRoomInformation: React.FC<MProps> = ({ room, phase, rightPanelRef }): JSX.Element | null => {
    const navBarRef = useRef<HTMLDivElement>(null);
    const { height, expandState } = useDragToExpand({
        containerRef: rightPanelRef,
        draggableRef: navBarRef,
        maxHeight: 250,
        disableCollapse: phase === RightPanelPhases.RoomSummary,
    });

    if (!shouldShowTabsForPhase(phase)) return null;
    return (
        <>
            <CommonRoomInformationCard room={room} expandState={expandState} height={height} />
            <div className="mx_RightPanel_navBarContainer" ref={navBarRef}>
                <NavBar className="mx_RightPanel_navBar" aria-label="foo">
                    <NavItem
                        onClick={() => {
                            RightPanelStore.instance.pushCard({ phase: RightPanelPhases.RoomSummary }, true);
                        }}
                        active={phase === RightPanelPhases.RoomSummary}
                    >
                        Info
                    </NavItem>
                    <NavItem
                        onClick={(ev) => {
                            RightPanelStore.instance.pushCard({ phase: RightPanelPhases.RoomMemberList }, true);
                            PosthogTrackers.trackInteraction("WebRightPanelRoomInfoPeopleButton", ev);
                        }}
                        active={phase === RightPanelPhases.RoomMemberList}
                    >
                        People
                    </NavItem>
                    <NavItem
                        onClick={() => {
                            RightPanelStore.instance.pushCard({ phase: RightPanelPhases.ThreadPanel }, true);
                        }}
                        active={phase === RightPanelPhases.ThreadPanel}
                    >
                        Threads
                    </NavItem>
                    <NavItem
                        onClick={() => {
                            RightPanelStore.instance.pushCard({ phase: RightPanelPhases.FilePanel }, true);
                        }}
                        active={phase === RightPanelPhases.FilePanel}
                    >
                        Files
                    </NavItem>
                </NavBar>
            </div>
        </>
    );
};
