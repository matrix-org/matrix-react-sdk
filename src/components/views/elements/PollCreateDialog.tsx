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

import { IScrollableBaseState, ScrollableBaseModal } from "../dialogs/ScrollableBaseModal";
import { IDialogProps } from "../dialogs/IDialogProps";
import React from "react";
import { _t } from "../../../languageHandler";
import { Room } from "matrix-js-sdk/src/models/room";

interface IProps extends IDialogProps {
    room: Room;
}

interface IState extends IScrollableBaseState {
}

export default class PollCreateDialog extends ScrollableBaseModal<IProps, IState> {
    public constructor(props: IProps) {
        super(props);

        this.state = {
            title: _t("Create poll"),
            actionLabel: _t("Create Poll"),
            canSubmit: false, // need to add a question and at least one option first
        };
    }

    protected submit(): void {
        console.log("@@ TODO");
        this.props.onFinished(true);
    }

    protected cancel(): void {
        this.props.onFinished(false);
    }

    protected renderContent(): React.ReactNode {
        return "TODO";
    }
}
