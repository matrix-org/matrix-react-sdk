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

import React, { HTMLAttributes } from 'react';

import { _t } from '../../../languageHandler';
import Heading from '../typography/Heading';

// TODO this will be defined somewhere better
export enum LocationShareType {
    Own = 'Own',
    Pin = 'Pin',
    Live = 'Live'
}
type ShareTypeOptionProps = HTMLAttributes<HTMLButtonElement> & { label: string, shareType: LocationShareType };
const ShareTypeOption: React.FC<ShareTypeOptionProps> = ({
    onClick, label, shareType, ...rest
}) => <button
    className='mx_ShareType_option'
    onClick={onClick}
    // not yet implemented
    disabled={shareType !== LocationShareType.Own}
    {...rest}>
        <div className="mx_ShareType_option-icon" />
        {label}
    </button>;

interface Props {
    setShareType: (shareType: LocationShareType) => void;
    enabledShareTypes: LocationShareType[];
}
const ShareType: React.FC<Props> = ({
    setShareType, enabledShareTypes
}) => {
    const labels = {
        [LocationShareType.Own]: _t('My current location'),
        [LocationShareType.Live]: _t('My live location'),
        [LocationShareType.Pin]: _t('Drop a Pin'),
    }
    return <div className='mx_ShareType'>
        <div className='mx_ShareType_badge'>
            <img aria-hidden alt='location icon' src={require("../../../../res/img/location/pointer.svg")} height={25} />
        </div>
        <Heading className='mx_ShareType_heading' size='h3'>{_t("What location type do you want to share?")}</Heading>
        {enabledShareTypes.map((type, index) =>
            <ShareTypeOption
                key={type}
                onClick={() => setShareType(type)}
                label={labels[type]}
                shareType={type}
                data-test-id={`share-location-option-${type}`}
            />
        )}
    </div>;
};

export default ShareType;
