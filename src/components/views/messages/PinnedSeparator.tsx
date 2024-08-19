/*
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
 */

import React, { JSX } from "react";

import { _t } from "../../../languageHandler";

/**
 * A separator to be displayed between pinned messages and the rest of the timeline.
 */
export function PinnedSeparator(): JSX.Element {
    return (
        <div className="mx_PinnedSeparator" role="separator" aria-label={_t("timeline|pinned_separator_description")}>
            {_t("timeline|pinned_separator")}
        </div>
    );
}
