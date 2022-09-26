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

import React from "react";
import { render } from "@testing-library/react";

import { Icon, IconColour, IconSize, IconType } from "../../../src/components/atoms/Icon";

describe("Icon", () => {
    it.each([
        IconColour.Accent,
        IconColour.White,
    ])("should render the colour %s", (colour: IconColour) => {
        const { container } = render(
            <Icon
                colour={colour}
                type={IconType.Live}
            />,
        );
        expect(container).toMatchSnapshot();
    });

    it.each([
        IconSize.S16,
    ])("should render the size %s", (size: IconSize) => {
        const { container } = render(
            <Icon
                size={size}
                type={IconType.Live}
            />,
        );
        expect(container).toMatchSnapshot();
    });
});
