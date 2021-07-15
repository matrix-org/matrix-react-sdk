/*
Copyright 2017 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2018-2021 The Matrix.org Foundation C.I.C.

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

import React from 'react';
import { MatrixClient } from "matrix-js-sdk/src/client";
import { Room } from "matrix-js-sdk/src/models/room";

import { _t } from '../../../languageHandler';
import { replaceableComponent } from "../../../utils/replaceableComponent";
import BaseDialog from "./BaseDialog";
import RoomCategory from "./devtools/RoomCategory";
import { ICategory, IDevtool } from "./devtools";
import { IDialogProps } from "./IDialogProps";
import AccountCategory from "./devtools/AccountCategory";
import SettingsCategory from "./devtools/SettingsCategory";

const categories: ICategory[] = [
    RoomCategory,
    AccountCategory,
    SettingsCategory,
];

interface IProps extends IDialogProps {
    matrixClient: MatrixClient;
    roomId?: string;
}

interface IState {
    tool?: IDevtool;
}

@replaceableComponent("views.dialogs.DevtoolsDialog")
export default class DevtoolsDialog extends React.PureComponent<IProps, IState> {
    private readonly room: Room;

    constructor(props) {
        super(props);

        this.state = {
            tool: null,
        };

        this.room = this.props.matrixClient.getRoom(this.props.roomId);
    }

    private setTool = (tool?: IDevtool) => {
        this.setState({ tool });
    };

    private onCancel = () => {
        this.props.onFinished(false);
    };

    render() {
        let body;
        let buttons;
        if (this.state.tool) {
            const { Component: Tool } = this.state.tool;
            body = <Tool onBack={this.setTool} room={this.room} />;
        } else {
            body = <React.Fragment>
                <div className="mx_Dialog_content">
                    { categories.map(category => {
                        if (category.hidden?.({ room: this.room })) return null;

                        return <div className="mx_Devtools_toolCategory" key={category.label}>
                            <h4>{ category.label }</h4>
                            <div className="mx_Devtools_buttonGrid">
                                { category.tools.map(tool => (
                                    <button key={tool.label} onClick={() => this.setTool(tool)}>
                                        { _t(tool.label) }
                                    </button>
                                )) }
                            </div>
                        </div>;
                    }) }
                </div>
            </React.Fragment>;
            buttons = <div className="mx_Dialog_buttons">
                <button onClick={this.onCancel}>{ _t('Cancel') }</button>
            </div>;
        }

        return (
            <BaseDialog className="mx_DevtoolsDialog" onFinished={this.props.onFinished} title={_t('Developer Tools')}>
                <div>
                    <div className="mx_Devtools_label_left">
                        { this.state.tool ? _t(this.state.tool.label) : _t("Toolbox") }
                    </div>
                    <div className="mx_Devtools_label_right">Room ID: { this.props.roomId }</div>
                    <div className="mx_Devtools_label_bottom" />
                    { body }
                </div>
                { buttons }
            </BaseDialog>
        );
    }
}
