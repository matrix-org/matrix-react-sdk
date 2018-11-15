/*
Copyright 2018 Andrew Morgan

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

import PlatformPeg from './PlatformPeg';
import ActiveWidgetStore from './stores/ActiveWidgetStore';
import SettingsStore from './settings/SettingsStore';

export function enable(keybinding) {
    const id = 'pushToTalk';
    PlatformPeg.get().addGlobalKeybinding(id, keybinding, () => {
        const widgetId = ActiveWidgetStore.getPersistentWidgetId();

        // Only try to un/mute if jitsi is onscreen
        if (widgetId === null || widgetId === undefined) {
            return;
        }

        const widgetMessaging = ActiveWidgetStore.getWidgetMessaging(widgetId);
        widgetMessaging.unmuteJitsiAudio();
    }, () => {
        const widgetId = ActiveWidgetStore.getPersistentWidgetId();

        // Only try to un/mute if jitsi is onscreen
        if (widgetId === null || widgetId === undefined) {
            return;
        }

        const widgetMessaging = ActiveWidgetStore.getWidgetMessaging(widgetId);
        widgetMessaging.muteJitsiAudio();
    });
}

export function disable() {
    const id = 'pushToTalk';
    const keybinding = SettingsStore.getValue(id).keybinding;
    PlatformPeg.get().removeGlobalKeybinding(id, keybinding);
}
