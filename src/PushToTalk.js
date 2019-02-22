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

export const id = "pushToTalk";

export function startListening() {
    console.log("START LISTENING!")
    const keybinding = SettingsStore.getValue(id).keybinding;
    PlatformPeg.get().addGlobalKeybinding(id, keybinding, () => {
        const widgetId = ActiveWidgetStore.getPersistentWidgetId();
        console.log("Key pressed in JS")

        // Only try to un/mute if jitsi is onscreen
        if (widgetId === null || widgetId === undefined) {
            return;
        }

        const widgetMessaging = ActiveWidgetStore.getWidgetMessaging(widgetId);
        widgetMessaging.unmuteJitsiAudio();
    }, () => {
        const widgetId = ActiveWidgetStore.getPersistentWidgetId();
        console.log("Key released in JS")

        // Only try to un/mute if jitsi is onscreen
        if (widgetId === null || widgetId === undefined) {
            return;
        }

        const widgetMessaging = ActiveWidgetStore.getWidgetMessaging(widgetId);
        widgetMessaging.muteJitsiAudio();
    });

    PlatformPeg.get().startListeningKeys();
}

export function stopListening() {
    console.log("STOP LISTENING!")
    PlatformPeg.get().stopListeningKeys();

    const keybinding = SettingsStore.getValue(id).keybinding;
    PlatformPeg.get().removeGlobalKeybinding(id, keybinding);
}

export function setKeybinding(keybinding) {
    const currentPTTState = SettingsStore.getValue(id);
    currentPTTState.keybinding = keybinding;
    SettingsStore.setValue(id, currentPTTState);
}

function setEnabled(enabled: boolean) {
    const currentPTTState = SettingsStore.getValue(id);
    currentPTTState.enabled = enabled;
    SettingsStore.setValue(id, currentPTTState);
}

export function enable() {
    setEnabled(true);
}

export function disable() {
    setEnabled(false);
}
