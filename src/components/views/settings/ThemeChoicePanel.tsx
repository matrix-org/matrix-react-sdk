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

import React from 'react';
import { _t } from "../../../languageHandler";
import { Theme } from "../../../Theme";
import StyledCheckbox from '../elements/StyledCheckbox';
import { replaceableComponent } from "../../../utils/replaceableComponent";

@replaceableComponent("views.settings.tabs.user.ThemeChoicePanel")
export default class ThemeChoicePanel extends React.Component<IProps, IState> {
    private renderHighContrastCheckbox(): React.ReactElement<HTMLDivElement> {
        const theme = new Theme(this.state.theme);
        if (
            !this.state.useSystemTheme && (
                theme.highContrast ||
                theme.isHighContrast
            )
        ) {
            return <div>
                <StyledCheckbox
                    checked={theme.isHighContrast}
                    onChange={(e) => this.highContrastThemeChanged(e.target.checked)}
                >
                    { _t( "Use high contrast" ) }
                </StyledCheckbox>
            </div>;
        }
    }

    private highContrastThemeChanged(checked: boolean): void {
        const theme = new Theme(this.state.theme)
        let newTheme: string;
        if (checked) {
            newTheme = theme.highContrast;
        } else {
            newTheme = theme.nonHighContrast;
        }
        if (newTheme) {
            this.onThemeChange(newTheme);
        }
    }

    apparentSelectedThemeId() {
        if (this.state.useSystemTheme) {
            return undefined;
        }
        const nonHighContrast = new Theme(this.state.theme).nonHighContrast;
        return nonHighContrast ? nonHighContrast : this.state.theme;
    }
}
