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

import React, { useState } from "react";

import { _t, _td } from "../../../../languageHandler";
import { ICategory, IDevtool, IProps as IDevtoolProps } from "./index";
import SettingsStore, { LEVEL_ORDER } from "../../../../settings/SettingsStore";
import { SettingLevel } from "../../../../settings/SettingLevel";
import Modal from "../../../../Modal";
import ErrorDialog from "../ErrorDialog";
import { SETTINGS } from "../../../../settings/Settings";
import Field from "../../elements/Field";
import FilteredList from "./FilteredList";

function renderSettingValue(val: any): string {
    // Note: we don't .toString() a string because we want JSON.stringify to inject quotes for us
    const toStringTypes = ['boolean', 'number'];
    if (toStringTypes.includes(typeof(val))) {
        return val.toString();
    } else {
        return JSON.stringify(val);
    }
}

function renderExplicitSettingValues(setting: string, roomId: string): string {
    const vals = {};
    for (const level of LEVEL_ORDER) {
        try {
            vals[level] = SettingsStore.getValueAt(level, setting, roomId, true, true);
            if (vals[level] === undefined) {
                vals[level] = null;
            }
        } catch (e) {
            console.warn(e);
        }
    }
    return JSON.stringify(vals, null, 4);
}

function renderCanEditLevel(roomId: string, selectedSetting: string, level: SettingLevel): React.ReactNode {
    const canEdit = SettingsStore.canSetValue(selectedSetting, roomId, level);
    const className = canEdit ? 'mx_Devtools_SettingsExplorer_mutable' : 'mx_Devtools_SettingsExplorer_immutable';
    return <td className={className}><code>{ canEdit.toString() }</code></td>;
}

const SettingsExploreTool: IDevtool = {
    label: _td("Settings Explorer"),
    Component: ({ room, onBack }: IDevtoolProps) => {
        const [query, setQuery] = useState("");
        const [selectedSetting, setSelectedSetting] = useState<string>(null);
        const [editingSetting, setEditingSetting] = useState<string>(null);
        const [explicitValues, setExplicitValues] = useState("");
        const [explicitRoomValues, setExplicitRoomValues] = useState("");

        const onWrappedBack = () => {
            if (editingSetting) {
                setEditingSetting(null);
            } else if (selectedSetting) {
                setSelectedSetting(null);
            } else {
                onBack();
            }
        };

        const onEdit = (key: string) => {
            setEditingSetting(key);
            setExplicitValues(renderExplicitSettingValues(key, null));
            setExplicitRoomValues(renderExplicitSettingValues(key, room.roomId));
        };

        let body: JSX.Element;
        let button: JSX.Element;
        if (editingSetting) {
            const onSaveClick = async () => {
                try {
                    const settingId = editingSetting;
                    const parsedExplicit = JSON.parse(explicitValues);
                    const parsedExplicitRoom = JSON.parse(explicitRoomValues);
                    for (const level of Object.keys(parsedExplicit)) {
                        console.log(`[Devtools] Setting value of ${settingId} at ${level} from user input`);
                        try {
                            const val = parsedExplicit[level];
                            await SettingsStore.setValue(settingId, null, level as SettingLevel, val);
                        } catch (e) {
                            console.warn(e);
                        }
                    }
                    const roomId = room.roomId;
                    for (const level of Object.keys(parsedExplicit)) {
                        console.log(`[Devtools] Setting value of ${settingId} at ${level} in ${roomId} from user input`);
                        try {
                            const val = parsedExplicitRoom[level];
                            await SettingsStore.setValue(settingId, roomId, level as SettingLevel, val);
                        } catch (e) {
                            console.warn(e);
                        }
                    }

                    setEditingSetting(null);
                    setSelectedSetting(null);
                } catch (e) {
                    Modal.createTrackedDialog('Devtools - Failed to save settings', '', ErrorDialog, {
                        title: _t("Failed to save settings"),
                        description: e.message,
                    });
                }
            };

            body = <>
                <h3>{_t("Setting:")} <code>{ editingSetting }</code></h3>

                <div className="mx_Devtools_SettingsExplorer_warning">
                    <b>{ _t("Caution:") }</b>
                    &nbsp;
                    { _t("This UI does NOT check the types of the values. Use at your own risk.") }
                </div>

                <div>
                    { _t("Setting definition:") }
                    <pre><code>{ JSON.stringify(SETTINGS[editingSetting], null, 4) }</code></pre>
                </div>

                <div>
                    <table>
                        <thead>
                            <tr>
                                <th>{ _t("Level") }</th>
                                <th>{ _t("Settable at global") }</th>
                                <th>{ _t("Settable at room") }</th>
                            </tr>
                        </thead>
                        <tbody>
                            { LEVEL_ORDER.map(lvl => (
                                <tr key={lvl}>
                                    <td><code>{ lvl }</code></td>
                                    { renderCanEditLevel(null, editingSetting, lvl) }
                                    { renderCanEditLevel(room.roomId, editingSetting, lvl) }
                                </tr>
                            )) }
                        </tbody>
                    </table>
                </div>

                <div>
                    <Field
                        id="valExpl"
                        label={_t("Values at explicit levels")}
                        type="text"
                        className="mx_Devtools_textarea"
                        element="textarea"
                        autoComplete="off"
                        value={explicitValues}
                        onChange={e => setExplicitValues(e.target.value)}
                    />
                </div>

                <div>
                    <Field
                        id="valExpl"
                        label={_t("Values at explicit levels in this room")}
                        type="text"
                        className="mx_Devtools_textarea"
                        element="textarea"
                        autoComplete="off"
                        value={explicitRoomValues}
                        onChange={e => setExplicitRoomValues(e.target.value)}
                    />
                </div>
            </>;
            button = <button onClick={onSaveClick}>
                { _t("Save setting values") }
            </button>;
        } else if (selectedSetting) {
            body = <>
                <h3>{_t("Setting:")} <code>{ selectedSetting }</code></h3>

                <div>
                    { _t("Setting definition:") }
                    <pre><code>{ JSON.stringify(SETTINGS[selectedSetting], null, 4) }</code></pre>
                </div>

                <div>
                    { _t("Value:") }&nbsp;
                    <code>{ renderSettingValue(SettingsStore.getValue(selectedSetting)) }</code>
                </div>

                <div>
                    { _t("Value in this room:") }&nbsp;
                    <code>{ renderSettingValue(SettingsStore.getValue(selectedSetting, room.roomId)) }</code>
                </div>

                <div>
                    { _t("Values at explicit levels:") }
                    <pre><code>{ renderExplicitSettingValues(selectedSetting, null) }</code></pre>
                </div>

                <div>
                    { _t("Values at explicit levels in this room:") }
                    <pre><code>{ renderExplicitSettingValues(selectedSetting, room.roomId) }</code></pre>
                </div>
            </>;
            button = <button onClick={(e) => {
                e.preventDefault();
                onEdit(selectedSetting);
            }}>
                { _t("Edit Values") }
            </button>;
        } else {
            body = <FilteredList query={query} onChange={setQuery} noTruncate wrapperElement={child => (
                <table>
                    <thead>
                        <tr>
                            <th>{ _t("Setting ID") }</th>
                            <th>{ _t("Value") }</th>
                            <th>{ _t("Value in this room") }</th>
                        </tr>
                    </thead>
                    <tbody>
                        { child }
                    </tbody>
                </table>
            )}>
                { Object.keys(SETTINGS).map(key => (
                    <tr key={key}>
                        <td>
                            <a
                                href=""
                                onClick={(e) => {
                                    e.preventDefault();
                                    setSelectedSetting(key);
                                }}
                            >
                                <code>{ key }</code>
                            </a>
                            <a
                                href=""
                                onClick={(e) => {
                                    e.preventDefault();
                                    onEdit(key);
                                }}
                                className='mx_Devtools_SettingsExplorer_edit'
                            >
                                ✏
                            </a>
                        </td>
                        <td>
                            <code>{ renderSettingValue(SettingsStore.getValue(key)) }</code>
                        </td>
                        <td>
                            <code>
                                { renderSettingValue(SettingsStore.getValue(key, room.roomId)) }
                            </code>
                        </td>
                    </tr>
                )) }
            </FilteredList>;
        }

        return <div>
            <div className="mx_Dialog_content mx_Devtools_SettingsExplorer">
                { body }
            </div>
            <div className="mx_Dialog_buttons">
                { button }
                <button onClick={onWrappedBack}>{ _t("Back") }</button>
            </div>
        </div>;
    },
};

const SettingsCategory: ICategory = {
    label: _td("Account"),
    tools: [
        SettingsExploreTool,
    ],
};

export default SettingsCategory;
