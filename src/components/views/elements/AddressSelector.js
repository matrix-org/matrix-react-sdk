/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd

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
import sdk from '../../../index';
import classNames from 'classnames';
import { InviteAddressType } from './AddressTile';

export default React.createClass({
    displayName: 'AddressSelector',

    propTypes: {
        onSelected: React.PropTypes.func.isRequired,

        // List of the addresses to display
        addressList: React.PropTypes.arrayOf(InviteAddressType).isRequired,
        truncateAt: React.PropTypes.number.isRequired,
        selected: React.PropTypes.number,

        // Element to put as a header on top of the list
        header: React.PropTypes.node,
    },

    getInitialState: function() {
        return {
            selected: this.props.selected === undefined ? 0 : this.props.selected,
            hover: false,
            groupDropDownExpanded: false,
            groupFilters: {},
        };
    },

    componentWillReceiveProps: function(props) {
        // Make sure the selected item isn't outside the list bounds
        var selected = this.state.selected;
        var maxSelected = this._maxSelected(props.addressList);
        if (selected > maxSelected) {
            this.setState({ selected: maxSelected });
        }
    },

    componentDidUpdate: function() {
        // As the user scrolls with the arrow keys keep the selected item
        // at the top of the window.
        if (this.scrollElement && this.props.addressList.length > 0 && !this.state.hover) {
            var elementHeight = this.addressListElement.getBoundingClientRect().height;
            this.scrollElement.scrollTop = (this.state.selected * elementHeight) - elementHeight;
        }
    },

    moveSelectionTop: function() {
        if (this.state.selected > 0) {
            this.setState({
                selected: 0,
                hover: false,
            });
        }
    },

    moveSelectionUp: function() {
        if (this.state.selected > 0) {
            this.setState({
                selected: this.state.selected - 1,
                hover : false,
            });
        }
    },

    moveSelectionDown: function() {
        if (this.state.selected < this._maxSelected(this.props.addressList)) {
            this.setState({
                selected: this.state.selected + 1,
                hover : false,
            });
        }
    },

    chooseSelection: function() {
        this.selectAddress(this.state.selected);
    },

    onClick: function(index) {
        this.selectAddress(index);
    },

    onGroupDropdownClicked: function(ev) {
        this.setState({
            groupDropDownExpanded: true,
        });
    },

    onGroupFilterChanged: function(index) {
        console.info(arguments);
        const groupFilters = this.state.groupFilters;
        groupFilters[index] = !groupFilters[index];
        this.setState({
            groupFilters: groupFilters,
        });
    },

    onMouseEnter: function(index) {
        this.setState({
            selected: index,
            hover: true,
        });
    },

    onMouseLeave: function() {
        this.setState({ hover : false });
    },

    selectAddress: function(index) {
        // Only try to select an address if one exists
        if (this.props.addressList.length !== 0) {
            this.props.onSelected(index);
            this.setState({ hover: false });
        }
    },

    createAddressListTiles: function() {
        var self = this;
        var AddressTile = sdk.getComponent("elements.AddressTile");
        var maxSelected = this._maxSelected(this.props.addressList);
        var addressList = [];

        console.info(this.state.groupFilters);
        const includeGroups = Object.keys(this.state.groupFilters).filter((i) => this.state.groupFilters[i]);
        console.info('include', includeGroups);

        // Only create the address elements if there are address
        if (this.props.addressList.length > 0) {
            for (var i = 0; i <= maxSelected; i++) {
                var classes = classNames({
                    "mx_AddressSelector_addressListElement": true,
                    "mx_AddressSelector_selected": this.state.selected === i,
                });

                if (includeGroups.length > 0) {
                    const addressGroups = this.props.addressList[i].groups.map((g) => g.name);

                    if (!includeGroups.some((group) => addressGroups.includes(group))) {
                        continue;
                    }
                }

                // NOTE: Defaulting to "vector" as the network, until the network backend stuff is done.
                // Saving the addressListElement so we can use it to work out, in the componentDidUpdate
                // method, how far to scroll when using the arrow keys
                addressList.push(
                    <div
                        className={classes}
                        onClick={this.onClick.bind(this, i)}
                        onMouseEnter={this.onMouseEnter.bind(this, i)}
                        onMouseLeave={this.onMouseLeave}
                        key={this.props.addressList[i].addressType + "/" + this.props.addressList[i].address}
                        ref={(ref) => { this.addressListElement = ref; }}
                    >
                        <AddressTile address={this.props.addressList[i]} justified={true} networkName="vector" networkUrl="img/search-icon-vector.svg" />
                    </div>
                );
            }
        }
        return addressList;
    },

    createGroupFilter: function() {
        if (this.props.addressList.length > 0) {
            const uniqueGroups = new Set(
                this.props.addressList
                    .map((address) => address.groups)
                    .reduce((a, b) => a.concat(b))
                    .map((group) => group.name),
            );

            const groupTiles = this.state.groupDropDownExpanded ? [...uniqueGroups].map((name) => {
                console.info(Boolean(this.state.groupFilters[name]));
                return <div className="mx_AddressSelector_filter_dropdown_tile" key={name} onClick={this.onGroupFilterChanged.bind(this, name)}>
                    { name } <input type="checkbox" checked={Boolean(this.state.groupFilters[name])}/>
                </div>;
            }) : <div className="mx_AddressSelector_filter_dropdown_header">
                Click here to filter by group <span className="mx_AddressSelector_filter_dropdown_chevron"></span>
            </div>;

            if (groupTiles.length === 0) {
                return;
            }

            const classes = classNames({
                "mx_AddressSelector_filter_dropdown": true,
                "mx_AddressSelector_filter_dropdown_expanded":
                    this.state.groupDropDownExpanded,
            });

            return <div className={classes} onClick={this.onGroupDropdownClicked}>
                { groupTiles }
            </div>;
        }
    },

    _maxSelected: function(list) {
        var listSize = list.length === 0 ? 0 : list.length - 1;
        var maxSelected = listSize > (this.props.truncateAt - 1) ? (this.props.truncateAt - 1) : listSize;
        return maxSelected;
    },

    render: function() {
        var classes = classNames({
            "mx_AddressSelector_container": true,
            "mx_AddressSelector_empty": this.props.addressList.length === 0,
        });

        return (
            <div className={classes}>
                <div className="mx_AddressSelector" ref={(ref) => {this.scrollElement = ref;}}>
                    { this.props.header }
                    { this.createAddressListTiles() }
                </div>
                { this.createGroupFilter() }
            </div>
        );
    }
});
