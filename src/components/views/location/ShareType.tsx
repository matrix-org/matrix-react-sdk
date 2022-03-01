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

import React, { HTMLAttributes, useContext } from 'react';

import MatrixClientContext from '../../../contexts/MatrixClientContext';
import { _t } from '../../../languageHandler';
import { OwnProfileStore } from '../../../stores/OwnProfileStore';
import { getUserNameColorClass } from '../../../utils/FormattingUtils';
import BaseAvatar from '../avatars/BaseAvatar';
import Heading from '../typography/Heading';

const UserAvatar = () => {
    const matrixClient = useContext(MatrixClientContext);
    const userId = matrixClient.getUserId();
    const displayName = OwnProfileStore.instance.displayName;
    // 40 - 2px border
    const avatarSize = 36;
    const avatarUrl = OwnProfileStore.instance.getHttpAvatarUrl(avatarSize);
    const colorClass = getUserNameColorClass(userId);

    return <div className={`mx_ShareType_option-icon ${LocationShareType.Own} ${colorClass}`}>
        <BaseAvatar
            idName={userId}
            name={displayName}
            url={avatarUrl}
            width={avatarSize}
            height={avatarSize}
            resizeMethod="crop"
            className="mx_UserMenu_userAvatar_BaseAvatar"
        /></div>;
};

const LocationPinIcon = () => <div className={`mx_ShareType_option-icon ${LocationShareType.Pin}`} />;

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

    { shareType === LocationShareType.Own && <UserAvatar /> }
    { shareType === LocationShareType.Pin && <LocationPinIcon /> }

    { label }
</button>;

interface Props {
    setShareType: (shareType: LocationShareType) => void;
    enabledShareTypes: LocationShareType[];
}
const ShareType: React.FC<Props> = ({
    setShareType, enabledShareTypes,
}) => {
    const labels = {
        [LocationShareType.Own]: _t('My current location'),
        [LocationShareType.Live]: _t('My live location'),
        [LocationShareType.Pin]: _t('Drop a Pin'),
    };
    return <div className='mx_ShareType'>
        <div className='mx_ShareType_badge' />
        <Heading className='mx_ShareType_heading' size='h3'>{ _t("What location type do you want to share?") }</Heading>
        { enabledShareTypes.map((type) =>
            <ShareTypeOption
                key={type}
                onClick={() => setShareType(type)}
                label={labels[type]}
                shareType={type}
                data-test-id={`share-location-option-${type}`}
            />,
        ) }
    </div>;
};

export default ShareType;
