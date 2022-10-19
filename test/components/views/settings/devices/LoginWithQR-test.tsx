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

import { render, screen, waitFor } from '@testing-library/react';
import { mocked } from 'jest-mock';
import React from 'react';

import LoginWithQR, { Mode } from '../../../../../src/components/views/auth/LoginWithQR';
import type { MatrixClient } from 'matrix-js-sdk/src/matrix';

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

    const getComponent = (props: { client: MatrixClient }) =>
        (<LoginWithQR {...defaultProps} {...props} />);

    it('no content in case of no support', async () => {
        const { container } = render(getComponent({ client }));
        await waitFor(() => screen.getAllByTestId('cancellation-message').length === 1);
        expect(container).toMatchSnapshot();
    });
});
