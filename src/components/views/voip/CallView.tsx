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

import React, { FC, useContext, useEffect, AriaRole, useState } from "react";

import type { Room } from "matrix-js-sdk/src/matrix";
import { Call, ConnectionState, ElementCall } from "../../../models/Call";
import { useCall } from "../../../hooks/useCall";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import AppTile from "../elements/AppTile";

interface JoinCallViewProps {
    room: Room;
    resizing: boolean;
    call: Call;
    skipLobby?: boolean;
    role?: AriaRole;
}

const JoinCallView: FC<JoinCallViewProps> = ({ room, resizing, call, skipLobby, role }) => {
    const cli = useContext(MatrixClientContext);

    // We'll take this opportunity to tidy up our room state
    useEffect(() => {
        call.clean();
    }, [call]);
    useEffect(() => {
        (call.widget.data ?? { skipLobby }).skipLobby = skipLobby;
    }, [call.widget.data, skipLobby]);

    useEffect(() => {
        if (call.connectionState === ConnectionState.Disconnected) {
            // immediately connect (this will start the lobby view in the widget)
            call.connect();
        }
        return (): void => {
            // If we are connected the widget is sticky and we do not want to destroy the call.
            if (!call.connected) call.destroy();
        };
    }, [call]);

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
    const [shouldCreateCall, setShouldCreateCall] = useState(false);
    useEffect(() => {
        if (!waitForCall) {
            setShouldCreateCall(true);
        }
    }, [waitForCall]);
    useEffect(() => {
        if (call === null && shouldCreateCall) {
            ElementCall.create(room, skipLobby);
        }
    }, [call, room, shouldCreateCall, skipLobby, waitForCall]);
    if (call === null) {
        return null;
    } else {
        return <JoinCallView room={room} resizing={resizing} call={call} skipLobby={skipLobby} role={role} />;
    }
    // }
};
