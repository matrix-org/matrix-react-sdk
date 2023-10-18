/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import { IPreview } from "./IPreview";
import { TagID } from "../models";
import { getSenderName, isSelf, shouldPrefixMessagesIn } from "./utils";
import { _t } from "../../../languageHandler";

export class LegacyCallInviteEventPreview implements IPreview {
    public getTextFor(event: MatrixEvent, tagId?: TagID): string {
        if (shouldPrefixMessagesIn(event.getRoomId()!, tagId)) {
            if (isSelf(event)) {
                return _t("event_preview|m.call.invite|you");
            } else {
                return _t("event_preview|m.call.invite|user", { senderName: getSenderName(event) });
            }
        } else {
            if (isSelf(event)) {
                return _t("event_preview|m.call.invite|dm_send");
            } else {
                return _t("event_preview|m.call.invite|dm_receive", { senderName: getSenderName(event) });
            }
        }
    }
}
