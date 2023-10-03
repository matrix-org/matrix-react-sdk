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

import Modal from "../../../Modal";
import DevtoolsDialog from "../dialogs/DevtoolsDialog";
import { IconizedContextMenuOption } from "./IconizedContextMenu";
import { _t } from "../../../languageHandler";

interface Props {
    onFinished: () => void;
    roomId: string;
}

export const DeveloperToolsOption: React.FC<Props> = ({ onFinished, roomId }) => {
    return (
        <IconizedContextMenuOption
            onClick={() => {
                Modal.createDialog(
                    DevtoolsDialog,
                    {
                        onFinished: () => {},
                        roomId: roomId,
                    },
                    "mx_DevtoolsDialog_wrapper",
                );
                onFinished();
            }}
            label={_t("devtools|title")}
            iconClassName="mx_IconizedContextMenu_developerTools"
        />
    );
};
