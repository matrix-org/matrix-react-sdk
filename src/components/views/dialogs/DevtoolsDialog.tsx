/*
Copyright 2022 Michael Telatynski <7t3chguy@gmail.com>

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

import React, { useState } from 'react';

import { _t, _td } from '../../../languageHandler';
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import BaseDialog from "./BaseDialog";
import { TimelineEventEditor } from "./devtools/Event";
import ServersInRoom from "./devtools/ServersInRoom";
import VerificationExplorer from "./devtools/VerificationExplorer";
import SettingExplorer from "./devtools/SettingExplorer";
import { RoomStateExplorer } from "./devtools/RoomState";
import BaseTool, { DevtoolsContext, IDevtoolsProps } from "./devtools/BaseTool";
import WidgetExplorer from './devtools/WidgetExplorer';
import { AccountDataExplorer, RoomAccountDataExplorer } from "./devtools/AccountData";
import SettingsFlag from "../elements/SettingsFlag";
import { SettingLevel } from "../../../settings/SettingLevel";
import ServerInfo from './devtools/ServerInfo';

enum Category {
    Room,
    Other,
}

const categoryLabels: Record<Category, string> = {
    [Category.Room]: _td("Room"),
    [Category.Other]: _td("Other"),
};

const Tools: Record<Category, [string, React.FC<IDevtoolsProps>][]> = {
    [Category.Room]: [
        [_td("Send custom timeline event"), TimelineEventEditor],
        [_td("Explore room state"), RoomStateExplorer],
        [_td("Explore room account data"), RoomAccountDataExplorer],
        [_td("View servers in room"), ServersInRoom],
        [_td("Verification explorer"), VerificationExplorer],
        [_td("Active Widgets"), WidgetExplorer],
    ],
    [Category.Other]: [
        [_td("Explore account data"), AccountDataExplorer],
        [_td("Settings explorer"), SettingExplorer],
        [_td("Server info"), ServerInfo],
    ],
};

interface IProps {
    roomId: string;
    onFinished(finished: boolean): void;
}

type ToolPath = [category: Category, index: number];

const DevtoolsDialog: React.FC<IProps> = ({ roomId, onFinished }) => {
    const [toolPath, setToolPath] = useState<ToolPath>(null);

    let body: JSX.Element;
    let onBack: () => void;

    if (toolPath) {
        onBack = () => {
            setToolPath(null);
        };

        const Tool = Tools[toolPath[0]][toolPath[1]][1];
        body = <Tool onBack={onBack} />;
    } else {
        const onBack = () => {
            onFinished(false);
        };
        body = <BaseTool onBack={onBack}>
            { Object.entries(Tools).map(([category, tools]) => (
                <div key={category}>
                    <h3>{ _t(categoryLabels[category]) }</h3>
                    { tools.map(([label], i) => {
                        const onClick = () => {
                            setToolPath([category as unknown as Category, i]);
                        };
                        return <button className="mx_DevTools_button" key={label} onClick={onClick}>
                            { _t(label) }
                        </button>;
                    }) }
                </div>
            )) }
            <div>
                <h3>{ _t("Options") }</h3>
                <SettingsFlag name="developerMode" level={SettingLevel.ACCOUNT} />
                <SettingsFlag name="showHiddenEventsInTimeline" level={SettingLevel.DEVICE} />
            </div>
        </BaseTool>;
    }

    const label = toolPath ? Tools[toolPath[0]][toolPath[1]][0] : _t("Toolbox");
    return (
        <BaseDialog className="mx_QuestionDialog" onFinished={onFinished} title={_t("Developer Tools")}>
            <MatrixClientContext.Consumer>
                { (cli) => <>
                    <div className="mx_DevTools_label_left">{ label }</div>
                    <div className="mx_DevTools_label_right">{ _t("Room ID: %(roomId)s", { roomId }) }</div>
                    <div className="mx_DevTools_label_bottom" />
                    <DevtoolsContext.Provider value={{ room: cli.getRoom(roomId) }}>
                        { body }
                    </DevtoolsContext.Provider>
                </> }
            </MatrixClientContext.Consumer>
        </BaseDialog>
    );
};

export default DevtoolsDialog;
