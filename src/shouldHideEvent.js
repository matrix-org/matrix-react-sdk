/*
 Copyright 2017 Michael Telatynski <7t3chguy@gmail.com>

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

import SettingsStore from "./settings/SettingsStore";

function memberEventDiff(ev) {
    const diff = {
        isMemberEvent: ev.getType() === 'm.room.member',
    };

    // If is not a Member Event then the other checks do not apply, so bail early.
    if (!diff.isMemberEvent) return diff;

    const content = ev.getContent();
    const prevContent = ev.getPrevContent();

    const isMembershipChanged = content.membership !== prevContent.membership;
    diff.isJoin = isMembershipChanged && content.membership === 'join';
    diff.isPart = isMembershipChanged && content.membership === 'leave' && ev.getStateKey() === ev.getSender();

    const isJoinToJoin = !isMembershipChanged && content.membership === 'join';
    diff.isDisplaynameChange = isJoinToJoin && content.displayname !== prevContent.displayname;
    diff.isAvatarChange = isJoinToJoin && content.avatar_url !== prevContent.avatar_url;
    return diff;
}

export default function shouldHideEvent(ev) {
    // Wrap getValue() for readability
    const isEnabled = (name) => SettingsStore.getValue(name, ev.getRoomId());

    // Hide redacted events
    if (isEnabled('hideRedactions') && ev.isRedacted()) return true;

    const eventDiff = memberEventDiff(ev);

    if (eventDiff.isMemberEvent) {
        if (isEnabled('hideJoinLeaves') && (eventDiff.isJoin || eventDiff.isPart)) return true;
        if (isEnabled('hideAvatarChanges') && eventDiff.isAvatarChange) return true;
        if (isEnabled('hideDisplaynameChanges') && eventDiff.isDisplaynameChange) return true;
    }

    return false;
}
