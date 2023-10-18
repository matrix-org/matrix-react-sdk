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

import React, { ComponentProps } from "react";
import { EventType, getHttpUriForMxc, IContent, MatrixEvent } from "matrix-js-sdk/src/matrix";
import { render, RenderResult } from "@testing-library/react";
import fetchMock from "fetch-mock-jest";

import MatrixClientContext from "../../../../src/contexts/MatrixClientContext";
import { RoomPermalinkCreator } from "../../../../src/utils/permalinks/Permalinks";
import { MediaEventHelper } from "../../../../src/utils/MediaEventHelper";
import {
    getMockClientWithEventEmitter,
    mockClientMethodsCrypto,
    mockClientMethodsDevice,
    mockClientMethodsServer,
    mockClientMethodsUser,
} from "../../../test-utils";
import MVideoBody from "../../../../src/components/views/messages/MVideoBody";

describe("MVideoBody", () => {
    it("does not crash when given a portrait image", () => {
        // Check for an unreliable crash caused by a fractional-sized
        // image dimension being used for a CanvasImageData.
        const { asFragment } = makeMVideoBody(720, 1280);
        expect(asFragment()).toMatchSnapshot();
        // If we get here, we did not crash.
    });

    it("should show poster for encrypted media before downloading it", async () => {
        const userId = "@user:server";
        const deviceId = "DEADB33F";
        const cli = getMockClientWithEventEmitter({
            ...mockClientMethodsUser(userId),
            ...mockClientMethodsServer(),
            ...mockClientMethodsDevice(deviceId),
            ...mockClientMethodsCrypto(),
            getRooms: jest.fn().mockReturnValue([]),
            getIgnoredUsers: jest.fn(),
            getVersions: jest.fn().mockResolvedValue({
                unstable_features: {
                    "org.matrix.msc3882": true,
                    "org.matrix.msc3886": true,
                },
            }),
        });
        const thumbUrl = "https://server/_matrix/media/v3/download/server/encrypted-poster";
        fetchMock.getOnce(thumbUrl, { status: 200 });

        // eslint-disable-next-line no-restricted-properties
        cli.mxcUrlToHttp.mockImplementation(
            (mxcUrl: string, width?: number, height?: number, resizeMethod?: string, allowDirectLinks?: boolean) => {
                return getHttpUriForMxc("https://server", mxcUrl, width, height, resizeMethod, allowDirectLinks);
            },
        );
        const encryptedMediaEvent = new MatrixEvent({
            room_id: "!room:server",
            sender: userId,
            type: EventType.RoomMessage,
            content: {
                body: "alt for a test video",
                info: {
                    duration: 420,
                    w: 40,
                    h: 50,
                    thumbnail_file: {
                        url: "mxc://server/encrypted-poster",
                    },
                },
                file: {
                    url: "mxc://server/encrypted-image",
                },
            },
        });

        const { asFragment } = render(
            <MVideoBody mxEvent={encryptedMediaEvent} mediaEventHelper={new MediaEventHelper(encryptedMediaEvent)} />,
        );
        expect(asFragment()).toMatchSnapshot();
    });
});

function makeMVideoBody(w: number, h: number): RenderResult {
    const content: IContent = {
        info: {
            "w": w,
            "h": h,
            "mimetype": "video/mp4",
            "size": 2495675,
            "thumbnail_file": {
                url: "",
                key: { alg: "", key_ops: [], kty: "", k: "", ext: true },
                iv: "",
                hashes: {},
                v: "",
            },
            "thumbnail_info": { mimetype: "" },
            "xyz.amorgan.blurhash": "TrGl6bofof~paxWC?bj[oL%2fPj]",
        },
        url: "http://example.com",
    };

    const event = new MatrixEvent({
        content,
    });

    const defaultProps: ComponentProps<typeof MVideoBody> = {
        mxEvent: event,
        highlights: [],
        highlightLink: "",
        onHeightChanged: jest.fn(),
        onMessageAllowed: jest.fn(),
        permalinkCreator: {} as RoomPermalinkCreator,
        mediaEventHelper: { media: { isEncrypted: false } } as MediaEventHelper,
    };

    const mockClient = getMockClientWithEventEmitter({
        mxcUrlToHttp: jest.fn(),
    });

    return render(
        <MatrixClientContext.Provider value={mockClient}>
            <MVideoBody {...defaultProps} />
        </MatrixClientContext.Provider>,
    );
}
