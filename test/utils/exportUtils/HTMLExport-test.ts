/*
Copyright 2022 - 2023 The Matrix.org Foundation C.I.C.

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

import { EventType, IRoomEvent, MatrixClient, Room } from "matrix-js-sdk/src/matrix";

import { mkStubRoom, REPEATABLE_DATE, stubClient } from "../../test-utils";
import { ExportType, IExportOptions } from "../../../src/utils/exportUtils/exportUtils";
import SdkConfig from "../../../src/SdkConfig";
import HTMLExporter from "../../../src/utils/exportUtils/HtmlExport";
import DMRoomMap from "../../../src/utils/DMRoomMap";

jest.mock("jszip");

describe("HTMLExport", () => {
    let client: jest.Mocked<MatrixClient>;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(REPEATABLE_DATE);

        client = stubClient() as jest.Mocked<MatrixClient>;
        DMRoomMap.makeShared();
    });

    function getMessageFile(exporter: HTMLExporter): Blob {
        //@ts-ignore private access
        const files = exporter.files;
        const file = files.find((f) => f.name == "messages.html")!;
        return file.blob;
    }

    it("should have an SDK-branded destination file name", () => {
        const roomName = "My / Test / Room: Welcome";
        const stubOptions: IExportOptions = {
            attachmentsIncluded: false,
            maxSize: 50000000,
        };
        const stubRoom = mkStubRoom("!myroom:example.org", roomName, client);
        const exporter = new HTMLExporter(stubRoom, ExportType.Timeline, stubOptions, () => {});

        expect(exporter.destinationFileName).toMatchSnapshot();

        SdkConfig.put({ brand: "BrandedChat/WithSlashes/ForFun" });

        expect(exporter.destinationFileName).toMatchSnapshot();
    });

    it("should export", async () => {
        const room = new Room("!myroom:example.org", client, "@me:example.org");

        const events = [...Array(50)].map<IRoomEvent>((_, i) => ({
            event_id: "$1",
            type: EventType.RoomMessage,
            sender: `@user${i}:example.com`,
            origin_server_ts: 5_000 + i * 1000,
            content: {
                msgtype: "m.text",
                body: `Message #${i}`,
            },
        }));

        client.getRoom.mockReturnValue(room);
        client.createMessagesRequest.mockResolvedValue({ chunk: events });

        const exporter = new HTMLExporter(
            room,
            ExportType.LastNMessages,
            {
                attachmentsIncluded: false,
                maxSize: 1_024 * 1_024,
                numberOfMessages: events.length,
            },
            () => {},
        );

        await exporter.export();

        const file = getMessageFile(exporter);
        expect(await file.text()).toMatchSnapshot();
    });
});
