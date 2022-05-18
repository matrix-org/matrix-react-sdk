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
import { mount } from 'enzyme';

import { topicToHtml } from '../src/HtmlUtils';
import SettingsStore from '../src/settings/SettingsStore';
import { SettingLevel } from '../src/settings/SettingLevel';

describe('HtmlUtils', () => {
    it('converts plain text topic to HTML', () => {
        const component = mount(<div>{ topicToHtml("pizza", null, null, false) }</div>);
        const wrapper = component.render();
        expect(wrapper.text()).toEqual("pizza");
    });

    it('converts plain text topic with emoji to HTML', () => {
        const component = mount(<div>{ topicToHtml("🍕", null, null, false) }</div>);
        const wrapper = component.render();
        expect(wrapper.find(".mx_Emoji").text()).toEqual("🍕");
    });

    it('converts HTML topic to HTML', async () => {
        await SettingsStore.setValue("feature_html_topic", null, SettingLevel.DEVICE, true);
        const component = mount(<div>{ topicToHtml("**pizza**", "<b>pizza</b>", null, false) }</div>);
        const wrapper = component.render();
        expect(wrapper.find("b").text()).toEqual("pizza");
    });

    it('converts HTML topic with emoji to HTML', async () => {
        await SettingsStore.setValue("feature_html_topic", null, SettingLevel.DEVICE, true);
        const component = mount(<div>{ topicToHtml("**pizza** 🍕", "<b>pizza</b> 🍕", null, false) }</div>);
        const wrapper = component.render();
        expect(wrapper.find("b").text()).toEqual("pizza");
        expect(wrapper.find(".mx_Emoji").text()).toEqual("🍕");
    });
});
