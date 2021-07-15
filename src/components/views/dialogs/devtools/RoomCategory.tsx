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

import React, { useEffect, useMemo, useState } from "react";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { Room } from "matrix-js-sdk/src/models/room";
import {
    PHASE_UNSENT,
    PHASE_REQUESTED,
    PHASE_READY,
    PHASE_DONE,
    PHASE_STARTED,
    PHASE_CANCELLED,
    VerificationRequest,
} from "matrix-js-sdk/src/crypto/verification/request/VerificationRequest";

import { _t, _td } from "../../../../languageHandler";
import SyntaxHighlight from '../../elements/SyntaxHighlight';
import GenericEditor, { GenericEditorProps } from "./GenericEditor";
import Field from "../../elements/Field";
import GenericExplore from "./GenericExplore";
import { ICategory, IDevtool, IProps as IDevtoolProps } from "./index";
import WidgetStore from "../../../../stores/WidgetStore";
import { UPDATE_EVENT } from "../../../../stores/AsyncStore";
import { useEventEmitter } from "../../../../hooks/useEventEmitter";

export interface ISendCustomEventProps extends IDevtoolProps, GenericEditorProps {
    defaultEventType: string;
    defaultContent: string;
}

export const SendTimelineEventTool: IDevtool<ISendCustomEventProps> = {
    label: _td("Send timeline event"),
    Component: ({
        room,
        onBack,
        defaultEventType,
        defaultContent,
    }: ISendCustomEventProps) => {
        const onSend = (eventType: string, content: string) => {
            return room.client.sendEvent(room.roomId, eventType, content);
        };

        return <GenericEditor
            onSend={onSend}
            onBack={onBack}
            defaultEventType={defaultEventType}
            defaultContent={defaultContent}
        />;
    },
};

interface ISendCustomStateEventProps extends IDevtoolProps, GenericEditorProps {
    defaultStateKey?: string;
}

export const SendCustomStateEventTool: IDevtool<ISendCustomStateEventProps> = {
    label: _td("Send state event"),
    Component: ({
        room,
        onBack,
        defaultEventType,
        defaultStateKey = "",
        defaultContent,
    }: ISendCustomStateEventProps) => {
        const [stateKey, setStateKey] = useState(defaultStateKey);

        const onSend = (eventType: string, content: string) => {
            return room.client.sendStateEvent(room.roomId, eventType, content, stateKey);
        };

        return <GenericEditor
            onSend={onSend}
            onBack={onBack}
            defaultEventType={defaultEventType}
            defaultContent={defaultContent}
        >
            <Field
                label={_t("State key")}
                type="text"
                autoComplete="off"
                value={stateKey}
                onChange={e => setStateKey(e.target.value)}
            />
        </GenericEditor>;
    },
};

const getEditComponent = (room: Room, ev: MatrixEvent, onBack: () => void): JSX.Element => {
    if (ev.isState()) {
        return <SendCustomStateEventTool.Component
            room={room}
            onBack={onBack}
            defaultEventType={ev.getType()}
            defaultContent={JSON.stringify(ev.getContent())}
            defaultStateKey={ev.getStateKey()}
        />;
    }

    return <SendTimelineEventTool.Component
        room={room}
        onBack={onBack}
        defaultEventType={ev.getType()}
        defaultContent={JSON.stringify(ev.getContent())}
    />;
};

interface IExploreRoomStateEventProps {
    mxEvent: MatrixEvent;
    onBack(): void;
    onEdit(): void;
}

export const ViewSource = ({ mxEvent, onBack, onEdit }: IExploreRoomStateEventProps) => {
    return <div className="mx_ViewSource">
        <div className="mx_Dialog_content">
            <SyntaxHighlight className="json">
                { JSON.stringify(mxEvent.event, null, 2) }
            </SyntaxHighlight>
        </div>
        <div className="mx_Dialog_buttons">
            <button onClick={onBack}>{ _t("Back") }</button>
            <button onClick={onEdit}>{ _t("Edit") }</button>
        </div>
    </div>;
};

const ServersInRoomListTool: IDevtool = {
    label: _td("Servers in room"),
    Component: ({ room, onBack }: IDevtoolProps) => {
        const servers = useMemo(() => {
            const servers = new Set<string>();
            room.currentState.getStateEvents("m.room.member").forEach(ev => servers.add(ev.getSender().split(":")[1]));
            return servers;
        }, [room]);
        return <GenericExplore keys={servers.keys()} onBack={onBack} />;
    },
};

const ExploreRoomStateTool: IDevtool = {
    label: _td("Explore room state"),
    Component: ({ room, onBack }: IDevtoolProps) => {
        const [editing, setEditing] = useState<MatrixEvent>(undefined);

        return <GenericExplore
            keys={room.currentState.events.keys()}
            onBack={onBack}
            renderCreateNew={onBack => <SendCustomStateEventTool.Component room={room} onBack={onBack} />}
            renderTarget={(eventType, onBack) => {
                if (room.currentState.events.get(eventType).size === 1) {
                    const ev = room.currentState.getStateEvents(eventType)[0];
                    if (editing) return getEditComponent(room, ev, onBack);
                    return <ViewSource mxEvent={ev} onBack={onBack} onEdit={() => setEditing(ev)} />;
                }

                return <GenericExplore
                    keys={room.currentState.events.get(eventType).keys()}
                    renderCreateNew={onBack => (
                        <SendCustomStateEventTool.Component room={room} onBack={onBack} defaultEventType={eventType} />
                    )}
                    onBack={onBack}
                    renderTarget={(stateKey, onBack) => {
                        const ev = room.currentState.getStateEvents(eventType, stateKey);
                        if (editing) return getEditComponent(room, ev, onBack);
                        return <ViewSource mxEvent={ev} onBack={onBack} onEdit={() => setEditing(ev)} />;
                    }}
                />;
            }}
        />;
    },
};

const PHASE_MAP = {
    [PHASE_UNSENT]: "unsent",
    [PHASE_REQUESTED]: "requested",
    [PHASE_READY]: "ready",
    [PHASE_DONE]: "done",
    [PHASE_STARTED]: "started",
    [PHASE_CANCELLED]: "cancelled",
};

const VerificationRequestExplorer: React.FC<{
    txnId: string;
    request: VerificationRequest;
}> = ({ txnId, request }) => {
    const [, updateState] = useState();
    const [timeout, setRequestTimeout] = useState(request.timeout);

    /* Re-render if something changes state */
    useEventEmitter(request, "change", updateState);

    /* Keep re-rendering if there's a timeout */
    useEffect(() => {
        if (request.timeout === 0) return;

        /* Note that request.timeout is a getter, so its value changes */
        const id = setInterval(() => {
            setRequestTimeout(request.timeout);
        }, 500);

        return () => { clearInterval(id); };
    }, [request]);

    return <div className="mx_Devtools_VerificationRequest">
        <dl>
            <dt>{ _t("Transaction") }</dt>
            <dd>{ txnId }</dd>
            <dt>{ _t("Phase") }</dt>
            <dd>{ PHASE_MAP[request.phase] || request.phase }</dd>
            <dt>{ _t("Timeout") }</dt>
            <dd>{ Math.floor(timeout / 1000) }</dd>
            <dt>{ _t("Methods") }</dt>
            <dd>{ request.methods && request.methods.join(", ") }</dd>
            <dt>{ _t("Requesting User ID") }</dt>
            <dd>{ request.requestingUserId }</dd>
            <dt>{ _t("Observe Only") }</dt>
            <dd>{ JSON.stringify(request.observeOnly) }</dd>
        </dl>
    </div>;
};

const VerificationRequestExplorerTool: IDevtool = {
    label: _td("Verification requests"),
    Component: ({ room, onBack }: IDevtoolProps) => {
        const cli = room.client;
        const inRoomChannel = cli.crypto.inRoomVerificationRequests;
        const [requests, setRequests] = useState(inRoomChannel._requestsByRoomId?.get(room.roomId) || new Map());
        useEventEmitter(cli, "crypto.verification.request", () => {
            setRequests(inRoomChannel._requestsByRoomId?.get(room.roomId) || new Map());
        });

        return <div>
            <div className="mx_Dialog_content">
                { Array.from(requests.entries()).reverse().map(([txnId, request]) =>
                    <VerificationRequestExplorer txnId={txnId} request={request} key={txnId} />,
                ) }
            </div>
            <div className="mx_Dialog_buttons">
                <button onClick={() => onBack()}>{_t("Back")}</button>
            </div>
        </div>;
    },
};

const ActiveWidgetsExplorerTool: IDevtool = {
    label: _td("Active widgets explorer"),
    Component: ({ room, onBack }: IDevtoolProps) => {
        const [editing, setEditing] = useState<MatrixEvent>(undefined);

        const [widgets, setWidgets] = useState(WidgetStore.instance.getApps(room.roomId));
        useEventEmitter(WidgetStore.instance, UPDATE_EVENT, (roomId: string) => {
            if (room.roomId !== roomId) return;
            setWidgets(WidgetStore.instance.getApps(room.roomId));
        });
        const widgetMap = useMemo(() => new Map(widgets.map(w => [w.id, w])), [widgets]);

        return <GenericExplore
            keys={widgetMap.keys()}
            onBack={onBack}
            renderTarget={(widgetId, onBack) => {
                const app = widgetMap.get(widgetId);
                const ev = Array.from(room.currentState.events.values())
                    .map(m => Array.from(m.values()))
                    .flat()
                    .find(ev => ev.getId() === app.eventId);
                if (editing) return getEditComponent(room, ev, onBack);
                return <ViewSource mxEvent={ev} onBack={onBack} onEdit={() => setEditing(ev)} />;
            }}
        />;
    },
};

const SendRoomAccountDataEventTool: IDevtool<ISendCustomEventProps> = {
    label: _td("Send room account data"),
    Component: ({ room, onBack, defaultEventType, defaultContent }: ISendCustomEventProps) => {
        const onSend = (eventType: string, content: string) => {
            return room.client.setRoomAccountData(room.roomId, eventType, content);
        };

        return <GenericEditor
            onSend={onSend}
            onBack={onBack}
            defaultEventType={defaultEventType}
            defaultContent={defaultContent}
        />;
    },
};

const ExploreRoomAccountDataTool: IDevtool = {
    label: _td("Explore room account data"),
    Component: ({ room, onBack }: IDevtoolProps) => {
        const [editing, setEditing] = useState<MatrixEvent>(undefined);
        const accountData = room.accountData;

        return <GenericExplore
            keys={Object.keys(accountData)}
            onBack={onBack}
            renderCreateNew={onBack => <SendCustomStateEventTool.Component room={room} onBack={onBack} />}
            renderTarget={(eventType, onBack) => {
                const ev = accountData[eventType];
                if (editing) {
                    return <SendRoomAccountDataEventTool.Component
                        room={room}
                        onBack={onBack}
                        defaultEventType={ev.getType()}
                        defaultContent={JSON.stringify(ev.getContent())}
                    />;
                }
                return <ViewSource mxEvent={ev} onBack={onBack} onEdit={() => setEditing(ev)} />;
            }}
        />;
    },
};

const RoomCategory: ICategory = {
    label: _td("Rooms"),
    tools: [
        SendTimelineEventTool,
        ExploreRoomStateTool,
        ServersInRoomListTool,
        ExploreRoomAccountDataTool,
        VerificationRequestExplorerTool,
        ActiveWidgetsExplorerTool,
    ],
};

export default RoomCategory;
