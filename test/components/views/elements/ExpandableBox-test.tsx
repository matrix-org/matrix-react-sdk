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

import React from "react";
// eslint-disable-next-line deprecate/import
import { mount } from 'enzyme';

import ExpandableBox from "../../../../src/components/views/elements/ExpandableBox";
import { mockPlatformPeg, unmockPlatformPeg } from '../../../test-utils';

describe('<ExpandableBox />', () => {
    const defaultProps = {
        body: "Here is a bit of text.",
        className: '',
        lines: 3,
    };

    const getComponent = (props = {}) =>
        mount(<ExpandableBox {...defaultProps} {...props} />);

    beforeEach(() => {
        mockPlatformPeg();
    });

    afterAll(() => {
        unmockPlatformPeg();
    });


    it('renders at all', () => {
        const component = getComponent();
        expect(component).toMatchSnapshot();
    });

    it('renders no button if not overflowing', () => {
        const component = getComponent();
        expect(component.find('.mx_RoomSummaryCard_infoTopic_toggle').exists).toBeTruthy();
    });

    // TODO: Somehow restrict the width of the component to get the ToggleButton to render
    // and then test it.
});
