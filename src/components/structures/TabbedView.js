/*
Copyright 2017 Travis Ralston

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

import * as React from "react";
import {_t, _td} from '../../languageHandler';

const DEFAULT_EXIT_STRING = _td("Return to app");

/**
 * Represents a tab for the TabbedView
 */
export class Tab {
    /**
     * Creates a new tab
     * @param {string} tabLabel The untranslated tab label
     * @param {string} tabJsx The JSX for the tab container.
     */
    constructor(tabLabel, tabJsx) {
        this.label = tabLabel;
        this.body = tabJsx;
    }
}

export class TabbedView extends React.Component {
    constructor() {
        super();
    }

    /**
     * Shows the given tab
     * @param {Tab} tab the tab to show
     * @private
     */
    _showTab(tab) {
        console.log("Show tab: " + tab.label);
    }

    /**
     * Gets the label for a tab
     * @param {Tab} tab the tab
     * @returns {string} The tab label
     * @private
     */
    _getTabLabel(tab) {
        return (
            <span className="mx_TabbedView_tabLabel" onClick={() => this._showTab(tab)}>
                { _t(tab.label) }
            </span>
        );
    }

    render() {
        const labels = [];
        const panels = [];

        for (const tab of this.props.tabs) {
            labels.push(this._getTabLabel(tab));
            panels.push((
                <div className="mx_TabbedView_tabPanel">
                    { tab.body }
                </div>
            ));
        }

        const returnToApp = (
            <span className="mx_TabbedView_tabLabel" onClick={this.props.onExit}>
                { _t(this.props.exitLabel || DEFAULT_EXIT_STRING) }
            </span>
        );

        return (
            <div className="mx_TabbedView">
                <div className="mx_TabbedView_tabLabels">
                    { returnToApp }
                    { labels }
                </div>
                <div className="mx_TabbedView_tabPanels">
                    { panels }
                </div>
            </div>
        );
    }
}

TabbedView.PropTypes = {
    // Called when the user clicks the "Exit" or "Return to app" button
    onExit: React.PropTypes.func.isRequired,

    // The untranslated label for the "Return to app" button.
    // Default: "Return to app"
    exitLabel: React.PropTypes.string,

    // The tabs to show
    tabs: React.PropTypes.arrayOf(Tab).isRequired,
};
