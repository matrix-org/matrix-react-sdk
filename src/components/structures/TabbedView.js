/*
Copyright 2017 Travis Ralston
Copyright 2019 New Vector Ltd

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
import {_t} from '../../languageHandler';
import PropTypes from "prop-types";

/**
 * Represents a tab for the TabbedView.
 */
export class Tab {
    /**
     * Creates a new tab.
     * @param {string} tabLabel The untranslated tab label.
     * @param {string} tabIconClass The class for the tab icon. This should be a simple mask.
     * @param {string} tabJsx The JSX for the tab container.
     */
    constructor(tabLabel, tabIconClass, tabJsx) {
        this.label = tabLabel;
        this.icon = tabIconClass;
        this.body = tabJsx;
    }
}

export class TabbedView extends React.Component {
    static propTypes = {
        // The tabs to show
        tabs: PropTypes.arrayOf(PropTypes.instanceOf(Tab)).isRequired,
    };

    constructor() {
        super();

        this.state = {
            activeTabIndex: 0,
        };
    }

    _getActiveTabIndex() {
        if (!this.state || !this.state.activeTabIndex) return 0;
        return this.state.activeTabIndex;
    }

    /**
     * Shows the given tab
     * @param {Tab} tab the tab to show
     * @private
     */
    _setActiveTab(tab) {
        const idx = this.props.tabs.indexOf(tab);
        if (idx !== -1) {
            this.setState({activeTabIndex: idx});
        } else {
            console.error("Could not find tab " + tab.label + " in tabs");
        }
    }

    _renderTabLabel(tab) {
        let classes = "mx_TabbedView_tabLabel ";

        const idx = this.props.tabs.indexOf(tab);
        if (idx === this._getActiveTabIndex()) classes += "mx_TabbedView_tabLabel_active";

        let tabIcon = null;
        if (tab.icon) {
            tabIcon = <span className={`mx_TabbedView_maskedIcon ${tab.icon}`} />;
        }

        const onClickHandler = () => this._setActiveTab(tab);

        return (
            <span className={classes} key={"tab_label_" + tab.label}
                  onClick={onClickHandler}>
                {tabIcon}
                <span className="mx_TabbedView_tabLabel_text">
                    {_t(tab.label)}
                </span>
            </span>
        );
    }

    _renderTabPanel(tab) {
        return (
            <div className="mx_TabbedView_tabPanel" key={"mx_tabpanel_" + tab.label}>
                <div className='mx_TabbedView_tabPanelContent'>
                    {tab.body}
                </div>
            </div>
        );
    }

    render() {
        const labels = this.props.tabs.map(tab => this._renderTabLabel(tab));
        const panel = this._renderTabPanel(this.props.tabs[this._getActiveTabIndex()]);

        return (
            <div className="mx_TabbedView">
                <div className="mx_TabbedView_tabLabels">
                    {labels}
                </div>
                {panel}
            </div>
        );
    }
}
