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

import { MatrixEvent } from "matrix-js-sdk/src/matrix";

import { _t } from "../../languageHandler";
import { MatrixClientPeg } from "../../MatrixClientPeg";
import { getSenderName } from "../../utils/event/getSenderName";

export const textForVoiceBroadcastStoppedEventWithoutLink = (event: MatrixEvent): string => {
    const ownUserId = MatrixClientPeg.get()?.getUserId();

    if (ownUserId && ownUserId === event.getSender()) {
        return _t("event_preview|io.element.voice_broadcast_info|you", {});
    }

    return _t("event_preview|io.element.voice_broadcast_info|user", { senderName: getSenderName(event) });
};
