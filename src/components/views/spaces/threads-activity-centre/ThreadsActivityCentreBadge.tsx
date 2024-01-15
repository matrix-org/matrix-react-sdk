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

import React, { JSX } from "react";
import classNames from "classnames";

interface ThreadsActivityCentreBadgeProps {
    /**
     * The state of the badge.
     */
    state: "normal" | "highlight" | "alert";
}

/**
 * A badge to show the unread state of the room in the ThreadsActivityCentre.
 */
export function ThreadsActivityCentreBadge({ state }: ThreadsActivityCentreBadgeProps): JSX.Element {
    const className = classNames("mx_ThreadsActivityCentreBadge", {
        mx_ThreadsActivityCentreBadge_highlight: state === "highlight",
        mx_ThreadsActivityCentreBadge_alert: state === "alert",
    });

    return <div className={className} />;
}
