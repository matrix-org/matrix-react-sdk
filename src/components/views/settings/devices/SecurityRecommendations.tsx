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

import React from "react";

import { _t } from "../../../../languageHandler";
import AccessibleButton from "../../elements/AccessibleButton";
import SettingsSubsection from "../shared/SettingsSubsection";
import DeviceSecurityCard from "./DeviceSecurityCard";
import { DeviceSecurityLearnMore } from "./DeviceSecurityLearnMore";
import { filterDevicesBySecurityRecommendation, FilterVariation, INACTIVE_DEVICE_AGE_DAYS } from "./filter";
import { DeviceSecurityVariation, ExtendedDevice, DevicesDictionary } from "./types";

interface Props {
    devices: DevicesDictionary;
    currentDeviceId: ExtendedDevice["device_id"];
    goToFilteredList: (filter: FilterVariation) => void;
}

const SecurityRecommendations: React.FC<Props> = ({ devices, currentDeviceId, goToFilteredList }) => {
    const devicesArray = Object.values<ExtendedDevice>(devices);

    const unverifiedDevicesCount = filterDevicesBySecurityRecommendation(devicesArray, [
        DeviceSecurityVariation.Unverified,
    ])
        // filter out the current device
        // as unverfied warning and actions
        // will be shown in current session section
        .filter((device) => device.device_id !== currentDeviceId).length;
    const inactiveDevicesCount = filterDevicesBySecurityRecommendation(devicesArray, [
        DeviceSecurityVariation.Inactive,
    ]).length;

    if (!(unverifiedDevicesCount | inactiveDevicesCount)) {
        return null;
    }

    const inactiveAgeDays = INACTIVE_DEVICE_AGE_DAYS;

    return (
        <SettingsSubsection
            heading={_t("settings|sessions|security_recommendations")}
            description={_t("settings|sessions|security_recommendations_description")}
            data-testid="security-recommendations-section"
        >
            {!!unverifiedDevicesCount && (
                <DeviceSecurityCard
                    variation={DeviceSecurityVariation.Unverified}
                    heading={_t("settings|sessions|unverified_sessions")}
                    description={
                        <>
                            {_t("settings|sessions|unverified_sessions_list_description")}
                            <DeviceSecurityLearnMore variation={DeviceSecurityVariation.Unverified} />
                        </>
                    }
                >
                    <AccessibleButton
                        kind="link_inline"
                        onClick={() => goToFilteredList(DeviceSecurityVariation.Unverified)}
                        data-testid="unverified-devices-cta"
                    >
                        {_t("action|view_all") + ` (${unverifiedDevicesCount})`}
                    </AccessibleButton>
                </DeviceSecurityCard>
            )}
            {!!inactiveDevicesCount && (
                <>
                    {!!unverifiedDevicesCount && <div className="mx_SecurityRecommendations_spacing" />}
                    <DeviceSecurityCard
                        variation={DeviceSecurityVariation.Inactive}
                        heading={_t("settings|sessions|inactive_sessions")}
                        description={
                            <>
                                {_t("settings|sessions|inactive_sessions_list_description", { inactiveAgeDays })}
                                <DeviceSecurityLearnMore variation={DeviceSecurityVariation.Inactive} />
                            </>
                        }
                    >
                        <AccessibleButton
                            kind="link_inline"
                            onClick={() => goToFilteredList(DeviceSecurityVariation.Inactive)}
                            data-testid="inactive-devices-cta"
                        >
                            {_t("action|view_all") + ` (${inactiveDevicesCount})`}
                        </AccessibleButton>
                    </DeviceSecurityCard>
                </>
            )}
        </SettingsSubsection>
    );
};

export default SecurityRecommendations;
