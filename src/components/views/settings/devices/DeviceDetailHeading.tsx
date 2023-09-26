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

import React, { useEffect, useState } from "react";

import { _t } from "../../../../languageHandler";
import AccessibleButton, { ButtonEvent } from "../../elements/AccessibleButton";
import Field from "../../elements/Field";
import LearnMore from "../../elements/LearnMore";
import Spinner from "../../elements/Spinner";
import { Caption } from "../../typography/Caption";
import Heading from "../../typography/Heading";
import { ExtendedDevice } from "./types";

interface Props {
    device: ExtendedDevice;
    saveDeviceName: (deviceName: string) => Promise<void>;
}

const DeviceNameEditor: React.FC<Props & { stopEditing: () => void }> = ({ device, saveDeviceName, stopEditing }) => {
    const [deviceName, setDeviceName] = useState(device.display_name || "");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setDeviceName(device.display_name || "");
    }, [device.display_name]);

    const onInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => setDeviceName(event.target.value);

    const onSubmit = async (event: ButtonEvent): Promise<void> => {
        setIsLoading(true);
        setError(null);
        event.preventDefault();
        try {
            await saveDeviceName(deviceName);
            stopEditing();
        } catch (error) {
            setError(_t("settings|sessions|error_set_name"));
            setIsLoading(false);
        }
    };

    const headingId = `device-rename-${device.device_id}`;
    const descriptionId = `device-rename-description-${device.device_id}`;

    return (
        <form aria-disabled={isLoading} className="mx_DeviceDetailHeading_renameForm" onSubmit={onSubmit} method="post">
            <p id={headingId} className="mx_DeviceDetailHeading_renameFormHeading">
                {_t("settings|sessions|rename_form_heading")}
            </p>
            <div>
                <Field
                    data-testid="device-rename-input"
                    type="text"
                    value={deviceName}
                    autoComplete="off"
                    onChange={onInputChange}
                    autoFocus
                    disabled={isLoading}
                    aria-labelledby={headingId}
                    aria-describedby={descriptionId}
                    className="mx_DeviceDetailHeading_renameFormInput"
                    maxLength={100}
                />
                <Caption id={descriptionId}>
                    {_t("settings|sessions|rename_form_caption")}
                    <LearnMore
                        title={_t("settings|sessions|rename_form_learn_more")}
                        description={
                            <>
                                <p>{_t("settings|sessions|rename_form_learn_more_description_1")}</p>
                                <p>{_t("settings|sessions|rename_form_learn_more_description_2")}</p>
                            </>
                        }
                    />
                    {!!error && (
                        <span data-testid="device-rename-error" className="mx_DeviceDetailHeading_renameFormError">
                            {error}
                        </span>
                    )}
                </Caption>
            </div>
            <div className="mx_DeviceDetailHeading_renameFormButtons">
                <AccessibleButton
                    onClick={onSubmit}
                    kind="primary"
                    data-testid="device-rename-submit-cta"
                    disabled={isLoading}
                >
                    {_t("action|save")}
                </AccessibleButton>
                <AccessibleButton
                    onClick={stopEditing}
                    kind="secondary"
                    data-testid="device-rename-cancel-cta"
                    disabled={isLoading}
                >
                    {_t("action|cancel")}
                </AccessibleButton>
                {isLoading && <Spinner w={16} h={16} />}
            </div>
        </form>
    );
};

export const DeviceDetailHeading: React.FC<Props> = ({ device, saveDeviceName }) => {
    const [isEditing, setIsEditing] = useState(false);

    return isEditing ? (
        <DeviceNameEditor device={device} saveDeviceName={saveDeviceName} stopEditing={() => setIsEditing(false)} />
    ) : (
        <div className="mx_DeviceDetailHeading" data-testid="device-detail-heading">
            <Heading size="4">{device.display_name || device.device_id}</Heading>
            <AccessibleButton
                kind="link_inline"
                onClick={() => setIsEditing(true)}
                className="mx_DeviceDetailHeading_renameCta"
                data-testid="device-heading-rename-cta"
            >
                {_t("action|rename")}
            </AccessibleButton>
        </div>
    );
};
