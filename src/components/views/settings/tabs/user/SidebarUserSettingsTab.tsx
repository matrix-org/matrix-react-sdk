/*
Copyright 2021 - 2022 The Matrix.org Foundation C.I.C.

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

import React, { ChangeEvent } from 'react';

import { _t } from "../../../../../languageHandler";
import SettingsStore from "../../../../../settings/SettingsStore";
import { SettingLevel } from "../../../../../settings/SettingLevel";
import StyledCheckbox from "../../../elements/StyledCheckbox";
import { useSettingValue } from "../../../../../hooks/useSettings";
import { MetaSpace } from "../../../../../stores/spaces";
import PosthogTrackers from "../../../../../PosthogTrackers";

type InteractionName = "WebSettingsSidebarTabSpacesCheckbox" | "WebQuickSettingsPinToSidebarCheckbox";

export const onMetaSpaceChangeFactory = (
    metaSpace: MetaSpace,
    interactionName: InteractionName,
) => (e: ChangeEvent<HTMLInputElement>) => {
    const currentValue = SettingsStore.getValue("Spaces.enabledMetaSpaces");
    SettingsStore.setValue("Spaces.enabledMetaSpaces", null, SettingLevel.ACCOUNT, {
        ...currentValue,
        [metaSpace]: e.target.checked,
    });

    PosthogTrackers.trackInteraction(
        interactionName,
        e,
        [MetaSpace.Home, null, MetaSpace.Favourites, MetaSpace.People, MetaSpace.Orphans].indexOf(metaSpace),
    );
};

const SidebarUserSettingsTab = () => {
    const {
        [MetaSpace.Home]: homeEnabled,
        [MetaSpace.Favourites]: favouritesEnabled,
        [MetaSpace.People]: peopleEnabled,
        [MetaSpace.Orphans]: orphansEnabled,
    } = useSettingValue<Record<MetaSpace, boolean>>("Spaces.enabledMetaSpaces");
    const allRoomsInHome = useSettingValue<boolean>("Spaces.allRoomsInHome");

    return (
        <div className="mx_SettingsTab mx_SidebarUserSettingsTab">
            <div className="mx_SettingsTab_heading">{ _t("Sidebar") }</div>
            <div className="mx_SettingsTab_section">
                <div className="mx_SettingsTab_subheading">{ _t("Spaces to show") }</div>
                <div className="mx_SettingsTab_subsectionText">
                    { _t("Spaces are ways to group rooms and people. " +
                        "Alongside the spaces you're in, you can use some pre-built ones too.") }
                </div>

                <StyledCheckbox
                    checked={!!homeEnabled}
                    onChange={onMetaSpaceChangeFactory(MetaSpace.Home, "WebSettingsSidebarTabSpacesCheckbox")}
                    className="mx_SidebarUserSettingsTab_homeCheckbox"
                    disabled={homeEnabled}
                >
                    { _t("Home") }
                </StyledCheckbox>
                <div className="mx_SidebarUserSettingsTab_checkboxMicrocopy">
                    { _t("Home is useful for getting an overview of everything.") }
                </div>

                <StyledCheckbox
                    checked={allRoomsInHome}
                    disabled={!homeEnabled}
                    onChange={e => {
                        SettingsStore.setValue(
                            "Spaces.allRoomsInHome",
                            null,
                            SettingLevel.ACCOUNT,
                            e.target.checked,
                        );
                        PosthogTrackers.trackInteraction("WebSettingsSidebarTabSpacesCheckbox", e, 1);
                    }}
                    className="mx_SidebarUserSettingsTab_homeAllRoomsCheckbox"
                >
                    { _t("Show all rooms") }
                </StyledCheckbox>
                <div className="mx_SidebarUserSettingsTab_checkboxMicrocopy">
                    { _t("Show all your rooms in Home, even if they're in a space.") }
                </div>

                <StyledCheckbox
                    checked={!!favouritesEnabled}
                    onChange={onMetaSpaceChangeFactory(MetaSpace.Favourites, "WebSettingsSidebarTabSpacesCheckbox")}
                    className="mx_SidebarUserSettingsTab_favouritesCheckbox"
                >
                    { _t("Favourites") }
                </StyledCheckbox>
                <div className="mx_SidebarUserSettingsTab_checkboxMicrocopy">
                    { _t("Group all your favourite rooms and people in one place.") }
                </div>

                <StyledCheckbox
                    checked={!!peopleEnabled}
                    onChange={onMetaSpaceChangeFactory(MetaSpace.People, "WebSettingsSidebarTabSpacesCheckbox")}
                    className="mx_SidebarUserSettingsTab_peopleCheckbox"
                >
                    { _t("People") }
                </StyledCheckbox>
                <div className="mx_SidebarUserSettingsTab_checkboxMicrocopy">
                    { _t("Group all your people in one place.") }
                </div>

                <StyledCheckbox
                    checked={!!orphansEnabled}
                    onChange={onMetaSpaceChangeFactory(MetaSpace.Orphans, "WebSettingsSidebarTabSpacesCheckbox")}
                    className="mx_SidebarUserSettingsTab_orphansCheckbox"
                >
                    { _t("Rooms outside of a space") }
                </StyledCheckbox>
                <div className="mx_SidebarUserSettingsTab_checkboxMicrocopy">
                    { _t("Group all your rooms that aren't part of a space in one place.") }
                </div>
            </div>
        </div>
    );
};

export default SidebarUserSettingsTab;
