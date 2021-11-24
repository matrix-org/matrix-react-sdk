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

import Exporter from "./Exporter";
import { Room } from "matrix-js-sdk/src/models/room";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { formatFullDateNoDay } from "../../DateUtils";
import { _t } from "../../languageHandler";
import { haveTileForEvent } from "../../components/views/rooms/EventTile";
import { ExportType, isReply, textForReplyEvent } from "./exportUtils";
import { IExportOptions } from "./exportUtils";
import { textForEvent } from "../../TextForEvent";

import { logger } from "matrix-js-sdk/src/logger";

export default class PlainTextExporter extends Exporter {
    protected totalSize: number;
    protected mediaOmitText: string;

    constructor(
        room: Room,
        exportType: ExportType,
        exportOptions: IExportOptions,
        setProgressText: React.Dispatch<React.SetStateAction<string>>,
    ) {
        super(room, exportType, exportOptions, setProgressText);
        this.totalSize = 0;
        this.mediaOmitText = !this.exportOptions.attachmentsIncluded
            ? _t("Media omitted")
            : _t("Media omitted - file size limit exceeded");
    }

    protected plainTextForEvent = async (mxEv: MatrixEvent) => {
        const senderDisplayName = mxEv.sender && mxEv.sender.name ? mxEv.sender.name : mxEv.getSender();
        let mediaText = "";
        if (this.isAttachment(mxEv)) {
            if (this.exportOptions.attachmentsIncluded) {
                try {
                    const blob = await this.getMediaBlob(mxEv);
                    if (this.totalSize + blob.size > this.exportOptions.maxSize) {
                        mediaText = ` (${this.mediaOmitText})`;
                    } else {
                        this.totalSize += blob.size;
                        const filePath = this.getFilePath(mxEv);
                        mediaText = " (" + _t("File Attached") + ")";
                        this.addFile(filePath, blob);
                        if (this.totalSize == this.exportOptions.maxSize) {
                            this.exportOptions.attachmentsIncluded = false;
                        }
                    }
                } catch (error) {
                    mediaText = " (" + _t("Error fetching file") + ")";
                    logger.log("Error fetching file " + error);
                }
            } else mediaText = ` (${this.mediaOmitText})`;
        }
        if (isReply(mxEv)) return senderDisplayName + ": " + textForReplyEvent(mxEv.getContent()) + mediaText;
        else return textForEvent(mxEv) + mediaText;
    };

    protected async createOutput(events: MatrixEvent[]) {
        let content = "";
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            this.updateProgress(`Processing event ${i + 1} out of ${events.length}`, false, true);
            if (this.cancelled) return this.cleanUp();
            if (!haveTileForEvent(event)) continue;
            const textForEvent = await this.plainTextForEvent(event);
            content += textForEvent && `${new Date(event.getTs()).toLocaleString()} - ${textForEvent}\n`;
        }
        return content;
    }

    public async export() {
        this.updateProgress("Starting export process...");
        this.updateProgress("Fetching events...");

        const fetchStart = performance.now();
        const res = await this.getRequiredEvents();
        const fetchEnd = performance.now();

        logger.log(`Fetched ${res.length} events in ${(fetchEnd - fetchStart)/1000}s`);

        this.updateProgress("Creating output...");
        const text = await this.createOutput(res);

        if (this.files.length) {
            this.addFile("export.txt", new Blob([text]));
            await this.downloadZIP();
        } else {
            const fileName = `matrix-export-${formatFullDateNoDay(new Date())}.txt`;
            this.downloadPlainText(fileName, text);
        }

        const exportEnd = performance.now();

        if (this.cancelled) {
            logger.info("Export cancelled successfully");
        } else {
            logger.info("Export successful!");
            logger.log(`Exported ${res.length} events in ${(exportEnd - fetchStart)/1000} seconds`);
        }

        this.cleanUp();
    }
}

