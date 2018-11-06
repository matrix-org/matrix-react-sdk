/*
Copyright 2015, 2016 OpenMarket Ltd

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

'use strict';

import React from 'react';
import { _t } from '../../languageHandler';
import { KeyCode } from '../../Keyboard';
import sdk from '../../index';
import dis from '../../dispatcher';
import rate_limited_func from '../../ratelimitedfunc';
import AccessibleButton from '../../components/views/elements/AccessibleButton';

module.exports = React.createClass({
    displayName: 'SearchBox',

    propTypes: {
        collapsed: React.PropTypes.bool,
        onSearch: React.PropTypes.func,
    },

    getInitialState: function() {
        return {
            searchTerm: "",
        };
    },

    componentDidMount: function() {
        this.dispatcherRef = dis.register(this.onAction);
    },

    componentWillUnmount: function() {
        dis.unregister(this.dispatcherRef);
    },

    onAction: function(payload) {
        switch (payload.action) {
            case 'view_room':
                if (this.refs.search && payload.clear_search) {
                    this._clearSearch();
                }
                break;
            case 'focus_room_filter':
                if (this.refs.search) {
                    this.refs.search.focus();
                    this.refs.search.select();
                }
                break;
        }
    },

    onChange: function() {
        if (!this.refs.search) return;
        this.setState({ searchTerm: this.refs.search.value });
        this.onSearch();
    },

    onSearch: new rate_limited_func(
        function() {
            this.props.onSearch(this.refs.search.value);
        },
        100,
    ),

    onToggleCollapse: function(show) {
        if (show) {
            dis.dispatch({
                action: 'show_left_panel',
            });
        } else {
            dis.dispatch({
                action: 'hide_left_panel',
            });
        }
    },

    _onKeyDown: function(ev) {
        switch (ev.keyCode) {
            case KeyCode.ESCAPE:
                this._clearSearch();
                dis.dispatch({action: 'focus_composer'});
                break;
        }
    },

    _clearSearch: function() {
        this.refs.search.value = "";
        this.onChange();
    },

    render: function() {
        const TintableSvg = sdk.getComponent('elements.TintableSvg');

        const collapseTabIndex = this.refs.search && this.refs.search.value !== "" ? "-1" : "0";

        let toggleCollapse;
        if (this.props.collapsed) {
            toggleCollapse =
                <AccessibleButton className="mx_SearchBox_maximise" tabIndex={collapseTabIndex} onClick={ this.onToggleCollapse.bind(this, true) }>
                    <TintableSvg src="img/maximise.svg" width="10" height="16" alt={ _t("Expand panel") } />
                </AccessibleButton>;
        } else {
            toggleCollapse =
                <AccessibleButton className="mx_SearchBox_minimise" tabIndex={collapseTabIndex} onClick={ this.onToggleCollapse.bind(this, false) }>
                    <TintableSvg src="img/minimise.svg" width="10" height="16" alt={ _t("Collapse panel") } />
                </AccessibleButton>;
        }

        let searchControls;
        if (!this.props.collapsed) {
            searchControls = [
                    this.state.searchTerm.length > 0 ?
                    <AccessibleButton key="button"
                            className="mx_SearchBox_closeButton"
                            onClick={ ()=>{ this._clearSearch(); } }>
                        <TintableSvg
                            className="mx_SearchBox_searchButton"
                            src="img/icons-close.svg" width="24" height="24"
                        />
                    </AccessibleButton>
                    :
                    <TintableSvg
                        key="button"
                        className="mx_SearchBox_searchButton"
                        src="img/icons-search-copy.svg" width="13" height="13"
                    />,
                    <input
                        key="searchfield"
                        type="text"
                        ref="search"
                        className="mx_SearchBox_search"
                        value={ this.state.searchTerm }
                        onChange={ this.onChange }
                        onKeyDown={ this._onKeyDown }
                        placeholder={ _t('Filter room names') }
                    />,
                ];
        }

        const self = this;
        return (
            <div className="mx_SearchBox">
                { searchControls }
                { toggleCollapse }
            </div>
        );
    },
});
