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
import React from 'react';
import { sleep } from 'matrix-js-sdk/src/utils';
import { act } from 'react-dom/test-utils';
import { MSC3906Rendezvous } from 'matrix-js-sdk/src/rendezvous';

import LoginWithQR, { Mode } from '../../../../../src/components/views/auth/LoginWithQR';
import type { MatrixClient } from 'matrix-js-sdk/src/matrix';
import type { SAS } from 'matrix-js-sdk/src/crypto/verification/SAS';
import SdkConfig from '../../../../../src/SdkConfig';

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
        doesServerSupportUnstableFeature: jest.fn().mockReturnValue(true),
        removeListener: jest.fn(),
        currentState: {
            on: jest.fn(),
        },
    } as unknown as MatrixClient);
}

describe('<LoginWithQR />', () => {
    const client = makeClient();
    const defaultProps = {
        mode: Mode.Show,
        onFinished: () => {},
    };

    beforeAll(() => {
        global.Olm = {
            SAS: jest.fn().mockImplementation(() => {
                return {
                    get_pubkey: jest.fn().mockReturnValue('mock-public-key'),
                    free: jest.fn(),
                } as unknown as SAS;
            }),
        } as unknown as typeof global.Olm;
    });

    beforeEach(() => {
        SdkConfig.put({
            login_with_qr: {},
        });
    });

    const getComponent = (props: { client: MatrixClient }) =>
        (<LoginWithQR {...defaultProps} {...props} />);

    it('no support', async () => {
        const { container } = render(getComponent({ client }));
        await act(async () => {
            await sleep(1000);
        });
        expect(container).toMatchSnapshot();
    });

    it('device connected', async () => {
        SdkConfig.put({
            login_with_qr: {
                reciprocate: {
                    enable_showing: true,
                },
                fallback_http_transport_server: 'https://rzserver',
            },
        });

        jest.spyOn(MSC3906Rendezvous.prototype, 'generateCode').mockImplementation(
            async function(this: MSC3906Rendezvous) {
                this.code = 'mock-code';
            },
        );

        jest.spyOn(MSC3906Rendezvous.prototype, 'startAfterShowingCode').mockImplementation(async function() {
            return '1234-4567-7890';
        });

        const { container } = render(getComponent({ client }));
        expect(container).toMatchSnapshot();
    });
});
