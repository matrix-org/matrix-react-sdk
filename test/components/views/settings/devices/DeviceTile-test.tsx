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
import { render } from '@testing-library/react';
import { IMyDevice } from 'matrix-js-sdk/src/matrix';

import DeviceTile from '../../../../../src/components/views/settings/devices/DeviceTile';

describe('<DeviceTile />', () => {
    const defaultProps = {
        device: {
            device_id: '123',
        },
    };
    const getComponent = (props = {}) => (
        <DeviceTile {...defaultProps} {...props} />
    );
    // 14.03.2022 16:15
    const now = 1647270879403;
    const RealDate = global.Date;
    class MockDate extends Date {
        constructor(date?: any) {
            super(date || now);
        }

        now() {
            return now;
        }
    }

    beforeEach(() => {
        // @ts-ignore need Date constructor and now()
        // to be equally mocked
        global.Date = MockDate;
    });
    
    afterAll(() => {
        global.Date = RealDate;
    });

    it('renders a device with no metadata', () => {
        const { container } = render(getComponent());
        expect(container).toMatchSnapshot();
    });

    it('renders display name with a tooltip', () => {
        const device: IMyDevice = {
            device_id: '123',
            display_name: 'My device',
        };
        const { container } = render(getComponent({ device }));
        expect(container).toMatchSnapshot();
    });

    it('renders last seen ip metadata', () => {
        const device: IMyDevice = {
            device_id: '123',
            display_name: 'My device',
            last_seen_ip: '1.2.3.4',
        };
        const { getByTestId } = render(getComponent({ device }));
        expect(getByTestId('device-metadata-lastSeenIp').textContent).toEqual(device.last_seen_ip);
    });

    it('separates metadata with a dot', () => {
        const device: IMyDevice = {
            device_id: '123',
            last_seen_ip: '1.2.3.4',
            last_seen_ts: now - 60000,
        };
        const { container } = render(getComponent({ device }));
        expect(container).toMatchSnapshot();
    });

    describe('Last activity', () => {
        const MS_DAY = 24 * 60 * 60 * 1000;
        fit('renders with short date format when last activity is less than 6 days ago', () => {
            const device: IMyDevice = {
                device_id: '123',
                last_seen_ip: '1.2.3.4',
                last_seen_ts: now - (MS_DAY * 3),
            };
            const { getByTestId } = render(getComponent({ device }));
            expect(getByTestId('device-metadata-lastActivity').textContent).toEqual('Last activity Mar 11');
        });
    });
});
