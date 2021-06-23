/*
Copyright 2017 Travis Ralston
Copyright 2019 The Matrix.org Foundation C.I.C.

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
import SettingsStore from "../../../settings/SettingsStore";
import { _t } from '../../../languageHandler';
import ToggleSwitch from "./ToggleSwitch";
import StyledCheckbox from "./StyledCheckbox";
import { SettingLevel } from "../../../settings/SettingLevel";
import {replaceableComponent} from "../../../utils/replaceableComponent";

interface IProps {
    // The setting must be a boolean
    name: string;
    level: SettingLevel;
    roomId?: string; // for per-room settings
    label?: string; // untranslated
    isExplicit?: boolean;
    // XXX: once design replaces all toggles make this the default
    useCheckbox?: boolean;
    disabled?: boolean;
    onChange?(checked: boolean): void;
}

interface IState {
    value: boolean;
}

@replaceableComponent("views.elements.SettingsFlag")
export default class SettingsFlag extends React.Component<IProps, IState> {
    constructor(props: IProps) {
        super(props);

        this.state = {
            value: SettingsStore.getValueAt(
                this.props.level,
                this.props.name,
                this.props.roomId,
                this.props.isExplicit,
            ),
        };
    }

    private onChange = async (checked: boolean) => {
        await this.save(checked);
        this.setState({ value: checked });
        if (this.props.onChange) this.props.onChange(checked);
    };

    private checkBoxOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.onChange(e.target.checked);
    };

    private save = async (val?: boolean) => {
        await SettingsStore.setValue(
            this.props.name,
            this.props.roomId,
            this.props.level,
            val !== undefined ? val : this.state.value,
        );
    };

    public render() {
        const canChange = SettingsStore.canSetValue(this.props.name, this.props.roomId, this.props.level);

        const label = this.props.label
            ? _t(this.props.label)
            : SettingsStore.getDisplayName(this.props.name, this.props.level);
        const description = SettingsStore.getDescription(this.props.name);

        if (this.props.useCheckbox) {
            return <StyledCheckbox
                checked={this.state.value}
                onChange={this.checkBoxOnChange}
                disabled={this.props.disabled || !canChange}
            >
                {label}
            </StyledCheckbox>;
        } else {
            return (
                <div className="mx_SettingsFlag">
                    <span className="mx_SettingsFlag_label">{label}</span>
                    <ToggleSwitch
                        checked={this.state.value}
                        onChange={this.onChange}
                        disabled={this.props.disabled || !canChange}
                        aria-label={label}
                    />
                    { description && <div className="mx_SettingsFlag_microcopy">
                        { description }
                    </div> }
                </div>
            );
        }
    }
}
