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
import { render, screen } from "@testing-library/react";
import { IThreepid, ThreepidMedium } from "matrix-js-sdk/src/@types/threepids";

import { PhoneNumber } from "../../../../../src/components/views/settings/discovery/PhoneNumbers";

describe("<PhoneNumber/>", () => {
    it("should track props.msisdn.bound changes", async () => {
        const msisdn: IThreepid = {
            medium: ThreepidMedium.Phone,
            address: "+441111111111",
            validated_at: 12345,
            added_at: 12342,
            bound: false,
        };

        const { rerender } = render(<PhoneNumber msisdn={msisdn} />);
        await screen.findByText("Share");

        msisdn.bound = true;
        rerender(<PhoneNumber msisdn={{ ...msisdn }} />);
        await screen.findByText("Revoke");
    });
});
