/*
Copyright 2019 New Vector Ltd
Copyright 2019 The Matrix.org Foundation C.I.C.
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>

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

import { _t } from "../../../../../languageHandler";
import ProfileSettings from "../../ProfileSettings";
import * as languageHandler from "../../../../../languageHandler";
import SettingsStore from "../../../../../settings/SettingsStore";
import LanguageDropdown from "../../../elements/LanguageDropdown";
import SpellCheckSettings from "../../SpellCheckSettings";
import PlatformPeg from "../../../../../PlatformPeg";
import { SettingLevel } from "../../../../../settings/SettingLevel";
import { replaceableComponent } from "../../../../../utils/replaceableComponent";
import SetIntegrationManager from "../../SetIntegrationManager";
import { UIFeature } from '../../../../../settings/UIFeature';

interface IProps {
    closeSettingsFn: () => void;
}

interface IState {
    language: string;
    spellCheckLanguages: string[];
}

@replaceableComponent("views.settings.tabs.user.GeneralUserSettingsTab")
export default class GeneralUserSettingsTab extends React.Component<IProps, IState> {
    constructor(props: IProps) {
        super(props);

        this.state = {
            language: languageHandler.getCurrentLanguage(),
            spellCheckLanguages: [],
        };
    }

    public async componentDidMount(): Promise<void> {
        const plaf = PlatformPeg.get();
        if (plaf) {
            this.setState({
                spellCheckLanguages: await plaf.getSpellCheckLanguages(),
            });
        }
    }

    private onLanguageChange = (newLanguage: string): void => {
        if (this.state.language === newLanguage) return;

        SettingsStore.setValue("language", null, SettingLevel.DEVICE, newLanguage);
        this.setState({ language: newLanguage });
        const platform = PlatformPeg.get();
        if (platform) {
            platform.setLanguage([newLanguage]);
            platform.reload();
        }
    };

    private onSpellCheckLanguagesChange = (languages: string[]): void => {
        this.setState({ spellCheckLanguages: languages });

        const plaf = PlatformPeg.get();
        if (plaf) {
            plaf.setSpellCheckLanguages(languages);
        }
    };

    private renderProfileSection(): JSX.Element {
        return (
            <div className="mx_SettingsTab_section">
                <ProfileSettings />
            </div>
        );
    }

    private renderLanguageSection(): JSX.Element {
        // TODO: Convert to new-styled Field
        return (
            <div className="mx_SettingsTab_section">
                <span className="mx_SettingsTab_subheading">{ _t("Language and region") }</span>
                <LanguageDropdown
                    className="mx_GeneralUserSettingsTab_languageInput"
                    onOptionChange={this.onLanguageChange}
                    value={this.state.language}
                />
            </div>
        );
    }

    private renderSpellCheckSection(): JSX.Element {
        return (
            <div className="mx_SettingsTab_section">
                <span className="mx_SettingsTab_subheading">{ _t("Spell check dictionaries") }</span>
                <SpellCheckSettings
                    languages={this.state.spellCheckLanguages}
                    onLanguagesChange={this.onSpellCheckLanguagesChange}
                />
            </div>
        );
    }

    private renderIntegrationManagerSection(): JSX.Element {
        if (!SettingsStore.getValue(UIFeature.Widgets)) return null;

        return (
            <div className="mx_SettingsTab_section">
                { /* has its own heading as it includes the current integration manager */ }
                <SetIntegrationManager />
            </div>
        );
    }

    public render(): JSX.Element {
        const plaf = PlatformPeg.get();
        const supportsMultiLanguageSpellCheck = plaf.supportsMultiLanguageSpellCheck();

        return (
            <div className="mx_SettingsTab">
                <div className="mx_SettingsTab_heading">{ _t("General") }</div>
                { this.renderProfileSection() }
                { this.renderLanguageSection() }
                { supportsMultiLanguageSpellCheck ? this.renderSpellCheckSection() : null }
                { this.renderIntegrationManagerSection() /* Has its own title */ }
            </div>
        );
    }
}
