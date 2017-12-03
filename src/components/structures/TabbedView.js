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
import GeminiScrollbar from 'react-gemini-scrollbar';

const DEFAULT_EXIT_STRING = _td("Return to app");
const DELAY_BEFORE_NEXT_TAB = 25; // milliseconds before we'll accept scrolling to the next tab

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
        this.onMouseWheel = this.onMouseWheel.bind(this);

        // This is used to track when the user has scrolled all the way up or down so we
        // don't immediately start flipping between tabs.
        this._reachedEndAt = 0;
    }

    getInitialState() {
        return {
            activeTabIndex: 0,
        };
    }

    _getActiveTabIndex() {
        return this.state ? this.state.activeTabIndex : 0;
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
            this._reachedEndAt = 0; // reset scroll timer
        }
        else console.error("Could not find tab " + tab.label + " in tabs");
    }

    _nextTab() {
        let targetIndex = this._getActiveTabIndex() + 1;
        if (targetIndex < this.props.tabs.length) {
            this.setState({activeTabIndex: targetIndex});
            this._reachedEndAt = 0; // reset scroll timer
        }
    }

    _previousTab() {
        let targetIndex = this._getActiveTabIndex() - 1;
        if (targetIndex >= 0) {
            this.setState({activeTabIndex: targetIndex});
            this._reachedEndAt = 0; // reset scroll timer
        }
    }

    /**
     * Gets the label for a tab
     * @param {Tab} tab the tab
     * @returns {string} The tab label
     * @private
     */
    _getTabLabel(tab) {
        let classes = "mx_TabbedView_tabLabel ";

        const idx = this.props.tabs.indexOf(tab);
        if (idx === this._getActiveTabIndex()) classes += "mx_TabbedView_tabLabel_active";

        return (
            <span className={classes} key={"tab_label_ " + tab.label}
                  onClick={() => this._setActiveTab(tab)}>
                {_t(tab.label)}
            </span>
        );
    }

    _getScrollNode() {
        if (!this.refs.geminiScrollbar) return null;
        return this.refs.geminiScrollbar.scrollbar.getViewElement();
    }

    onMouseWheel(ev) {
        const node = this._getScrollNode();
        if (!node) {
            console.warn("Scrolling tabs without a scroll node!");
            return;
        }

        const availableHeight = window.innerHeight;
        const panelTop = node.scrollTop;
        const bottomY = panelTop + availableHeight;
        const absoluteBottom = node.scrollHeight;

        let direction = 0; // + = next, - = prev, 0 = no change
        if (bottomY >= absoluteBottom && ev.deltaY > 0) {
            direction = 1; // next tab
        }
        if (panelTop <= 0 && ev.deltaY < 0) {
            direction = -1; // previous tab
        }
        if (direction === 0) {
            // we're not scrolled enough, so reset our timeout and stop processing
            this._reachedEndAt = 0;
            return;
        }

        // we've scrolled enough: check our timer and scroll if we've waited long enough
        const now = new Date().getTime();
        if (this._reachedEndAt === 0) {
            this._reachedEndAt = now;
        } else if (now - this._reachedEndAt > DELAY_BEFORE_NEXT_TAB) {
            // next and previous tab methods both handle out of range values internally
            if (direction > 0) this._nextTab();
            else if (direction < 0) this._previousTab();
        }
    }

    render() {
        const labels = this.props.tabs.map(t => this._getTabLabel(t));

        let panel = <div>E_NO_TAB</div>; // This should never happen for a default
        const tab = this.props.tabs[this._getActiveTabIndex()];
        if (tab) {
            panel = (
                <div className="mx_TabbedView_tabPanel" key={"tab_panel_ " + tab.label}>
                    <GeminiScrollbar ref="geminiScrollbar" onWheel={this.onMouseWheel}>
                        <div className="mx_TabbedView_tabPanelContent">
                            {tab.body}
                        </div>
                    </GeminiScrollbar>
                </div>
            );
        }

        const returnToApp = (
            <span className="mx_TabbedView_tabLabel mx_TabbedView_exit" onClick={this.props.onExit}>
                {_t(this.props.exitLabel || DEFAULT_EXIT_STRING)}
            </span>
        );

        return (
            <div className="mx_TabbedView">
                <div className="mx_TabbedView_tabLabels">
                    {returnToApp}
                    {labels}
                </div>
                <div className="mx_TabbedView_tabPanels">
                    {panel}
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
