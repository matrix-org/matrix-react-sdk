/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import BaseDialog from "../../../../components/views/dialogs/BaseDialog";
import Spinner from "../../../../components/views/elements/Spinner";
import DialogButtons from "../../../../components/views/elements/DialogButtons";
import dis from "../../../../dispatcher/dispatcher";
import { _t } from "../../../../languageHandler";
import SettingsStore from "../../../../settings/SettingsStore";
import EventIndexPeg from "../../../../indexing/EventIndexPeg";
import { Action } from "../../../../dispatcher/actions";
import { SettingLevel } from "../../../../settings/SettingLevel";

interface IProps {
    onFinished: (success?: boolean) => void;
}

interface IState {
    disabling: boolean;
}

/*
 * Allows the user to disable the Event Index.
 */
export default class DisableEventIndexDialog extends React.Component<IProps, IState> {
    public constructor(props: IProps) {
        super(props);
        this.state = {
            disabling: false,
        };
    }

    private onDisable = async (): Promise<void> => {
        this.setState({
            disabling: true,
        });

        await SettingsStore.setValue("enableEventIndexing", null, SettingLevel.DEVICE, false);
        await EventIndexPeg.deleteEventIndex();
        this.props.onFinished(true);
        dis.fire(Action.ViewUserSettings);
    };

    public render(): React.ReactNode {
        return (
            <BaseDialog onFinished={this.props.onFinished} title={_t("common|are_you_sure")}>
                {_t("settings|security|message_search_disable_warning")}
                {this.state.disabling ? <Spinner /> : <div />}
                <DialogButtons
                    primaryButton={_t("action|disable")}
                    onPrimaryButtonClick={this.onDisable}
                    primaryButtonClass="danger"
                    cancelButtonClass="warning"
                    onCancel={this.props.onFinished}
                    disabled={this.state.disabling}
                />
            </BaseDialog>
        );
    }
}
