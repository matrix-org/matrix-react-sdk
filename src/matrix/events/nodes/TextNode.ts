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

import {EventContent} from "../schema/event";
import {MHtml, MText} from "../schema/text";
import {MMessage, MMessageContent, MMessagePart} from "../schema/message";
import {Optional} from "../../../@types/common";
import {isNullOrUndefined} from "matrix-js-sdk/src/utils";

export class TextNode {
    private constructor(private content: EventContent) {
    }

    public get text(): string {
        return this.getPart(MText, "text/plain")?.body;
    }

    public get html(): Optional<string> {
        return this.getPart(MHtml, "text/html")?.body;
    }

    private getPart(directType: MText | MHtml, mimetype: "text/plain" | "text/html"): Optional<MMessagePart> {
        const text = directType.findIn<string>(this.content);
        if (typeof (text) === "string") {
            return {mimetype, body: text};
        }

        const message = MMessage.findIn<MMessageContent>(this.content);
        if (Array.isArray(message)) {
            const part = message.find(p => p?.mimetype === mimetype || (!p?.mimetype && mimetype === "text/plain"));
            const validLang = isNullOrUndefined(part?.lang) || typeof (part.lang) === "string";
            if (typeof (part?.body) === "string" && validLang) {
                return part;
            }
        }

        return null;
    }

    public static fromContent(content: EventContent): Optional<TextNode> {
        const node = new TextNode(content);
        if (!node.text) return null; // must have at least text
        return node;
    }
}
