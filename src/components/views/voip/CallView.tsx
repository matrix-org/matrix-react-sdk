/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import React, { FC, useState, useContext, useEffect, useCallback, AriaRole } from "react";
import { logger } from "matrix-js-sdk/src/logger";

import type { Room } from "matrix-js-sdk/src/matrix";
import { Call, ConnectionState, ElementCall } from "../../../models/Call";
import { useCall } from "../../../hooks/useCall";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import AppTile from "../elements/AppTile";
import { CallStore } from "../../../stores/CallStore";

interface StartCallViewProps {
    room: Room;
    resizing: boolean;
    call: Call | null;
    setStartingCall: (value: boolean) => void;
    startingCall: boolean;
    skipLobby?: boolean;
    role?: AriaRole;
}

const StartCallView: FC<StartCallViewProps> = ({
    room,
    resizing,
    call,
    setStartingCall,
    startingCall,
    skipLobby,
    role,
}) => {
    const cli = useContext(MatrixClientContext);

    // We need to do this awkward double effect system,
    // because otherwise we will not have subscribed to the CallStore
    // before we create the call which emits the UPDATE_ROOM event.
    useEffect(() => {
        setStartingCall(true);
    }, [setStartingCall]);
    useEffect(() => {
        if (startingCall) {
            ElementCall.create(room, skipLobby);
        }
    }, [room, skipLobby, startingCall]);

    useEffect(() => {
        (async (): Promise<void> => {
            // If the call was successfully started, connect automatically
            if (call !== null) {
                try {
                    // Disconnect from any other active calls first, since we don't yet support holding
                    await Promise.all([...CallStore.instance.activeCalls].map((call) => call.disconnect()));
                    await call.connect();
                } catch (e) {
                    logger.error(e);
                }
            }
        })();
    }, [call]);

    return (
        <div className="mx_CallView">
            {call !== null && (
                <AppTile
                    app={call.widget}
                    room={room}
                    userId={cli.credentials.userId!}
                    creatorUserId={call.widget.creatorUserId}
                    waitForIframeLoad={call.widget.waitForIframeLoad}
                    showMenubar={false}
                    pointerEvents={resizing ? "none" : undefined}
                />
            )}
        </div>
    );
};

interface JoinCallViewProps {
    room: Room;
    resizing: boolean;
    call: Call;
    skipLobby?: boolean;
    role?: AriaRole;
}

const JoinCallView: FC<JoinCallViewProps> = ({ room, resizing, call, skipLobby, role }) => {
    const cli = useContext(MatrixClientContext);

    const connect = useCallback(async (): Promise<void> => {
        // Disconnect from any other active calls first, since we don't yet support holding
        await Promise.all([...CallStore.instance.activeCalls].map((call) => call.disconnect()));
        await call.connect();
    }, [call]);

    // We'll take this opportunity to tidy up our room state
    useEffect(() => {
        call.clean();
    }, [call]);
    useEffect(() => {
        (call.widget.data ?? { skipLobby }).skipLobby = skipLobby;
        if (call.connectionState == ConnectionState.Disconnected) {
            connect();
        }
    }, [call.connectionState, call.widget.data, connect, skipLobby]);

    return (
        <div className="mx_CallView">
            <AppTile
                app={call.widget}
                room={room}
                userId={cli.credentials.userId!}
                creatorUserId={call.widget.creatorUserId}
                waitForIframeLoad={call.widget.waitForIframeLoad}
                showMenubar={false}
                pointerEvents={resizing ? "none" : undefined}
            />
        </div>
    );
};

interface CallViewProps {
    room: Room;
    resizing: boolean;
    /**
     * If true, the view will be blank until a call appears. Otherwise, the join
     * button will create a call if there isn't already one.
     */
    waitForCall: boolean;
    skipLobby?: boolean;
    role?: AriaRole;
}

export const CallView: FC<CallViewProps> = ({ room, resizing, waitForCall, skipLobby, role }) => {
    const call = useCall(room.roomId);
    const [startingCall, setStartingCall] = useState(false);

    if (call === null || startingCall) {
        if (waitForCall) return null;
        return (
            <StartCallView
                room={room}
                resizing={resizing}
                call={call}
                setStartingCall={setStartingCall}
                startingCall={startingCall}
                skipLobby={skipLobby}
                role={role}
            />
        );
    } else {
        return <JoinCallView room={room} resizing={resizing} call={call} skipLobby={skipLobby} role={role} />;
    }
};
