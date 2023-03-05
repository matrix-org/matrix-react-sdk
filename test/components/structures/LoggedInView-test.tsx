/*
Copyright 2015 - 2023 The Matrix.org Foundation C.I.C.

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

import { render, RenderResult } from "@testing-library/react";
import { MediaHandler } from "matrix-js-sdk/src/webrtc/mediaHandler";
import React, { ReactElement } from "react";
import LoggedInView from "../../../src/components/structures/LoggedInView";
import { SDKContext } from "../../../src/contexts/SDKContext";
import ResizeNotifier from "../../../src/utils/ResizeNotifier";
import { getMockClientWithEventEmitter, mockClientMethodsUser } from "../../test-utils";
import { TestSdkContext } from "../../TestSdkContext";

describe('<LoggedInView />', () => {
    const userId = '@alice:domain.org';
    const mockClient = getMockClientWithEventEmitter({
        ...mockClientMethodsUser(userId),
        getAccountData: jest.fn(),
        getRoom: jest.fn(),
        getSyncState: jest.fn().mockReturnValue(null),
        getSyncStateData: jest.fn().mockReturnValue(null),
        getMediaHandler: jest.fn()
    });
    const mediaHandler = new MediaHandler(mockClient);
    const mockSdkContext = new TestSdkContext();

    const defaultProps = {
        matrixClient: mockClient,
        onRegistered: jest.fn(),
        resizeNotifier: new ResizeNotifier(),
        collapseLhs: false,
        hideToSRUsers: false,
        config: {
            brand: 'Test',
            element_call: {},
        },
        currentRoomId: '',
    }

    const getComponent = (props = {}): RenderResult => render(
        <LoggedInView { ...defaultProps } { ...props } />, 
        {wrapper: ({ children }) => (
            <SDKContext.Provider value={mockSdkContext}>{children}</SDKContext.Provider>
        ),}
    );

    beforeEach(() => {
        mockClient.getMediaHandler.mockReturnValue(mediaHandler);
    })

    it('renders', () => {
        const { container } = getComponent();

        expect(container).toMatchSnapshot();
    });
});