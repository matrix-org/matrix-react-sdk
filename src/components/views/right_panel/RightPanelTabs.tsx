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

interface Props {
    phase: RightPanelPhases;
    rightPanelRef: RefObject<HTMLElement>;
    roomInfoRef: RefObject<HTMLElement>;
}

interface HookProps {
    containerRef: RefObject<HTMLElement>;
    draggableRef: RefObject<HTMLElement>;
    maxHeight: number;
    disableCollapse?: boolean;
}

interface HookReturn {
    height: number;
    isDragging: boolean;
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
    const [isDragging, setIsDragging] = useState(false);

    const startY = useRef(0);
    const startHeight = useRef(0);
    // const lastAnimationFrame = useRef<number | null>(null);
    const minDelta = useRef(5);

    const doDrag = useCallback((e: MouseEvent) => {
        // console.log("doDrag");
        // if (lastAnimationFrame.current) cancelAnimationFrame(lastAnimationFrame.current);
        const delta = e.clientY - startY.current;
        if (Math.abs(delta) > minDelta.current) {
            setIsDragging(true);
            setHeight(startHeight.current + delta);
        }
        // lastAnimationFrame.current = requestAnimationFrame(() => {
        //     lastAnimationFrame.current = null;
        // });
    }, []);

    const stopDrag = useCallback(
        (e: MouseEvent) => {
            console.log("stopDrag");
            const panel = containerRef.current!;
            panel.removeEventListener("mousemove", doDrag, false);
            panel.removeEventListener("mouseup", stopDrag, false);
            panel.removeEventListener("mouseleave", stopDrag, false);
            console.log("isDragging", isDragging);
            const isClick = !isDragging;
            setIsDragging(false);
            if (isClick) {
                // This is a click
                console.log("drag click");
                return;
            }
            // console.log("height is", height);
            const newHeight = height >= 60 ? maxHeight : 0;
            console.log("setting newHeight drag", newHeight);
            setHeight(newHeight);
            // requestAnimationFrame(() => {
            // });
        },
        [containerRef, doDrag, height, isDragging, maxHeight],
    );

    const startDrag = useCallback(
        (e: MouseEvent) => {
            const panel = containerRef.current!;
            startY.current = e.clientY;
            startHeight.current = height;

            panel.addEventListener("mousemove", doDrag, false);
            panel.addEventListener("mouseup", stopDrag, false);
            panel.addEventListener("mouseleave", stopDrag, false);
        },
        [containerRef, height, doDrag, stopDrag],
    );

    /**
     * Check if we should consider this the start of a valid drag operation
     * @param element The element which is dragged
     * @returns true if this is the start of a drag, false otherwise
     */
    const shouldStartDrag = useCallback(
        (element: HTMLElement): boolean | undefined => {
            const e = draggableRef.current;
            return !disableCollapse && (element === e || e?.contains(element));
        },
        [disableCollapse, draggableRef],
    );

    useEffect(() => {
        const panel = containerRef.current!;
        panel.addEventListener("mouseup", stopDrag, false);
        panel.addEventListener("mouseleave", stopDrag, false);
        console.log("isDragging", isDragging);
    }, [isDragging, containerRef, stopDrag]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const callback = (e: MouseEvent): void => {
            if (e.button === 0 && shouldStartDrag(e.target as HTMLElement)) {
                e.preventDefault();
                startDrag(e);
            }
        };
        container.addEventListener("mousedown", callback);
        return () => container.removeEventListener("mousedown", callback);
    }, [containerRef, shouldStartDrag, startDrag]);

    type MouseState = {
        isMouseDown?: boolean;
        isMouseUp?: boolean;
        isMouseMove?: MouseEvent;
    };

    const [mouseState, setMouseState] = useState<MouseState>({
        isMouseDown: false,
        isMouseUp: false,
        isMouseMove: undefined,
    });

    const previousMouseState = useRef<MouseState>({});

    useEffect(() => {
        return () => {
            previousMouseState.current = mouseState;
        };
    }, [mouseState]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const onMouseDown = (e: MouseEvent): void => {
            setMouseState({ isMouseDown: true });
        };
        const onMouseUp = (e: MouseEvent): void => {
            setMouseState({ isMouseUp: true });
        };
        const onMouseMove = (e: MouseEvent): void => {
            setMouseState({ isMouseMove: e });
        };
        container.addEventListener("mousedown", onMouseDown);
        container.addEventListener("mouseup", onMouseUp);
        container.addEventListener("mousemove", onMouseMove);
        return () => {
            container.removeEventListener("mousedown", onMouseDown);
            container.removeEventListener("mouseup", onMouseUp);
            container.removeEventListener("mousemove", onMouseMove);
        };
    }, [containerRef]);

    return { height, isDragging };
};

export const RightPanelTabs: React.FC<Props> = ({ phase, rightPanelRef, roomInfoRef }): JSX.Element | null => {
    const navBarRef = useRef<HTMLDivElement>(null);

    const startDrag = useCallback(
        (e: MouseEvent): void => {
            const panel = rightPanelRef.current!;
            const startY = e.clientY;
            const collapsible = roomInfoRef.current!;
            collapsible.classList.add("dragging");
            const startHeight = parseInt(window.getComputedStyle(collapsible).height, 10);

            const minDelta = 5;
            const maxHeight = 250;
            let lastUpdate: number | null = null;
            let isDrag = false;

            const doDrag = (e: MouseEvent): void => {
                if (lastUpdate) {
                    cancelAnimationFrame(lastUpdate);
                }
                lastUpdate = requestAnimationFrame(() => {
                    const delta = e.clientY - startY;
                    if (Math.abs(delta) > minDelta) {
                        isDrag = true;
                        const newHeight = startHeight + delta + "px";
                        collapsible.style.height = newHeight;
                    }
                    lastUpdate = null;
                });
            };

            const stopDrag = (e: MouseEvent): void => {
                panel.removeEventListener("mousemove", doDrag, false);
                panel.removeEventListener("mouseup", stopDrag, false);
                panel.removeEventListener("mouseleave", stopDrag, false);
                collapsible.classList.remove("dragging");
                if (!isDrag) {
                    // click
                    return;
                }
                const endHeight = parseInt(window.getComputedStyle(collapsible).height, 10);
                const newHeight = endHeight >= 60 ? maxHeight : 0;
                requestAnimationFrame(() => {
                    collapsible.style.height = `${newHeight}px`;
                });
            };

            panel.addEventListener("mousemove", doDrag, false);
            panel.addEventListener("mouseup", stopDrag, false);
            panel.addEventListener("mouseleave", stopDrag, false);
        },
        [rightPanelRef, roomInfoRef],
    );

    const shouldStartDrag = (element: HTMLElement): boolean => {
        const e = navBarRef.current;
        if (!e) return false;
        return element === e || e.contains(element);
    };

    useEffect(() => {
        if (!roomInfoRef.current) return;
        if (phase === RightPanelPhases.RoomSummary) {
            roomInfoRef.current.style.height = "250px";
            return;
        } else {
            roomInfoRef.current.style.height = "0px";
        }

        const callback = (e: MouseEvent): void => {
            if (e.button === 0 && shouldStartDrag(e.target as HTMLElement)) {
                e.preventDefault();
                startDrag(e);
            }
        };
        const panel = rightPanelRef.current;
        panel?.addEventListener("mousedown", callback);
        return () => panel?.removeEventListener("mousedown", callback);
    }, [rightPanelRef, startDrag, roomInfoRef, phase]);

    return (
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
    );
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
    const { height, isDragging } = useDragToExpand({
        containerRef: rightPanelRef,
        draggableRef: navBarRef,
        maxHeight: 250,
        disableCollapse: phase === RightPanelPhases.RoomSummary,
    });
    // const maxHeight = 250;
    // const [isDragging, setIsDragging] = useState(false);
    // const [height, setHeight] = useState(phase === RightPanelPhases.RoomSummary ? maxHeight : 0);

    if (!shouldShowTabsForPhase(phase)) return null;
    return (
        <>
            <CommonRoomInformationCard room={room} isDragging={isDragging} height={height} />
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
