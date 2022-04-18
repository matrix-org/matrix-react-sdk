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

import React from 'react';

import { _t } from "../../../languageHandler";
import { MatrixClientPeg } from '../../../MatrixClientPeg';
import { SettingLevel } from "../../../settings/SettingLevel";
import SettingsStore from "../../../settings/SettingsStore";
import SettingsFlag from '../elements/SettingsFlag';
import Slider from '../elements/Slider';

const SETTING_MANUALLY_VERIFY_ALL_SESSIONS = "e2ee.manuallyVerifyAllSessions";

function updateBlacklistDevicesFlag(checked: boolean): void {
    MatrixClientPeg.get().setGlobalBlacklistUnverifiedDevices(checked);
}

const levelNames = [
    _t('Lax'),
    _t('Default'),
    _t('Strict'),
    _t('Paranoid'),
];

const levelDescriptions = [
    _t('Secure messages will be sent to all recipients and devices irrespective of whether they have verified them.'),
    _t('Secure messages will only be sent to devices of a recipient where the recipient has completed verification of that device.'),
    _t('Secure messages will only be sent to recipients whom you have completed verification with.'),
    _t('Secure messages will only be sent to recipient devices that you have verified yourself.'),
];

async function set(value: number) {
    let settings: [boolean, boolean, boolean] | undefined;

    switch (value) {
        case 0:
            settings = [false, false, false];
            break;
        case 1:
            settings = [true, false, false];
            break;
        case 2:
            settings = [true, true, false];
            break;
        case 3:
            settings = [true, true, true];
            break;
    }

    const [blacklistNonCrossSignedDevices, blacklistUnverifiedDevices, manuallyVerifyAllSessions] = settings;
    if (settings) {
        await SettingsStore.setValue('e2ee.blacklistNonCrossSignedDevices', null, SettingLevel.DEVICE, blacklistNonCrossSignedDevices);
        await SettingsStore.setValue('blacklistUnverifiedDevices', null, SettingLevel.DEVICE, blacklistUnverifiedDevices);
        await SettingsStore.setValue(SETTING_MANUALLY_VERIFY_ALL_SESSIONS, null, SettingLevel.DEVICE, manuallyVerifyAllSessions);
    }
}

function get(): number {
    const blacklistNonCrossSignedDevices = SettingsStore.getValueAt(
        SettingLevel.DEVICE,
        'e2ee.blacklistNonCrossSignedDevices',
    );

    const blacklistUnverifiedDevices = SettingsStore.getValueAt(
        SettingLevel.DEVICE,
        'blacklistUnverifiedDevices',
    );

    const manuallyVerifyAllSessions = SettingsStore.getValueAt(
        SettingLevel.DEVICE,
        SETTING_MANUALLY_VERIFY_ALL_SESSIONS,
    );

    if (blacklistUnverifiedDevices && manuallyVerifyAllSessions && blacklistNonCrossSignedDevices) {
        return 3;
    } else if (blacklistUnverifiedDevices && blacklistNonCrossSignedDevices) {
        return 2;
    } else if (blacklistNonCrossSignedDevices && !blacklistUnverifiedDevices && !manuallyVerifyAllSessions) {
        return 1;
    } else if (!blacklistNonCrossSignedDevices && !blacklistUnverifiedDevices && !manuallyVerifyAllSessions) {
        return 0;
    }

    return 4;
}

interface IProps {
}

interface IState {
    value: number;
}

export default class E2eTrustPanel extends React.Component<IProps, IState> {
    constructor(props: IProps) {
        super(props);
        this.state = {
            value: get(),
        };
    }

    watcherReferences: string[] = [];

    componentDidMount(): void {
        this.watcherReferences = ['e2ee.blacklistNonCrossSignedDevices', 'blacklistUnverifiedDevices', SETTING_MANUALLY_VERIFY_ALL_SESSIONS]
            .map(x => SettingsStore.watchSetting(x, null, this.updateValue));
    }

    componentWillUnmount(): void {
        this.watcherReferences.forEach(x => SettingsStore.unwatchSetting(x));
    }

    updateValue = () => {
        this.setState({
            value: get(),
        });
    };

    render() {
        return <div className="mx_SettingsTab_section mx_E2eTrustPanel">
            <Slider
                values={levelNames.map((_, i) => i)}
                value={this.state.value}
                onSelectionChange={set}
                displayFunc={i => levelNames[i]}
                disabled={this.state.value >= levelNames.length}
            />
            <p>{ this.state.value >= levelNames.length ? _t('Custom level, use the advanced controls below.') : levelDescriptions[get()] }</p>
            <details>
                <summary>{ _t("Advanced") }</summary>
                <div>
                    <SettingsFlag
                        name='e2ee.blacklistNonCrossSignedDevices'
                        level={SettingLevel.DEVICE}
                    />
                    <SettingsFlag
                        name='blacklistUnverifiedDevices'
                        level={SettingLevel.DEVICE}
                        onChange={updateBlacklistDevicesFlag}
                    />
                    <SettingsFlag name={SETTING_MANUALLY_VERIFY_ALL_SESSIONS}
                        level={SettingLevel.DEVICE}
                    />
                </div>
            </details>
        </div>;
    }
}
