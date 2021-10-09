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

import React, { useContext, useEffect, useState } from 'react';
import {
    CSSTransition,
    TransitionGroup,
} from 'react-transition-group';
import { MatrixEvent } from 'matrix-js-sdk/src';
import { Thread } from 'matrix-js-sdk/src/models/thread';
import { logger } from 'matrix-js-sdk/src/logger';

import BaseCard from "../views/right_panel/BaseCard";
import { RightPanelPhases } from "../../stores/RightPanelStorePhases";

import ResizeNotifier from '../../utils/ResizeNotifier';
import EventTile, { TileShape } from '../views/rooms/EventTile';
import MatrixClientContext from '../../contexts/MatrixClientContext';
import { _t } from '../../languageHandler';
import { getStoredSessionOwner } from '../../Lifecycle';
import { ContextMenuButton } from '../../accessibility/context_menu/ContextMenuButton';
import ContextMenu, { useContextMenu } from './ContextMenu';

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
        tileShape={TileShape.ThreadPanel}
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

const useFilteredThreadsList = (threads: Set<Thread>, option: ThreadFilterType) => {
    const [iterableThreads] = useState(Array.from(threads));
    const [currentUserData, setCurrentUserData] = useState<[null | string, boolean | null]>([null, null]);
    const [filteredThreads, setFiltereredThreads] = useState(iterableThreads);

    useEffect(() => {
        getStoredSessionOwner().then((session) => {
            setCurrentUserData(session);
        }).catch((error) => {
            logger.error(error);
        });
    }, []);

    useEffect(() => {
        if (!currentUserData) return;
        if (option === ThreadFilterType.My) {
            const myThreads = iterableThreads.filter(thread => {
                return thread.rootEvent.getSender() === currentUserData[0];
            });
            setFiltereredThreads(myThreads);
        } else if (option === ThreadFilterType.All) {
            setFiltereredThreads(iterableThreads);
        }
    }, [iterableThreads, option, currentUserData]);

    return filteredThreads;
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
    const position = {
        top: 43,
        right: 25,
    };
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
    const contextMenu = menuDisplayed ? <ContextMenu {...position} onFinished={closeMenu} managed={false}>
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
    const room = mxClient.getRoom(roomId);
    const [filterOption, setFilterOption] = useState<ThreadFilterType>(ThreadFilterType.All);
    const filteredThreads = useFilteredThreadsList(room.threads, filterOption);
    return (
        <BaseCard
            header={<ThreadPanelHeader filterOption={filterOption} setFilterOption={setFilterOption} />}
            className="mx_ThreadPanel"
            onClose={onClose}
            previousPhase={RightPanelPhases.RoomSummary}
        >
            <TransitionGroup className="mx_ThreadPanel--wrapper ">
                { filteredThreads.map((thread: Thread) => {
                    if (thread.ready) {
                        const event = thread.rootEvent;
                        const id = event.getId();
                        return (
                            <CSSTransition key={id} classNames="mx_rtg--fade" timeout={300}>
                                <>
                                    <ThreadPanelItem key={id} event={event} />
                                </>
                            </CSSTransition>
                        );
                    }
                }) }
            </TransitionGroup>
        </BaseCard>
    );
};
export default ThreadPanel;
