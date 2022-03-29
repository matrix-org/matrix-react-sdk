/*
Copyright 2021 - 2022 The Matrix.org Foundation C.I.C.

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

import React, { useContext, useEffect, useRef, useState } from 'react';
import { EventTimelineSet } from 'matrix-js-sdk/src/models/event-timeline-set';
import { Thread, ThreadEvent } from 'matrix-js-sdk/src/models/thread';
import { Room } from 'matrix-js-sdk/src/models/room';

import BaseCard from "../views/right_panel/BaseCard";
import ResizeNotifier from '../../utils/ResizeNotifier';
import MatrixClientContext from '../../contexts/MatrixClientContext';
import { _t } from '../../languageHandler';
import { ContextMenuButton } from '../../accessibility/context_menu/ContextMenuButton';
import ContextMenu, { ChevronFace, MenuItemRadio, useContextMenu } from './ContextMenu';
import RoomContext, { TimelineRenderingType } from '../../contexts/RoomContext';
import TimelinePanel from './TimelinePanel';
import { Layout } from '../../settings/enums/Layout';
import { RoomPermalinkCreator } from '../../utils/permalinks/Permalinks';
import Measured from '../views/elements/Measured';
import PosthogTrackers from "../../PosthogTrackers";
import { ButtonEvent } from "../views/elements/AccessibleButton";

interface IProps {
    roomId: string;
    onClose: () => void;
    resizeNotifier: ResizeNotifier;
    permalinkCreator: RoomPermalinkCreator;
}

export enum ThreadFilterType {
    "My",
    "All"
}

type ThreadPanelHeaderOption = {
    label: string;
    description: string;
    key: ThreadFilterType;
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
    return <MenuItemRadio
        active={isSelected}
        className="mx_ThreadPanel_Header_FilterOptionItem"
        onClick={onClick}
    >
        <span>{ label }</span>
        <span>{ description }</span>
    </MenuItemRadio>;
};

export const ThreadPanelHeader = ({ filterOption, setFilterOption, empty }: {
    filterOption: ThreadFilterType;
    setFilterOption: (filterOption: ThreadFilterType) => void;
    empty: boolean;
}) => {
    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu<HTMLElement>();
    const options: readonly ThreadPanelHeaderOption[] = [
        {
            label: _t("All threads"),
            description: _t('Shows all threads from current room'),
            key: ThreadFilterType.All,
        },
        {
            label: _t("My threads"),
            description: _t("Shows all threads you've participated in"),
            key: ThreadFilterType.My,
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
    const contextMenu = menuDisplayed ? <ContextMenu
        top={100}
        right={33}
        onFinished={closeMenu}
        chevronFace={ChevronFace.Top}
        wrapperClassName="mx_ThreadPanel__header"
    >
        { contextMenuOptions }
    </ContextMenu> : null;
    return <div className="mx_ThreadPanel__header">
        <span>{ _t("Threads") }</span>
        { !empty && <>
            <ContextMenuButton
                className="mx_ThreadPanel_dropdown"
                inputRef={button}
                isExpanded={menuDisplayed}
                onClick={(ev: ButtonEvent) => {
                    openMenu();
                    PosthogTrackers.trackInteraction("WebRightPanelThreadPanelFilterDropdown", ev);
                }}
            >
                { `${_t('Show:')} ${value.label}` }
            </ContextMenuButton>
            { contextMenu }
        </> }
    </div>;
};

interface EmptyThreadIProps {
    filterOption: ThreadFilterType;
    showAllThreadsCallback: () => void;
}

const EmptyThread: React.FC<EmptyThreadIProps> = ({ filterOption, showAllThreadsCallback }) => {
    return <aside className="mx_ThreadPanel_empty">
        <div className="mx_ThreadPanel_largeIcon" />
        <h2>{ _t("Keep discussions organised with threads") }</h2>
        <p>{ _t("Reply to an ongoing thread or use “%(replyInThread)s” "
              + "when hovering over a message to start a new one.", { replyInThread: _t("Reply in thread") }) }
        </p>
        <p>
            { /* Always display that paragraph to prevent layout shift
                When hiding the button */ }
            { filterOption === ThreadFilterType.My
                ? <button onClick={showAllThreadsCallback}>{ _t("Show all threads") }</button>
                : <>&nbsp;</>
            }
        </p>
    </aside>;
};

const ThreadPanel: React.FC<IProps> = ({
    roomId,
    onClose,
    permalinkCreator,
}) => {
    const mxClient = useContext(MatrixClientContext);
    const roomContext = useContext(RoomContext);
    const timelinePanel = useRef<TimelinePanel>();
    const card = useRef<HTMLDivElement>();

    const [filterOption, setFilterOption] = useState<ThreadFilterType>(ThreadFilterType.All);
    const [room, setRoom] = useState<Room | null>(null);
    const [threadCount, setThreadCount] = useState<number>(0);
    const [timelineSet, setTimelineSet] = useState<EventTimelineSet | null>(null);
    const [narrow, setNarrow] = useState<boolean>(false);

    useEffect(() => {
        const room = mxClient.getRoom(roomId);
        room.createThreadsTimelineSets().then(() => {
            setRoom(room);
            setFilterOption(ThreadFilterType.All);
            room.fetchRoomThreads();
        });
    }, [mxClient, roomId]);

    useEffect(() => {
        function onNewThread(): void {
            setThreadCount(room.threads.size);
        }

        function refreshTimeline() {
            if (timelineSet) timelinePanel.current.refreshTimeline();
        }

        if (room) {
            setThreadCount(room.threads.size);

            room.on(ThreadEvent.New, onNewThread);
            room.on(ThreadEvent.Update, refreshTimeline);
        }

        return () => {
            room?.removeListener(ThreadEvent.New, onNewThread);
            room?.removeListener(ThreadEvent.Update, refreshTimeline);
        };
    }, [room, mxClient, timelineSet]);

    useEffect(() => {
        if (room) {
            if (filterOption === ThreadFilterType.My) {
                setTimelineSet(room.threadsTimelineSets[1]);
            } else {
                setTimelineSet(room.threadsTimelineSets[0]);
            }
        }
    }, [room, filterOption]);

    useEffect(() => {
        if (timelineSet && !Thread.hasServerSideSupport) {
            timelinePanel.current.refreshTimeline();
        }
    }, [timelineSet, timelinePanel]);

    return (
        <RoomContext.Provider value={{
            ...roomContext,
            timelineRenderingType: TimelineRenderingType.ThreadsList,
            showHiddenEventsInTimeline: true,
            narrow,
        }}>
            <BaseCard
                header={<ThreadPanelHeader
                    filterOption={filterOption}
                    setFilterOption={setFilterOption}
                    empty={threadCount === 0}
                />}
                className="mx_ThreadPanel"
                onClose={onClose}
                withoutScrollContainer={true}
                ref={card}
            >
                <Measured
                    sensor={card.current}
                    onMeasurement={setNarrow}
                />
                { timelineSet && (
                    <TimelinePanel
                        ref={timelinePanel}
                        showReadReceipts={false} // No RR support in thread's MVP
                        manageReadReceipts={false} // No RR support in thread's MVP
                        manageReadMarkers={false} // No RM support in thread's MVP
                        sendReadReceiptOnLoad={false} // No RR support in thread's MVP
                        timelineSet={timelineSet}
                        showUrlPreview={false} // No URL previews at the threads list level
                        empty={<EmptyThread
                            filterOption={filterOption}
                            showAllThreadsCallback={() => setFilterOption(ThreadFilterType.All)}
                        />}
                        alwaysShowTimestamps={true}
                        layout={Layout.Group}
                        hideThreadedMessages={false}
                        hidden={false}
                        showReactions={false}
                        className="mx_RoomView_messagePanel mx_GroupLayout"
                        membersLoaded={true}
                        permalinkCreator={permalinkCreator}
                        disableGrouping={true}
                    />
                ) }
            </BaseCard>
        </RoomContext.Provider>
    );
};
export default ThreadPanel;
