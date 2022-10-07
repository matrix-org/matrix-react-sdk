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

import React, { FC, useState, useEffect } from "react";

import type { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { formatCallTime } from "../../../DateUtils";

interface CallDurationProps {
    delta: number;
}

/**
 * A call duration counter.
 */
export const CallDuration: FC<CallDurationProps> = ({ delta }) => {
    // Clock desync could lead to a negative duration, so just hide it if that happens
    if (delta <= 0) return null;
    return <div className="mx_CallDuration">{ formatCallTime(new Date(delta)) }</div>;
};

interface CallDurationFromEventProps {
    mxEvent: MatrixEvent;
}

/**
 * A call duration counter that automatically counts up, given the event that
 * started the call.
 */
export const CallDurationFromEvent: FC<CallDurationFromEventProps> = ({ mxEvent }) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    return <CallDuration delta={now - mxEvent.getTs()} />;
};
