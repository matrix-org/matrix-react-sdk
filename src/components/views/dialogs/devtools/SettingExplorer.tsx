/*
Copyright 2022 Michael Telatynski <7t3chguy@gmail.com>
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

import React, { useContext, useMemo, useState } from "react";
import { logger } from "matrix-js-sdk/src/logger";

import { _t } from "../../../../languageHandler";
import BaseTool, { DevtoolsContext, IDevtoolsProps } from "./BaseTool";
import AccessibleButton from "../../elements/AccessibleButton";
import SettingsStore, { LEVEL_ORDER } from "../../../../settings/SettingsStore";
import { SettingLevel } from "../../../../settings/SettingLevel";
import { SETTINGS } from "../../../../settings/Settings";
import Field from "../../elements/Field";

const SettingExplorer = ({ onBack }: IDevtoolsProps) => {
    const [setting, setSetting] = useState<string>(null);
    const [editing, setEditing] = useState(false);

    if (setting && editing) {
        const onBack = () => {
            setEditing(false);
        };
        return <EditSetting setting={setting} onBack={onBack} />;
    } else if (setting) {
        const onBack = () => {
            setSetting(null);
        };
        const onEdit = async () => {
            setEditing(true);
        };
        return <ViewSetting setting={setting} onBack={onBack} onEdit={onEdit} />;
    } else {
        const onView = (setting: string) => {
            setSetting(setting);
        };
        const onEdit = (setting: string) => {
            setSetting(setting);
            setEditing(true);
        };
        return <SettingsList onBack={onBack} onView={onView} onEdit={onEdit} />;
    }
};

export default SettingExplorer;

interface ICanEditLevelFieldProps {
    setting: string;
    level: SettingLevel;
    roomId?: string;
}

const CanEditLevelField = ({ setting, roomId, level }: ICanEditLevelFieldProps) => {
    const canEdit = SettingsStore.canSetValue(setting, roomId, level);
    const className = canEdit ? "mx_DevTools_SettingsExplorer_mutable" : "mx_DevTools_SettingsExplorer_immutable";
    return <td className={className}><code>{ canEdit.toString() }</code></td>;
};

function renderExplicitSettingValues(setting: string, roomId: string): string {
    const vals = {};
    for (const level of LEVEL_ORDER) {
        try {
            vals[level] = SettingsStore.getValueAt(level, setting, roomId, true, true);
            if (vals[level] === undefined) {
                vals[level] = null;
            }
        } catch (e) {
            logger.warn(e);
        }
    }
    return JSON.stringify(vals, null, 4);
}

interface IEditSettingProps extends Pick<IDevtoolsProps, "onBack"> {
    setting: string;
}

const EditSetting = ({ setting, onBack }: IEditSettingProps) => {
    const context = useContext(DevtoolsContext);
    const [explicitValue, setExplicitValue] = useState(renderExplicitSettingValues(setting, null));
    const [explicitRoomValue, setExplicitRoomValue] =
        useState(renderExplicitSettingValues(setting, context.room.roomId));

    const onSave = async () => {
        try {
            const parsedExplicit = JSON.parse(explicitValue);
            const parsedExplicitRoom = JSON.parse(explicitRoomValue);
            for (const level of Object.keys(parsedExplicit)) {
                logger.log(`[Devtools] Setting value of ${setting} at ${level} from user input`);
                try {
                    const val = parsedExplicit[level];
                    await SettingsStore.setValue(setting, null, level as SettingLevel, val);
                } catch (e) {
                    logger.warn(e);
                }
            }

            const roomId = context.room.roomId;
            for (const level of Object.keys(parsedExplicit)) {
                logger.log(`[Devtools] Setting value of ${setting} at ${level} in ${roomId} from user input`);
                try {
                    const val = parsedExplicitRoom[level];
                    await SettingsStore.setValue(setting, roomId, level as SettingLevel, val);
                } catch (e) {
                    logger.warn(e);
                }
            }
            onBack();
        } catch (e) {
            return _t("Failed to save settings.") + ` (${e.message})`;
        }
    };

    return <BaseTool onBack={onBack} actionLabel={_t("Save setting values")} onAction={onSave}>
        <h3>{ _t("Setting:") } <code>{ setting }</code></h3>

        <div className="mx_DevTools_SettingsExplorer_warning">
            <b>{ _t("Caution:") }</b> { _t("This UI does NOT check the types of the values. Use at your own risk.") }
        </div>

        <div>
            { _t("Setting definition:") }
            <pre><code>{ JSON.stringify(SETTINGS[setting], null, 4) }</code></pre>
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
                            <CanEditLevelField setting={setting} level={lvl} />
                            <CanEditLevelField setting={setting} roomId={context.room.roomId} level={lvl} />
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
                className="mx_DevTools_textarea"
                element="textarea"
                autoComplete="off"
                value={explicitValue}
                onChange={e => setExplicitValue(e.target.value)}
            />
        </div>

        <div>
            <Field
                id="valExpl"
                label={_t("Values at explicit levels in this room")}
                type="text"
                className="mx_DevTools_textarea"
                element="textarea"
                autoComplete="off"
                value={explicitRoomValue}
                onChange={e => setExplicitRoomValue(e.target.value)}
            />
        </div>
    </BaseTool>;
};

interface IViewSettingProps extends Pick<IDevtoolsProps, "onBack"> {
    setting: string;
    onEdit(): Promise<void>;
}

const ViewSetting = ({ setting, onEdit, onBack }: IViewSettingProps) => {
    const context = useContext(DevtoolsContext);

    return <BaseTool onBack={onBack} actionLabel={_t("Edit values")} onAction={onEdit}>
        <h3>{ _t("Setting:") } <code>{ setting }</code></h3>

        <div>
            { _t("Setting definition:") }
            <pre><code>{ JSON.stringify(SETTINGS[setting], null, 4) }</code></pre>
        </div>

        <div>
            { _t("Value:") }&nbsp;
            <code>{ renderSettingValue(SettingsStore.getValue(setting)) }</code>
        </div>

        <div>
            { _t("Value in this room:") }&nbsp;
            <code>{ renderSettingValue(SettingsStore.getValue(setting, context.room.roomId)) }</code>
        </div>

        <div>
            { _t("Values at explicit levels:") }
            <pre><code>{ renderExplicitSettingValues(setting, null) }</code></pre>
        </div>

        <div>
            { _t("Values at explicit levels in this room:") }
            <pre><code>{ renderExplicitSettingValues(setting, context.room.roomId) }</code></pre>
        </div>
    </BaseTool>;
};

function renderSettingValue(val: any): string {
    // Note: we don't .toString() a string because we want JSON.stringify to inject quotes for us
    const toStringTypes = ["boolean", "number"];
    if (toStringTypes.includes(typeof(val))) {
        return val.toString();
    } else {
        return JSON.stringify(val);
    }
}

interface ISettingsListProps extends Pick<IDevtoolsProps, "onBack"> {
    onView(setting: string): void;
    onEdit(setting: string): void;
}

const SettingsList = ({ onBack, onView, onEdit }: ISettingsListProps) => {
    const context = useContext(DevtoolsContext);
    const [query, setQuery] = useState("");

    const allSettings = useMemo(() => {
        let allSettings = Object.keys(SETTINGS);
        if (query) {
            const lcQuery = query.toLowerCase();
            allSettings = allSettings.filter(setting => setting.toLowerCase().includes(lcQuery));
        }
        return allSettings;
    }, [query]);

    return <BaseTool onBack={onBack} className="mx_DevTools_SettingsExplorer">
        <Field
            label={_t("Filter results")}
            autoFocus={true}
            size={64}
            type="text"
            autoComplete="off"
            value={query}
            onChange={ev => setQuery(ev.target.value)}
            className="mx_TextInputDialog_input mx_DevTools_RoomStateExplorer_query"
        />
        <table>
            <thead>
                <tr>
                    <th>{ _t("Setting ID") }</th>
                    <th>{ _t("Value") }</th>
                    <th>{ _t("Value in this room") }</th>
                </tr>
            </thead>
            <tbody>
                { allSettings.map(i => (
                    <tr key={i}>
                        <td>
                            <AccessibleButton
                                kind="link_inline"
                                className="mx_DevTools_SettingsExplorer_setting"
                                onClick={() => onView(i)}
                            >
                                <code>{ i }</code>
                            </AccessibleButton>
                            <AccessibleButton
                                alt={_t("Edit setting")}
                                onClick={() => onEdit(i)}
                                className="mx_DevTools_SettingsExplorer_edit"
                            >
                                ✏
                            </AccessibleButton>
                        </td>
                        <td>
                            <code>{ renderSettingValue(SettingsStore.getValue(i)) }</code>
                        </td>
                        <td>
                            <code>
                                { renderSettingValue(SettingsStore.getValue(i, context.room.roomId)) }
                            </code>
                        </td>
                    </tr>
                )) }
            </tbody>
        </table>
    </BaseTool>;
};
