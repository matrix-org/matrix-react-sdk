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

describe('<ExpandableBox />', () => {
    const defaultProps = {
        body: "Here is a bit of text.",
        className: 'mx_Icon_16',
        lines: 3,
    };

    const getComponent = (props = {}) =>
        mount(<ExpandableBox {...defaultProps} {...props} />);

    it('renders at all', () => {
        const component = getComponent();
        expect(component).toMatchSnapshot();
    });

    it('renders no button if not overflowing', () => {
        const component = getComponent();
        expect(component.find('.mx_RoomSummaryCard_infoTopic_toggle').exists()).toBeFalsy();
    });

    it('renders button if overflowing', () => {
        const component = getComponent({ lines: -1 });
        expect(component).toMatchSnapshot();
        expect(component.find('.mx_RoomSummaryCard_infoTopic_toggle').exists()).toBeTruthy();
    });

    it('toggle button toggles style', () => {
        const component = getComponent({ lines: -1 });

        component.find('.mx_RoomSummaryCard_infoTopic_toggle').simulate('click');

        let webkitLineClampfff = (component.find('.mx_RoomSummaryCard_infoTopic_text').getDOMNode<HTMLElement>()
            .style as any).WebkitLineClamp;
        expect(webkitLineClampfff).toEqual("unset");

        component.find('.mx_RoomSummaryCard_infoTopic_toggle').simulate('click');

        webkitLineClampfff = (component.find('.mx_RoomSummaryCard_infoTopic_text').getDOMNode<HTMLElement>()
            .style as any).WebkitLineClamp;
        expect(webkitLineClampfff).toEqual("-1");
    });

    // TODO: Somehow restrict the width of the component to get the ToggleButton to render
    // and then test it.
});
