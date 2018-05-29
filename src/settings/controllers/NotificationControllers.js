/*
Copyright 2017 Travis Ralston

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

import SettingController from "./SettingController";
import MatrixClientPeg from '../../MatrixClientPeg';

// XXX: This feels wrong.
import PushProcessor from "matrix-js-sdk/lib/pushprocessor";

function isMasterRuleEnabled() {
    // Return the value of the master push rule as a default
    const processor = new PushProcessor(MatrixClientPeg.get());
    const masterRule = processor.getPushRuleById(".m.rule.master");

    if (!masterRule) {
        console.warn("No master push rule! Notifications are disabled for this user.");
        return false;
    }

    // Why enabled == false means "enabled" is beyond me.
    return !masterRule.enabled;
}

export class NotificationsEnabledController extends SettingController {
    getValueOverride(level, roomId, calculatedValue, calculatedAtLevel) {
        const Notifier = require('../../Notifier'); // avoids cyclical references
        if (!Notifier.isPossible()) return false;

        if (calculatedValue === null || calculatedAtLevel === "default") {
            return isMasterRuleEnabled();
        }

        return calculatedValue;
    }

    onChange(level, roomId, newValue) {
        const Notifier = require('../../Notifier'); // avoids cyclical references

        if (Notifier.supportsDesktopNotifications()) {
            Notifier.setEnabled(newValue);
        }
    }
}

export class NotificationBodyEnabledController extends SettingController {
    getValueOverride(level, roomId, calculatedValue) {
        const Notifier = require('../../Notifier'); // avoids cyclical references
        if (!Notifier.isPossible()) return false;

        if (calculatedValue === null) {
            return isMasterRuleEnabled();
        }

        return calculatedValue;
    }
}

export class AudioNotificationsEnabledController extends SettingController {
    getValueOverride(level, roomId, calculatedValue) {
        const Notifier = require('../../Notifier'); // avoids cyclical references
        if (!Notifier.isPossible()) return false;

        // Note: Audio notifications are *not* enabled by default.
        return calculatedValue;
    }
}
