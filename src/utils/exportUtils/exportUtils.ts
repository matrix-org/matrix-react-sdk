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

import { IContent, MatrixEvent } from "matrix-js-sdk/src/matrix";

import { _t } from "../../languageHandler";

export enum ExportFormat {
    Html = "Html",
    PlainText = "PlainText",
    Json = "Json",
}

export type ExportFormatKey = "Html" | "PlainText" | "Json";

export enum ExportType {
    Timeline = "Timeline",
    Beginning = "Beginning",
    LastNMessages = "LastNMessages",
    // START_DATE = "START_DATE",
}

export type ExportTypeKey = "Timeline" | "Beginning" | "LastNMessages";

export const textForFormat = (format: ExportFormat): string => {
    switch (format) {
        case ExportFormat.Html:
            return _t("export_chat|html");
        case ExportFormat.Json:
            return _t("export_chat|json");
        case ExportFormat.PlainText:
            return _t("export_chat|text");
        default:
            throw new Error("Unknown format");
    }
};

export const textForType = (type: ExportType): string => {
    switch (type) {
        case ExportType.Beginning:
            return _t("export_chat|from_the_beginning");
        case ExportType.LastNMessages:
            return _t("export_chat|number_of_messages");
        case ExportType.Timeline:
            return _t("export_chat|current_timeline");
        default:
            throw new Error("Unknown type: " + type);
        // case exportTypes.START_DATE:
        //     return _t("From a specific date");
    }
};

export const textForReplyEvent = (content: IContent): string => {
    const REPLY_REGEX = /> <(.*?)>(.*?)\n\n(.*)/s;
    const REPLY_SOURCE_MAX_LENGTH = 32;

    const match = REPLY_REGEX.exec(content.body);

    // if the reply format is invalid, then return the body
    if (!match) return content.body;

    let rplSource: string;
    const rplName = match[1];
    const rplText = match[3];

    rplSource = match[2].substring(1);
    // Get the first non-blank line from the source.
    const lines = rplSource.split("\n").filter((line) => !/^\s*$/.test(line));
    if (lines.length > 0) {
        // Cut to a maximum length.
        rplSource = lines[0].substring(0, REPLY_SOURCE_MAX_LENGTH);
        // Ellipsis if needed.
        if (lines[0].length > REPLY_SOURCE_MAX_LENGTH) {
            rplSource = rplSource + "...";
        }
        // Wrap in formatting
        rplSource = ` "${rplSource}"`;
    } else {
        // Don't show a source because we couldn't format one.
        rplSource = "";
    }

    return `<${rplName}${rplSource}> ${rplText}`;
};

export const isReply = (event: MatrixEvent): boolean => {
    const isEncrypted = event.isEncrypted();
    // If encrypted, in_reply_to lies in event.event.content
    const content = isEncrypted ? event.event.content! : event.getContent();
    const relatesTo = content["m.relates_to"];
    return !!(relatesTo && relatesTo["m.in_reply_to"]);
};

export interface IExportOptions {
    // startDate?: number;
    numberOfMessages?: number;
    attachmentsIncluded: boolean;
    maxSize: number;
}
