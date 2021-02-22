/*
 * Copyright 2021 The Matrix.org Foundation C.I.C.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { CommonLevels, ISetting } from "./ISetting";
import { _td } from "../../languageHandler";

export class BuiltInSettings {
    public static readonly ["feature_latex_maths"]: ISetting<boolean> = {
        default: false,
        displayName: _td("Render LaTeX maths in messages"),
        levels: CommonLevels.LabsFeature,
    };
    public static readonly ["feature_communities_v2_prototypes"]: ISetting<boolean> = {
        default: false,
        displayName: _td(
            "Communities v2 prototypes. Requires compatible homeserver. " +
            "Highly experimental - use with caution.",
        ),
        levels: CommonLevels.LabsFeature,
    };
    public static readonly ["feature_new_spinner"]: ISetting<boolean> = {
        default: false,
        displayName: _td("New spinner design"),
        levels: CommonLevels.LabsFeature,
    };
    public static readonly ["feature_pinning"]: ISetting<boolean> = {
        default: false,
        displayName: _td("Message Pinning"),
        levels: CommonLevels.LabsFeature,
    };
    public static readonly ["feature_custom_status"]: ISetting<boolean> = {
        default: false,
        displayName: _td("Custom user status messages"),
        levels: CommonLevels.LabsFeature,
    };
    public static readonly ["feature_custom_tags"]: ISetting<boolean> = {
        default: false,
        displayName: _td("Group & filter rooms by custom tags (refresh to apply changes)"),
        levels: CommonLevels.LabsFeature,
    };
    public static readonly ["feature_state_counters"]: ISetting<boolean> = {
        default: false,
        displayName: _td("Render simple counters in room header"),
        levels: CommonLevels.LabsFeature,
    };
    public static readonly ["feature_many_integration_managers"]: ISetting<boolean> = {
        default: false,
        displayName: _td("Multiple integration managers"),
        levels: CommonLevels.LabsFeature,
    };
    public static readonly ["feature_mjolnir"]: ISetting<boolean> = {
        default: false,
        displayName: _td("Try out new ways to ignore people (experimental)"),
        levels: CommonLevels.LabsFeature,
    };
    public static readonly ["feature_custom_themes"]: ISetting<boolean> = {
        default: false,
        displayName: _td("Support adding custom themes"),
        levels: CommonLevels.LabsFeature,
    };
    public static readonly ["feature_roomlist_preview_reactions_dms"]: ISetting<boolean> = {
        default: false,
        displayName: _td("Show message previews for reactions in DMs"),
        levels: CommonLevels.LabsFeature,
    };
    public static readonly ["feature_roomlist_preview_reactions_all"]: ISetting<boolean> = {
        default: false,
        displayName: _td("Show message previews for reactions in all rooms"),
        levels: CommonLevels.LabsFeature,
    };
    public static readonly ["feature_dehydration"]: ISetting<boolean> = {
        default: false,
        displayName: _td("Offline encrypted messaging using dehydrated devices"),
        levels: CommonLevels.LabsFeature,
    };

    protected constructor() {
        // readonly class
    }
}
