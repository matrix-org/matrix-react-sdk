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
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { MatrixClient } from 'matrix-js-sdk';
import { KeyCode } from '../../Keyboard';
import sdk from '../../index';
import dis from '../../dispatcher';
import VectorConferenceHandler from '../../VectorConferenceHandler';

import SettingsStore from '../../settings/SettingsStore';


var LeftPanel = React.createClass({
    displayName: 'LeftPanel',

    // NB. If you add props, don't forget to update
    // shouldComponentUpdate!
    propTypes: {
        collapsed: PropTypes.bool.isRequired,
    },

    contextTypes: {
        matrixClient: PropTypes.instanceOf(MatrixClient),
    },

    getInitialState: function() {
        return {
            searchFilter: '',
        };
    },

    componentWillMount: function() {
        this.focusedElement = null;
    },

    shouldComponentUpdate: function(nextProps, nextState) {
        // MatrixChat will update whenever the user switches
        // rooms, but propagating this change all the way down
        // the react tree is quite slow, so we cut this off
        // here. The RoomTiles listen for the room change
        // events themselves to know when to update.
        // We just need to update if any of these things change.
        if (
            this.props.collapsed !== nextProps.collapsed ||
            this.props.disabled !== nextProps.disabled
        ) {
            return true;
        }

        if (this.state.searchFilter !== nextState.searchFilter) {
            return true;
        }

        return false;
    },

    _onFocus: function(ev) {
        this.focusedElement = ev.target;
    },

    _onBlur: function(ev) {
        this.focusedElement = null;
    },

    _onKeyDown: function(ev) {
        if (!this.focusedElement) return;
        let handled = true;

        switch (ev.keyCode) {
            case KeyCode.TAB:
                this._onMoveFocus(ev.shiftKey);
                break;
            case KeyCode.UP:
                this._onMoveFocus(true);
                break;
            case KeyCode.DOWN:
                this._onMoveFocus(false);
                break;
            case KeyCode.ENTER:
                this._onMoveFocus(false);
                if (this.focusedElement) {
                    this.focusedElement.click();
                }
                break;
            default:
                handled = false;
        }

        if (handled) {
            ev.stopPropagation();
            ev.preventDefault();
        }
    },

    _onMoveFocus: function(up) {
        let element = this.focusedElement;

        // unclear why this isn't needed
        // var descending = (up == this.focusDirection) ? this.focusDescending : !this.focusDescending;
        // this.focusDirection = up;

        let descending = false; // are we currently descending or ascending through the DOM tree?
        let classes;

        do {
            const child = up ? element.lastElementChild : element.firstElementChild;
            const sibling = up ? element.previousElementSibling : element.nextElementSibling;

            if (descending) {
                if (child) {
                    element = child;
                } else if (sibling) {
                    element = sibling;
                } else {
                    descending = false;
                    element = element.parentElement;
                }
            } else {
                if (sibling) {
                    element = sibling;
                    descending = true;
                } else {
                    element = element.parentElement;
                }
            }

            if (element) {
                classes = element.classList;
                if (classes.contains("mx_LeftPanel")) { // we hit the top
                    element = up ? element.lastElementChild : element.firstElementChild;
                    descending = true;
                }
            }
        } while (element && !(
            classes.contains("mx_RoomTile") ||
            classes.contains("mx_SearchBox_search") ||
            classes.contains("mx_RoomSubList_ellipsis")));

        if (element) {
            element.focus();
            this.focusedElement = element;
            this.focusedDescending = descending;
        }
    },

    onHideClick: function() {
        dis.dispatch({
            action: 'hide_left_panel',
        });
    },

    onSearch: function(term) {
        this.setState({ searchFilter: term });
    },

    collectRoomList: function(ref) {
        this._roomList = ref;
    },

    render: function() {
        const RoomList = sdk.getComponent('rooms.RoomList');
        const TagPanel = sdk.getComponent('structures.TagPanel');
        const BottomLeftMenu = sdk.getComponent('structures.BottomLeftMenu');
        const CallPreview = sdk.getComponent('voip.CallPreview');

        let topBox;
        if (this.context.matrixClient.isGuest()) {
            const LoginBox = sdk.getComponent('structures.LoginBox');
            topBox = <LoginBox collapsed={ this.props.collapsed }/>;
        } else {
            const SearchBox = sdk.getComponent('structures.SearchBox');
            topBox = <SearchBox collapsed={ this.props.collapsed } onSearch={ this.onSearch } />;
        }

        const classes = classNames(
            "mx_LeftPanel",
            {
                "collapsed": this.props.collapsed,
            },
        );

        const tagPanelEnabled = !SettingsStore.getValue("TagPanel.disableTagPanel");
        const tagPanel = tagPanelEnabled ? <TagPanel /> : <div />;

        const containerClasses = classNames(
            "mx_LeftPanel_container", "mx_fadable",
            {
                "mx_LeftPanel_container_collapsed": this.props.collapsed,
                "mx_LeftPanel_container_hasTagPanel": tagPanelEnabled,
                "mx_fadable_faded": this.props.disabled,
            },
        );

        return (
            <div className={containerClasses}>
                { tagPanel }
                <aside className={classes} onKeyDown={ this._onKeyDown } onFocus={ this._onFocus } onBlur={ this._onBlur }>
                    { topBox }
                    <CallPreview ConferenceHandler={VectorConferenceHandler} />
                    <RoomList
                        ref={this.collectRoomList}
                        collapsed={this.props.collapsed}
                        searchFilter={this.state.searchFilter}
                        ConferenceHandler={VectorConferenceHandler} />
                    <BottomLeftMenu collapsed={this.props.collapsed}/>
                </aside>
            </div>
        );
    }
});

module.exports = LeftPanel;
