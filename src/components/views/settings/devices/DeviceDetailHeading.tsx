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

import React, { useEffect, useState } from 'react';

import { _t } from '../../../../languageHandler';
import AccessibleButton from '../../elements/AccessibleButton';
import Field from '../../elements/Field';
import Heading from '../../typography/Heading';
import { DeviceWithVerification } from './types';

interface Props {
    device: DeviceWithVerification;
    isLoading: boolean;
    saveDeviceName: (deviceName: string) => void;
}

const DeviceNameEditor: React.FC<Props & { stopEditing: () => void }> = ({
    device, isLoading, saveDeviceName, stopEditing,
}) => {
    const [deviceName, setDeviceName] = useState(device.display_name || '');

    useEffect(() => {
        setDeviceName(device.display_name);
    }, [device]);

    const onInputChange = (event: React.ChangeEvent<HTMLInputElement>): void =>
        setDeviceName(event.target.value);

    const onSubmit = () => saveDeviceName(deviceName);

    return <form
        aria-disabled={isLoading}
        className="mx_DeviceDetailHeading_renameForm"
        onSubmit={onSubmit}>
        <Field
            data-testid='device-rename-input'
            type="text"
            value={deviceName}
            autoComplete="off"
            onChange={onInputChange}
            autoFocus
            disabled={isLoading}
        />
        <AccessibleButton
            onClick={onSubmit}
            kind="confirm"
            data-testid='device-rename-submit-cta'
            disabled={isLoading}
        >{ _t('Save') }</AccessibleButton>
        <AccessibleButton
            onClick={stopEditing}
            kind="cancel"
            data-testid='device-rename-cancel-cta'
            disabled={isLoading}
        >{ _t('Cancel') }</AccessibleButton>
    </form>;
};

export const DeviceDetailHeading: React.FC<Props> = ({
    device, isLoading, saveDeviceName,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    return isEditing
        ? <DeviceNameEditor
            device={device}
            isLoading={isLoading}
            saveDeviceName={saveDeviceName}
            stopEditing={() => setIsEditing(false)}
        />
        : <div className='mx_DeviceDetailHeading'>
            <Heading size='h3'>{ device.display_name ?? device.device_id }</Heading>
            <AccessibleButton
                kind='link_inline'
                onClick={() => setIsEditing(true)}
                className='mx_DeviceDetailHeading_renameCta'
                data-testid='device-heading-rename-cta'
            >
                { _t('Rename') }
            </AccessibleButton>
        </div>;
};
