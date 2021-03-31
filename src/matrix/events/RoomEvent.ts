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

import {MMessage, MMessageContent, MMessagePart} from "./schema/message";
import {MHtml, MHtmlContent, MText, MTextContent} from "./schema/text";

type MMessageTopLevel = {
    [k in typeof MMessage.tsType]?: MMessageContent;
};
type MTextTopLevel = {
    [k in typeof MText.tsType]?: MTextContent;
};
type MHtmlTopLevel = {
    [k in typeof MHtml.tsType]?: MHtmlContent;
};
type MessageLike = MMessageTopLevel & MTextTopLevel & MHtmlTopLevel & any;

export class RoomEvent {
    private constructor(private definition: MessageLike, public readonly type: string) {
    }

    public get canRender(): boolean {
        // TODO: @TR Detect this better
        return !this.textNode;
    }

    public get redacted(): boolean {
        // TODO: @TR Detect this better
        return !this.canRender;
    }

    public get textNode(): MMessagePart | null {
        const text = MText.findIn<string>(this.definition);
        if (text) {
            return {
                mimetype: "text/plain",
                body: text,
            };
        }

        const message = MMessage.findIn<MMessageContent>(this.definition);
        if (!message) return null;
        return message.find(p => !p.mimetype || p.mimetype === "text/plain");
    }

    public get htmlNode(): MMessagePart | null {
        const text = MHtml.findIn<string>(this.definition);
        if (text) {
            return {
                mimetype: "text/html",
                body: text,
            };
        }

        const message = MMessage.findIn<MMessageContent>(this.definition);
        if (!message) return null;
        return message.find(p => p.mimetype === "text/html");
    }

    public get text(): string | null {
        return this.textNode?.body;
    }

    public get html(): string | null {
        return this.htmlNode?.body;
    }

    public static fromRaw(json: any): RoomEvent | null {
        const content = json?.['content'] ?? {};
        const type = json?.['type'];
        if (!type) return null;

        if (type === "m.room.message") {
            // TODO: @@TR Check & interpret msgtype
            const fallback = {
                [MText.name]: content['body'],
                [MHtml.name]: content['format'] === 'org.matrix.custom.html' ? content['formatted_body'] : null,
            };
            return new RoomEvent(Object.assign({}, fallback, content), type);
        } else {
            return new RoomEvent(content, type);
        }
    }
}
