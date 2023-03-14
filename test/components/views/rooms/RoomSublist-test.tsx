/*
Copyright 2023 Mikhail Aheichyk
Copyright 2023 Nordeck IT + Consulting GmbH.

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

import { render, RenderResult, screen } from "@testing-library/react";
import { ComponentProps } from "react";
import React from "react";
import { EventEmitter } from "events";
import { mocked } from "jest-mock";

import RoomSublist, { IAuxButtonProps } from "../../../../src/components/views/rooms/RoomSublist";
import { DefaultTagID } from "../../../../src/stores/room-list/models";
import ResizeNotifier from "../../../../src/utils/ResizeNotifier";
import AccessibleButton from "../../../../src/components/views/elements/AccessibleButton";
import { shouldShowComponent } from "../../../../src/customisations/helpers/UIComponents";
import { UIComponent } from "../../../../src/settings/UIFeature";

jest.mock("../../../../src/customisations/helpers/UIComponents", () => ({
    shouldShowComponent: jest.fn(),
}));

const AuxButton: React.FC<IAuxButtonProps> = ({ tabIndex }) => {
    return <AccessibleButton onClick={jest.fn()}>Add room</AccessibleButton>;
};

describe("RoomSublist", () => {
    function renderComponent(props: Partial<ComponentProps<typeof RoomSublist>> = {}): RenderResult {
        return render(
            <RoomSublist
                forRooms={true}
                startAsHidden={false}
                label="Rooms"
                AuxButtonComponent={AuxButton}
                isMinimized={false}
                tagId={DefaultTagID.Untagged}
                resizeNotifier={new EventEmitter() as unknown as ResizeNotifier}
                alwaysVisible={true}
                {...props}
            />,
        );
    }

    it("does not render when UIComponent customisations disable room creation", () => {
        mocked(shouldShowComponent).mockReturnValue(false);

        renderComponent();

        expect(shouldShowComponent).toHaveBeenCalledWith(UIComponent.CreateRooms);
        expect(screen.queryByRole("button", { name: "Add room" })).not.toBeInTheDocument();
    });

    it("renders when UIComponent customisations enable room creation", () => {
        mocked(shouldShowComponent).mockReturnValue(true);

        renderComponent();

        expect(shouldShowComponent).toHaveBeenCalledWith(UIComponent.CreateRooms);
        expect(screen.getByRole("button", { name: "Add room" })).toBeInTheDocument();
    });
});
