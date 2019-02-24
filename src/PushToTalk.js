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

export const id = "pushToTalk";

export function start(keybinding) {
    // In a call, start listening for keys
    const currentPTTState = SettingsStore.getValue(id);
    currentPTTState.isInCall = true;
    SettingsStore.setValue(id, null, SettingLevel.DEVICE, currentPTTState);
    setKeybinding(keybinding);
}

export function stop() {
    const currentPTTState = SettingsStore.getValue(id);
    currentPTTState.isInCall = false;
    SettingsStore.setValue(id, null, SettingLevel.DEVICE, currentPTTState);
    removeKeybinding();
}

export function setKeybinding(keybinding) {
    PlatformPeg.get().addGlobalKeybinding(id, keybinding, () => {
        console.warn("Keybinding pressed")
        const widgetId = ActiveWidgetStore.getPersistentWidgetId();

        // Only try to un/mute if jitsi is onscreen
        if (widgetId === null || widgetId === undefined) {
            return;
        }

        const widgetMessaging = ActiveWidgetStore.getWidgetMessaging(widgetId);

        // Toggle mic if in toggle mode, else just activate mic
        if (SettingsStore.getValue(id).toggle) {
            console.warn("Toggling")
            widgetMessaging.toggleJitsiAudio();
        } else {
            console.warn("normal")
            widgetMessaging.unmuteJitsiAudio();
        }
    }, () => {
        // No release functionality if toggle mode is enabled
        if (SettingsStore.getValue(id).toggle === true) {
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

export function removeKeybinding() {
    const keybinding = SettingsStore.getValue(id).keybinding;
    PlatformPeg.get().removeGlobalKeybinding(id, keybinding);
    PlatformPeg.get().stopListeningKeys();
}
