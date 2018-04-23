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

var React = require('react');
var MatrixClientPeg = require('../../../MatrixClientPeg');
var sdk = require('../../../index');
var classNames = require('classnames');
var AccessibleButton = require('../../../components/views/elements/AccessibleButton');
import { _t } from '../../../languageHandler';

module.exports = React.createClass({
    displayName: 'SearchBar',

    getInitialState: function() {
        return ({
            scope: 'Room'
        });
    },

    onThisRoomClick: function() {
        this.setState({ scope: 'Room' });
    },

    onAllRoomsClick: function() {
        this.setState({ scope: 'All' });
    },

    onSearchChange: function(e) {
        if (e.keyCode === 13) { // on enter...
            this.onSearch();
        }
        if (e.keyCode === 27) { // escape...
            this.props.onCancelClick();
        }
    },

    onSearch: function() {
        this.props.onSearch(this.refs.search_term.value, this.state.scope);
    },

    render: function() {
        var searchButtonClasses = classNames({ mx_SearchBar_searchButton : true, mx_SearchBar_searching: this.props.searchInProgress });
        var thisRoomClasses = classNames({ mx_SearchBar_button : true, mx_SearchBar_unselected : this.state.scope !== 'Room' });
        var allRoomsClasses = classNames({ mx_SearchBar_button : true, mx_SearchBar_unselected : this.state.scope !== 'All' });

        return (
            <div className="mx_SearchBar"> 
                <input ref="search_term" className="mx_SearchBar_input" type="text" autoFocus={true} placeholder={_t("Search…")} onKeyDown={this.onSearchChange}/>
                <AccessibleButton className={ searchButtonClasses } onClick={this.onSearch}><img src="img/search-button.svg" width="37" height="37" alt={_t("Search")}/></AccessibleButton>
                <AccessibleButton className={ thisRoomClasses } onClick={this.onThisRoomClick}>{_t("This Room")}</AccessibleButton>
                <AccessibleButton className={ allRoomsClasses } onClick={this.onAllRoomsClick}>{_t("All Rooms")}</AccessibleButton>
                <AccessibleButton className="mx_SearchBar_cancel" onClick={this.props.onCancelClick}><img src="img/cancel.svg" width="18" height="18" /></AccessibleButton>
            </div>
        );
    }
});
