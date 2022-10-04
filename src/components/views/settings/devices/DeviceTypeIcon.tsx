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

import React from 'react';
import classNames from 'classnames';

import { Icon as UnknownDeviceIcon } from '../../../../../res/img/element-icons/settings/unknown-device.svg';
import { Icon as VerifiedIcon } from '../../../../../res/img/e2e/verified.svg';
import { Icon as UnverifiedIcon } from '../../../../../res/img/e2e/warning.svg';
import { _t } from '../../../../languageHandler';
import { ExtendedDevice } from './types';
import { DeviceType } from '../../../../utils/device/parseUserAgent';

interface Props {
    isVerified?: ExtendedDevice['isVerified'];
    isSelected?: boolean;
    deviceType?: DeviceType;
}

export const DeviceTypeIcon: React.FC<Props> = ({
    isVerified,
    isSelected,
    deviceType,
}) => (
    <div className={classNames('mx_DeviceTypeIcon', {
        mx_DeviceTypeIcon_selected: isSelected,
    })}
    >
        { /* TODO(kerrya) all devices have an unknown type until PSG-650 */ }
        <UnknownDeviceIcon
            className='mx_DeviceTypeIcon_deviceIcon'
            role='img'
            aria-label={_t('Unknown device type')}
        />
        {
            isVerified
                ? <VerifiedIcon
                    className={classNames('mx_DeviceTypeIcon_verificationIcon', 'verified')}
                    role='img'
                    aria-label={_t('Verified')}
                />
                : <UnverifiedIcon
                    className={classNames('mx_DeviceTypeIcon_verificationIcon', 'unverified')}
                    role='img'
                    aria-label={_t('Unverified')}
                />
        }
    </div>);

