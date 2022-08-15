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

import { _t } from '../../../../languageHandler';
import AccessibleButton from '../../elements/AccessibleButton';
import Dropdown from '../../elements/Dropdown';
import DeviceSecurityCard from './DeviceSecurityCard';
import DeviceTile from './DeviceTile';
import {
    filterDevicesBySecurityRecommendation,
    INACTIVE_DEVICE_AGE_DAYS,
} from './filter';
import {
    DevicesDictionary,
    DeviceSecurityVariation,
    DeviceWithVerification,
} from './types';

interface Props {
    devices: DevicesDictionary;
    filter?: DeviceSecurityVariation;
    onFilterChange: (filter: DeviceSecurityVariation | undefined) => void;
}

// devices without timestamp metadata should be sorted last
const sortDevicesByLatestActivity = (left: DeviceWithVerification, right: DeviceWithVerification) =>
    (right.last_seen_ts || 0) - (left.last_seen_ts || 0);

const getFilteredSortedDevices = (devices: DevicesDictionary, filter: DeviceSecurityVariation) =>
    filterDevicesBySecurityRecommendation(Object.values(devices), filter ? [filter] : [])
        .sort(sortDevicesByLatestActivity);

const ALL_FILTER_ID = 'ALL';

const FilterSecurityCard: React.FC<{ filter?: DeviceSecurityVariation | string }> = ({ filter }) => {
    switch (filter) {
        case DeviceSecurityVariation.Verified:
            return <div className='mx_FilteredDeviceList_securityCard'>
                <DeviceSecurityCard
                    variation={DeviceSecurityVariation.Verified}
                    heading={_t('Verified sessions')}
                    description={_t(
                        `For best security, sign out from any session` +
                    ` that you don't recognize or use anymore.`,
                    )}
                />
            </div>
            ;
        case DeviceSecurityVariation.Unverified:
            return <div className='mx_FilteredDeviceList_securityCard'>
                <DeviceSecurityCard
                    variation={DeviceSecurityVariation.Unverified}
                    heading={_t('Unverified sessions')}
                    description={_t(
                        `Verify your sessions for enhanced secure messaging or sign out`
                    + ` from those you don't recognize or use anymore.`,
                    )}
                />
            </div>
            ;
        case DeviceSecurityVariation.Inactive:
            return <div className='mx_FilteredDeviceList_securityCard'>
                <DeviceSecurityCard
                    variation={DeviceSecurityVariation.Inactive}
                    heading={_t('Inactive sessions')}
                    description={_t(
                        `Consider signing out from old sessions ` +
                    `(%(inactiveAgeDays)s days or older) you don't use anymore`,
                        { inactiveAgeDays: INACTIVE_DEVICE_AGE_DAYS },
                    )}
                />
            </div>
            ;
        default:
            return null;
    }
};

const getNoResultsMessage = (filter: DeviceSecurityVariation): string => {
    switch (filter) {
        case DeviceSecurityVariation.Verified:
            return _t('No verified sessions found.');
        case DeviceSecurityVariation.Unverified:
            return _t('No unverified sessions found.');
        case DeviceSecurityVariation.Inactive:
            return _t('No inactive sessions found.');
        default:
            return _t('No sessions found.');
    }
};
interface NoResultsProps { filter: DeviceSecurityVariation, clearFilter: () => void}
const NoResults: React.FC<NoResultsProps> = ({ filter, clearFilter }) =>
    <div className='mx_FilteredDeviceList_noResults'>
        { getNoResultsMessage(filter) }
        {
            /* No clear filter button when filter is falsy (ie 'All') */
            !!filter &&
            <>
                &nbsp;
                <AccessibleButton kind='link_inline' onClick={clearFilter}>{ _t('Show all') }</AccessibleButton>
            </>
        }
    </div>;

/**
 * Filtered list of devices
 * Sorted by latest activity descending
 */
const FilteredDeviceList: React.FC<Props> = ({ devices, filter, onFilterChange }) => {
    const sortedDevices = getFilteredSortedDevices(devices, filter);

    const options = [
        { id: ALL_FILTER_ID, label: _t('All') },
        {
            id: DeviceSecurityVariation.Verified,
            label: _t('Verified'),
            description: _t('Ready for secure messaging'),
        },
        {
            id: DeviceSecurityVariation.Unverified,
            label: _t('Unverified'),
            description: _t('Not ready for secure messaging'),
        },
        {
            id: DeviceSecurityVariation.Inactive,
            label: _t('Inactive'),
            description: _t(
                'Inactive for %(inactiveAgeDays)s days or longer',
                { inactiveAgeDays: INACTIVE_DEVICE_AGE_DAYS },
            ),
        },
    ];

    const onFilterOptionChange = (filterId: DeviceSecurityVariation | string) => {
        onFilterChange(filterId === ALL_FILTER_ID ? undefined : filterId as DeviceSecurityVariation);
    };

    return <div>
        <div className='mx_FilteredDeviceList_header'>
            <span className='mx_FilteredDeviceList_headerLabel'>
                { _t('Sessions') }
            </span>
            <Dropdown
                id='device-list-filter'
                label={_t('Show')}
                value={filter || ALL_FILTER_ID}
                onOptionChange={onFilterOptionChange}
            >
                { options.map(({ id, label, description }) =>
                    <div data-test-id={`device-filter-option-${id}`} key={id}>{ label }</div>,
                ) }
            </Dropdown>
        </div>
        { !!sortedDevices.length
            ? <FilterSecurityCard filter={filter} />
            : <NoResults filter={filter} clearFilter={() => onFilterChange(undefined)} />
        }
        <ol className='mx_FilteredDeviceList_list'>
            { sortedDevices.map((device) =>
                <li key={device.device_id}>
                    <DeviceTile
                        device={device}
                    />
                </li>,

            ) }
        </ol>
    </div>
    ;
};

export default FilteredDeviceList;
