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
import { MatrixEvent } from 'matrix-js-sdk/src';
import { Thread } from 'matrix-js-sdk/src/models/thread';

import BaseCard from "../views/right_panel/BaseCard";
import { RightPanelPhases } from "../../stores/RightPanelStorePhases";

import ResizeNotifier from '../../utils/ResizeNotifier';
import EventTile, { TileShape } from '../views/rooms/EventTile';
import MatrixClientContext from '../../contexts/MatrixClientContext';
import { _t } from '../../languageHandler';
import Dropdown from '../views/elements/Dropdown';
import { getStoredSessionOwner } from '../../Lifecycle';

interface IProps {
    roomId: string;
    onClose: () => void;
    resizeNotifier: ResizeNotifier;
}

export const ThreadPanelItem: React.FC<{event: MatrixEvent}> = ({ event }) => {
    return <>
        <EventTile
            mxEvent={event}
            enableFlair={false}
            showReadReceipts={false}
            as="div"
            tileShape={TileShape.ThreadPanel}
            alwaysShowTimestamps={true}
        />
    </>;
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

const useFilteredThreadsList = (threads: Set<Thread>, option: ThreadFilterType) => {
    const [iterableThreads] = useState(Array.from(threads));
    const [currentUserData, setCurrentUserData] = useState<[null | string, boolean | null]>([null, null]);
    const [filteredThreads, setFiltereredThreads] = useState(iterableThreads);

    useEffect(() => {
        getStoredSessionOwner().then((session) => {
            setCurrentUserData(session);
        }).catch((error) => {
            console.error(error);
        });
    }, []);

    useEffect(() => {
        if (!currentUserData) return;
        if (option === ThreadFilterType.My) {
            const myThreads = iterableThreads.filter(thread => {
                return thread.events[0]?.getSender() === currentUserData[0];
            });
            setFiltereredThreads(myThreads);
        } else if (option === ThreadFilterType.All) {
            setFiltereredThreads(iterableThreads);
        }
    }, [iterableThreads, option, currentUserData]);

    return filteredThreads;
};

export const ThreadPanelHeaderFilterOptionItem = ({ label, description }: ThreadPanelHeaderOption) => {
    return <div>
        <span>{ label }</span>
        <span>{ description }</span>
    </div>;
};

export const ThreadPanelHeader = ({ setFilterOption }: {
    setFilterOption: (filterOption: ThreadFilterType) => void;
}) => {
    return <div className="mx_ThreadPanel__header">
        <span>{ _t("Threads") }</span>
        <Dropdown
            id="lolwhat"
            onOptionChange={(option) => {
                console.log(option);
                console.log(typeof option);
                setFilterOption(parseInt(option, 10));
            }}
            label={_t("Show: All threads")}>
            { options.map(opt => <ThreadPanelHeaderFilterOptionItem
                key={opt.key}
                label={opt.label}
                description={opt.description}
            />) }
        </Dropdown>
    </div>;
};

const ThreadPanel: React.FC<IProps> = ({ roomId, onClose }) => {
    const mxClient = useContext(MatrixClientContext);
    const room = mxClient.getRoom(roomId);
    const [filterOption, setFilterOption] = useState<ThreadFilterType>(ThreadFilterType.All);
    const filteredThreads = useFilteredThreadsList(room.threads, filterOption);
    return (
        <BaseCard
            header={<ThreadPanelHeader setFilterOption={setFilterOption} />}
            className="mx_ThreadPanel"
            onClose={onClose}
            previousPhase={RightPanelPhases.RoomSummary}
        >
            <div className="mx_ThreadPanel--wrapper">
                { filteredThreads.map((thread: Thread) => {
                    if (thread.ready) {
                        const event = thread.rootEvent;
                        return <ThreadPanelItem key={event.getId()} event={event} />;
                    }
                }) }
            </div>
        </BaseCard>
    );
};
export default ThreadPanel;
