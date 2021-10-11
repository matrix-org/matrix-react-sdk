/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import React, { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MatrixEvent } from 'matrix-js-sdk/src/models/event';
import { Thread } from 'matrix-js-sdk/src/models/thread';

import BaseCard from "../views/right_panel/BaseCard";
import { RightPanelPhases } from "../../stores/RightPanelStorePhases";

import ResizeNotifier from '../../utils/ResizeNotifier';
import EventTile, { TileShape } from '../views/rooms/EventTile';
import MatrixClientContext from '../../contexts/MatrixClientContext';
import { _t } from '../../languageHandler';
import { ContextMenuButton } from '../../accessibility/context_menu/ContextMenuButton';
import ContextMenu, { useContextMenu } from './ContextMenu';
import RoomContext, { TimelineRenderingType } from '../../contexts/RoomContext';
import TimelinePanel from './TimelinePanel';
import { EventTimelineSet } from 'matrix-js-sdk/src/models/event-timeline-set';
import { Room } from 'matrix-js-sdk/src/models/room';
import { Layout } from '../../settings/Layout';

// TODO: Tests
interface IProps {
    roomId: string;
    onClose: () => void;
    resizeNotifier: ResizeNotifier;
}

export const ThreadPanelItem: React.FC<{event: MatrixEvent}> = ({ event }) => {
    return <EventTile
        key={event.getId()}
        mxEvent={event}
        enableFlair={false}
        showReadReceipts={false}
        as="div"
        tileShape={TileShape.Thread}
        alwaysShowTimestamps={true}
    />;
};

enum ThreadFilterType {
    "My",
    "All"
}

type ThreadPanelHeaderOption = {
    label: string;
    description: string;
    key: ThreadFilterType;
};

const useFilteredThreadsTimelinePanel = ({
    threads,
    room,
    filterOption,
    userId,
}: {
    threads: Set<Thread>;
    room: Room;
    userId: string;
    filterOption: ThreadFilterType;
}) => {
    const [iterableThreads] = useState(Array.from(threads));
    const timelineSet = useMemo(() => new EventTimelineSet(room, {
        unstableClientRelationAggregation: true,
        timelineSupport: true,
    }), [room]);

    useEffect(() => {
        let filteredThreads = iterableThreads;
        if (filterOption === ThreadFilterType.My) {
            filteredThreads = iterableThreads.filter(thread => {
                return thread.rootEvent.getSender() === userId;
            });
        }
        filteredThreads.forEach(thread => {
            const event = thread.rootEvent;
            if (timelineSet.findEventById(event.getId()) || event.status !== null) return;
            timelineSet.addEventToTimeline(
                event,
                timelineSet.getLiveTimeline(),
                true,
            );
        });
    }, [filterOption, iterableThreads, userId, timelineSet]);

    return timelineSet;
};

export const ThreadPanelHeaderFilterOptionItem = ({
    label,
    description,
    onClick,
    isSelected,
}: ThreadPanelHeaderOption & {
    onClick: () => void;
    isSelected: boolean;
}) => {
    // TODO: Use AccessibleButton here
    return <div className="mx_ThreadPanel_Header_FilterOptionItem" aria-selected={isSelected} onClick={onClick}>
        <span>{ label }</span>
        <span>{ description }</span>
    </div>;
};

export const ThreadPanelHeader = ({ filterOption, setFilterOption }: {
    filterOption: ThreadFilterType;
    setFilterOption: (filterOption: ThreadFilterType) => void;
}) => {
    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu<HTMLElement>();
    const options: readonly ThreadPanelHeaderOption[] = [
        {
            label: _t("My threads"),
            description: _t("Shows all threads you’ve participated in"),
            key: ThreadFilterType.My,
        },
        {
            label: _t("All threads"),
            description: _t('Shows all threads from current room'),
            key: ThreadFilterType.All,
        },
    ];

    const value = options.find(option => option.key === filterOption);
    const contextMenuOptions = options.map(opt => <ThreadPanelHeaderFilterOptionItem
        key={opt.key}
        label={opt.label}
        description={opt.description}
        onClick={() => {
            setFilterOption(opt.key);
            closeMenu();
        }}
        isSelected={opt === value}
    />);
    const contextMenu = menuDisplayed ? <ContextMenu top={0} right={25} onFinished={closeMenu} managed={false}>
        { contextMenuOptions }
    </ContextMenu> : null;
    return <div className="mx_ThreadPanel__header">
        <span>{ _t("Threads") }</span>
        <ContextMenuButton inputRef={button} label="potato" isExpanded={menuDisplayed} onClick={() => menuDisplayed ? closeMenu() : openMenu()}>
            { `${ _t('Show:') } ${ value.label }` }
        </ContextMenuButton>
        { contextMenu }
    </div>;
};

const ThreadPanel: React.FC<IProps> = ({ roomId, onClose }) => {
    const mxClient = useContext(MatrixClientContext);
    const roomContext = useContext(RoomContext);
    const room = mxClient.getRoom(roomId);
    const [filterOption, setFilterOption] = useState<ThreadFilterType>(ThreadFilterType.All);
    const threads = room.threads;

    const filteredTimelineSet = useFilteredThreadsTimelinePanel({
        threads,
        room,
        filterOption,
        userId: mxClient.getUserId(),
    });

    const ref = useRef <TimelinePanel>();

    useLayoutEffect(() => {
        ref.current?.refreshTimeline();
    });
    return (
        <RoomContext.Provider value={{
            ...roomContext,
            timelineRenderingType: TimelineRenderingType.Thread,
            liveTimeline: filteredTimelineSet.getLiveTimeline(),
            showHiddenEventsInTimeline: true,
        }}>
            <BaseCard
                header={<ThreadPanelHeader filterOption={filterOption} setFilterOption={setFilterOption} />}
                className="mx_ThreadPanel"
                onClose={onClose}
                previousPhase={RightPanelPhases.RoomSummary}
            >
                <TimelinePanel
                    ref={ref}
                    showReadReceipts={false} // No RR support in thread's MVP
                    manageReadReceipts={false} // No RR support in thread's MVP
                    manageReadMarkers={false} // No RM support in thread's MVP
                    sendReadReceiptOnLoad={false} // No RR support in thread's MVP
                    timelineSet={filteredTimelineSet}
                    showUrlPreview={true}
                    empty={<div>empty</div>}
                    alwaysShowTimestamps={true}
                    layout={Layout.Group}
                    hideThreadedMessages={false}
                    hidden={false}
                    showReactions={true}
                    className="mx_RoomView_messagePanel mx_GroupLayout"
                    membersLoaded={true}
                />
            </BaseCard>
        </RoomContext.Provider>
    );
};
export default ThreadPanel;
