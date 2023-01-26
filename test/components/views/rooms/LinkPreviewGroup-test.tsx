/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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

import React from "react";
import { render, RenderResult } from "@testing-library/react";
import { IPreviewUrlResponse, MatrixClient } from "matrix-js-sdk/src/matrix";
import { act } from "react-dom/test-utils";

import LinkPreviewGroup from "../../../../src/components/views/rooms/LinkPreviewGroup";
import { flushPromises, mkMessage, stubClient } from "../../../test-utils";
import MatrixClientContext from "../../../../src/contexts/MatrixClientContext";

type Props = React.ComponentPropsWithoutRef<typeof LinkPreviewGroup>;

describe("<LinkPreviewGroup >", () => {
    let client: jest.Mocked<MatrixClient>;

    beforeEach(() => {
        client = stubClient() as jest.Mocked<MatrixClient>;
    });

    function renderComponent(props: Partial<Props>): RenderResult {
        return render(
            <MatrixClientContext.Provider value={client}>
                <LinkPreviewGroup
                    mxEvent={mkMessage({
                        event: true,
                        user: "@user:example.com",
                        room: "!room:example.com",
                    })}
                    links={[]}
                    onCancelClick={jest.fn()}
                    onHeightChanged={jest.fn()}
                    {...props}
                />
            </MatrixClientContext.Provider>,
        );
    }

    function mockResponses(map: Record<string, IPreviewUrlResponse>) {
        client.getUrlPreview.mockImplementation((url) => {
            const value = map[url];
            if (!value) return Promise.reject(new Error());
            return Promise.resolve(value);
        });
    }

    function finishLoading(): Promise<void> {
        return act(async () => {
            await flushPromises();
        });
    }

    it("should render", async () => {
        mockResponses({
            "https://www.example.com/file.txt": {
                "og:title": "File",
                "og:type": "text",
                "og:url": "n/a",
            },
            "https://www.example.com/website.html": {
                "og:title": "My Cool Website",
                "og:type": "website",
                "og:url": "n/a",
            },
        });

        const { container } = renderComponent({
            links: ["https://www.example.com/file.txt", "https://www.example.com/website.html"],
        });

        await finishLoading();

        expect(container).toMatchSnapshot();
    });
});
