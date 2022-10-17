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

import { render } from '@testing-library/react';
import { mocked } from 'jest-mock';
import { IServerVersions, MatrixClient } from 'matrix-js-sdk/src/matrix';
import React from 'react';

import LoginWithQRSection from '../../../../../src/components/views/settings/devices/LoginWithQRSection';
import { MatrixClientPeg } from '../../../../../src/MatrixClientPeg';
import SdkConfig from '../../../../../src/SdkConfig';
import { SettingLevel } from '../../../../../src/settings/SettingLevel';
import SettingsStore from '../../../../../src/settings/SettingsStore';

function makeClient() {
    return mocked({
        getUser: jest.fn(),
        isGuest: jest.fn().mockReturnValue(false),
        isUserIgnored: jest.fn(),
        isCryptoEnabled: jest.fn(),
        getUserId: jest.fn(),
        on: jest.fn(),
        isSynapseAdministrator: jest.fn().mockResolvedValue(false),
        isRoomEncrypted: jest.fn().mockReturnValue(false),
        mxcUrlToHttp: jest.fn().mockReturnValue('mock-mxcUrlToHttp'),
        removeListener: jest.fn(),
        currentState: {
            on: jest.fn(),
        },
    } as unknown as MatrixClient);
}

function makeVersions(unstableFeatures: Record<string, boolean>): IServerVersions {
    return {
        versions: [],
        unstable_features: unstableFeatures,
    };
}

describe('<LoginWithQRSection />', () => {
    beforeAll(() => {
        jest.spyOn(MatrixClientPeg, 'get').mockReturnValue(makeClient());
    });

    const defaultProps = {
        onShowQr: () => {},
        versions: undefined,
    };

    const getComponent = (props = {}) =>
        (<LoginWithQRSection {...defaultProps} {...props} />);

    describe('should not render', () => {
        it('no support at all', () => {
            const { container } = render(getComponent());
            expect(container).toMatchSnapshot();
        });

        it('only sdk enabled', () => {
            SdkConfig.put({
                login_with_qr: {
                    reciprocate: {
                        enable_showing: true,
                    },
                },
            });
            const { container } = render(getComponent());
            expect(container).toMatchSnapshot();
        });

        it('only sdk + feature enabled', async () => {
            SdkConfig.put({
                login_with_qr: {
                    reciprocate: {
                        enable_showing: true,
                    },
                },
            });
            await SettingsStore.setValue('feature_signin_with_qr_code', null, SettingLevel.DEVICE, true);
            const { container } = render(getComponent());
            expect(container).toMatchSnapshot();
        });

        it('only sdk + feature + MSC3882 enabled', async () => {
            SdkConfig.put({
                login_with_qr: {
                    reciprocate: {
                        enable_showing: true,
                    },
                },
            });
            await SettingsStore.setValue('feature_signin_with_qr_code', null, SettingLevel.DEVICE, true);
            const { container } = render(getComponent({ versions: makeVersions({ 'org.matrix.msc3882': true }) }));
            expect(container).toMatchSnapshot();
        });
    });

    describe('should render panel', () => {
        it('enabled by sdk + feature + MSC3882 + MSC3886', async () => {
            SdkConfig.put({
                login_with_qr: {
                    reciprocate: {
                        enable_showing: true,
                    },
                },
            });
            await SettingsStore.setValue('feature_signin_with_qr_code', null, SettingLevel.DEVICE, true);
            const { container } = render(getComponent({ versions: makeVersions({
                'org.matrix.msc3882': true,
                'org.matrix.msc3886': true,
            }) }));
            expect(container).toMatchSnapshot();
        });

        it('enabled by sdk + feature + MSC3882 + fallback', async () => {
            SdkConfig.put({
                login_with_qr: {
                    reciprocate: {
                        enable_showing: true,
                    },
                    fallback_http_transport_server: 'https://rzserver',
                },
            });
            await SettingsStore.setValue('feature_signin_with_qr_code', null, SettingLevel.DEVICE, true);
            const { container } = render(getComponent({
                versions: makeVersions({
                    'org.matrix.msc3882': true,
                    'org.matrix.msc3886': false,
                }),
            }));
            expect(container).toMatchSnapshot();
        });
    });
});
