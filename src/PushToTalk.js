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
import SettingsStore, { SettingLevel } from './settings/SettingsStore';

export default class PushToTalk {
    static id = "pushToTalk";

    static start(keybinding) {
        // Call starting, start listening for keys
        const currentPTTState = SettingsStore.getValue(this.id);
        currentPTTState.isInCall = true;
        SettingsStore.setValue(this.id, null, SettingLevel.DEVICE, currentPTTState);
        this.setKeybinding(keybinding);
    }

    static stop() {
        // Call finished, stop listening for keys
        const currentPTTState = SettingsStore.getValue(this.id);
        currentPTTState.isInCall = false;
        SettingsStore.setValue(this.id, null, SettingLevel.DEVICE, currentPTTState);
        this.removeKeybinding();
    }

    static setKeybinding(keybinding) {
        // Add keybinding listener
        PlatformPeg.get().addGlobalKeybinding(this.id, keybinding, () => {
            const widgetId = ActiveWidgetStore.getPersistentWidgetId();

            // Only try to un/mute if jitsi is onscreen
            if (widgetId === null || widgetId === undefined) {
                return;
            }

            const widgetMessaging = ActiveWidgetStore.getWidgetMessaging(widgetId);

            // Toggle mic if in toggle mode, else just activate mic
            if (SettingsStore.getValue(this.id).toggle) {
                widgetMessaging.toggleJitsiAudio();
            } else {
                widgetMessaging.unmuteJitsiAudio();
            }
        }, () => {
            // No release functionality if toggle mode is enabled
            if (SettingsStore.getValue(this.id).toggle === true) {
                return;
            }

            const widgetId = ActiveWidgetStore.getPersistentWidgetId();

            // Only try to un/mute if jitsi is onscreen
            if (widgetId === null || widgetId === undefined) {
                return;
            }

            const widgetMessaging = ActiveWidgetStore.getWidgetMessaging(widgetId);
            widgetMessaging.muteJitsiAudio();
        });
        PlatformPeg.get().startListeningKeys();
    }

    static removeKeybinding() {
        // Remove keybinding listener
        const keybinding = SettingsStore.getValue(this.id).keybinding;
        PlatformPeg.get().removeGlobalKeybinding(this.id, keybinding);
        PlatformPeg.get().stopListeningKeys();
    }
}
