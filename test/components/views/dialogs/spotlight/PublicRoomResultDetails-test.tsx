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

import { PublicRoomResultDetails } from "../../../../../src/components/views/dialogs/spotlight/PublicRoomResultDetails";

describe("PublicRoomResultDetails", () => {
    it("renders", () => {
        const { asFragment } = render(<PublicRoomResultDetails
            room={{
                room_id: "room-id",
                name: "hello?",
                canonical_alias: "canonical-alias",
                world_readable: true,
                guest_can_join: false,
                num_joined_members: 666,
            }}
            labelId="label-id"
            descriptionId="description-id"
            detailsId="details-id"
        />);

        expect(asFragment()).toMatchSnapshot();
    });
});
