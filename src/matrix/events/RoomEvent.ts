/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import {MHtml, MText} from "./schema/text";
import {EventContent, PartialEvent} from "./schema/event";
import {Optional} from "../../@types/common";
import {TextNode} from "./nodes/TextNode";
import {EventType} from "matrix-js-sdk/lib/@types/event";

export class RoomEvent {
    private constructor(private content: EventContent, public readonly type: string) {
    }

    public get canRender(): boolean {
        // TODO: @TR Detect this better?
        return !!this.textNode;
    }

    public get redactedOrUnknown(): boolean {
        return !this.canRender;
    }

    public get textNode(): Optional<TextNode> {
        return TextNode.fromContent(this.content);
    }

    public static fromRaw(json: PartialEvent): Optional<RoomEvent> {
        // We sanity check the input even with types because we just don't trust it
        const content = json?.content ?? {};
        const type = json?.type;
        if (!type) return null;

        if (type === EventType.RoomMessage) {
            // TODO: @@TR Check & interpret msgtype
            const fallback = {
                [MText.name]: content['body'],
                [MHtml.name]: content['format'] === 'org.matrix.custom.html' ? content['formatted_body'] : null,
            };

            // We apply the fallback first so that the real event content can specify real values
            return new RoomEvent(Object.assign({}, fallback, content), type);
        } else {
            return new RoomEvent(content, type);
        }
    }
}
