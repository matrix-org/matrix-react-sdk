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

import React, { HTMLProps } from 'react';
import classNames from 'classnames';
import { Beacon } from 'matrix-js-sdk/src/matrix';
import { BeaconLocationState } from 'matrix-js-sdk/src/content-helpers';

import StyledLiveBeaconIcon from './StyledLiveBeaconIcon';
import { _t } from '../../../languageHandler';
import AccessibleButton from '../elements/AccessibleButton';
import LiveTimeRemaining from './LiveTimeRemaining';

interface Props {
    beacon?: Beacon;
    error?: Error;
    isLive?: boolean;
    label?: string;
    latestLocationState?: BeaconLocationState;
    // assumes permission to stop was checked by parent
    stopBeacon?: () => void;
}

enum DisplayStatus {
    Loading = 'Loading',
    Error = 'Error',
    Stopped = 'Stopped',
    Active = 'Active',
}
const getStatus = (
    isLive: boolean,
    latestLocationState?: BeaconLocationState,
    error?: Error): DisplayStatus => {
    if (error) {
        return DisplayStatus.Error;
    }
    if (!isLive) {
        return DisplayStatus.Stopped;
    }

    if (!latestLocationState) {
        return DisplayStatus.Loading;
    }
    if (latestLocationState) {
        return DisplayStatus.Active;
    }
};

const BeaconStatusChin: React.FC<Props & HTMLProps<HTMLDivElement>> =
    ({ beacon, latestLocationState, error, isLive, label, stopBeacon, ...rest }) => {
        const status = getStatus(isLive, latestLocationState, error);
        const isIdle = status === DisplayStatus.Loading || status === DisplayStatus.Stopped;
        return <div
            {...rest}
            className={classNames('mx_BeaconStatusChin', `mx_BeaconStatusChin_${status}`)}
        >
            <StyledLiveBeaconIcon className='mx_BeaconStatusChin_icon' withError={!!error} isIdle={isIdle} />
            { status === DisplayStatus.Loading && <span>{ _t('Loading live location...') }</span> }
            { status === DisplayStatus.Stopped && <span>{ _t('Live location ended') }</span> }

            { /* TODO error */ }

            { status === DisplayStatus.Active && <>
                <div className='mx_BeaconStatusChin_activeDescription'>
                    { label }
                    <LiveTimeRemaining beacon={beacon} />
                </div>
                { stopBeacon && <AccessibleButton
                    kind='link'
                    onClick={stopBeacon}
                    className='mx_BeaconStatusChin_stopButton'
                >{ _t('Stop') }</AccessibleButton>
                }
            </>
            }
        </div>;
    };

export default BeaconStatusChin;
