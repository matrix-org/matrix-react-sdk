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

import {SettingID} from "./Types";
import { AllSettingsMap } from "./AllSettings";

export type SettingsCategory = Record<string, SettingID>;

// Note: None of the categories listed here are typed to be a SettingsCategory. This
// is because TypeScript wipes out our types, which makes the Settings.get() function
// return a union of all types instead of just the specified setting's type, making
// manual casting a requirement. Instead, we use TypeScript's implied interface support
// and hope that the remap() function in AppSettings.ts will error if someone creates
// an invalid setting map.

export const LabsFeatures = {
    Maths: AllSettingsMap.feature_latex_maths,
    CommunitiesV2: AllSettingsMap.feature_communities_v2_prototypes,
    NewSpinner: AllSettingsMap.feature_new_spinner,
    MessagePinning: AllSettingsMap.feature_pinning,
    CustomStatus: AllSettingsMap.feature_custom_status,
    CustomTags: AllSettingsMap.feature_custom_tags,
    StateCounters: AllSettingsMap.feature_state_counters,
    ManyIntegManagers: AllSettingsMap.feature_many_integration_managers,
    Mjolnir: AllSettingsMap.feature_mjolnir,
    CustomThemes: AllSettingsMap.feature_custom_themes,
    PreviewReactionsDMs: AllSettingsMap.feature_roomlist_preview_reactions_dms,
    PreviewReactionsAll: AllSettingsMap.feature_roomlist_preview_reactions_all,
    Dehydration: AllSettingsMap.feature_dehydration,
};
