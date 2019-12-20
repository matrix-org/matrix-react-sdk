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

import React, {createRef} from 'react';
import createReactClass from 'create-react-class';
import AccessibleButton from "../elements/AccessibleButton";
import classNames from "classnames";
import { _t } from '../../../languageHandler';

export default createReactClass({
    displayName: 'SearchBar',

    getInitialState: function() {
        return ({
            scope: 'Room',
        });
    },

    UNSAFE_componentWillMount: function() {
        this._search_term = createRef();
    },

    onThisRoomClick: function() {
        this.setState({ scope: 'Room' }, () => this._searchIfQuery());
    },

    onAllRoomsClick: function() {
        this.setState({ scope: 'All' }, () => this._searchIfQuery());
    },

    onSearchChange: function(e) {
        if (e.keyCode === 13) { // on enter...
            this.onSearch();
        }
        if (e.keyCode === 27) { // escape...
            this.props.onCancelClick();
        }
    },

    _searchIfQuery: function() {
        if (this._search_term.current.value) {
            this.onSearch();
        }
    },

    onSearch: function() {
        this.props.onSearch(this._search_term.current.value, this.state.scope);
    },

    render: function() {
        const searchButtonClasses = classNames("mx_SearchBar_searchButton", {
            mx_SearchBar_searching: this.props.searchInProgress,
        });
        const thisRoomClasses = classNames("mx_SearchBar_button", {
            mx_SearchBar_unselected: this.state.scope !== 'Room',
        });
        const allRoomsClasses = classNames("mx_SearchBar_button", {
            mx_SearchBar_unselected: this.state.scope !== 'All',
        });

        return (
            <div className="mx_SearchBar">
                <div className="mx_SearchBar_buttons" role="radiogroup">
                    <AccessibleButton className={ thisRoomClasses } onClick={this.onThisRoomClick} aria-checked={this.state.scope === 'Room'} role="radio">
                        {_t("This Room")}
                    </AccessibleButton>
                    <AccessibleButton className={ allRoomsClasses } onClick={this.onAllRoomsClick} aria-checked={this.state.scope === 'All'} role="radio">
                        {_t("All Rooms")}
                    </AccessibleButton>
                </div>
                <div className="mx_SearchBar_input mx_textinput">
                    <input ref={this._search_term} type="text" autoFocus={true} placeholder={_t("Search…")} onKeyDown={this.onSearchChange} />
                    <AccessibleButton className={ searchButtonClasses } onClick={this.onSearch} />
                </div>
                <AccessibleButton className="mx_SearchBar_cancel" onClick={this.props.onCancelClick} />
            </div>
        );
    },
});
