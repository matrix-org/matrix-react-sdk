/*
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

import React from 'react';

import sdk from '../../../index';

import { COUNTRIES } from '../../../phonenumber';
import { charactersToImageNode } from '../../../HtmlUtils';

function countryMatchesSearchQuery(query, country) {
    if (country.name.toUpperCase().indexOf(query.toUpperCase()) == 0) return true;
    if (country.iso2 == query.toUpperCase()) return true;
    if (country.prefix == query) return true;
    return false;
}

export default class CountryDropdown extends React.Component {
    constructor() {
        super();
        this.onOptionChange = this.onOptionChange.bind(this);
        this._onSearchChange = this._onSearchChange.bind(this);

        this.state = {
            searchQuery: '',
        }
    }

    _onSearchChange(search) {
        this.setState({
            searchQuery: search,
        });
    }

    onOptionChange() {
    }

    _flagImgForIso2(iso2) {
        // Unicode Regional Indicator Symbol letter 'A'
        const RIS_A = 0x1F1E6;
        const ASCII_A = 65;
        return charactersToImageNode(iso2,
            RIS_A + (iso2.charCodeAt(0) - ASCII_A),
            RIS_A + (iso2.charCodeAt(1) - ASCII_A),
        );
    }

    render() {
        const Dropdown = sdk.getComponent('elements.Dropdown');

        let displayedCountries;
        if (this.state.searchQuery) {
            displayedCountries = COUNTRIES.filter(
                countryMatchesSearchQuery.bind(this, this.state.searchQuery),
            );
        } else {
            displayedCountries = COUNTRIES;
        }

        const options = displayedCountries.map((country) => {
            return <div key={country.iso2}>
                {this._flagImgForIso2(country.iso2)}
                {country.name}
            </div>;
        });

        return <Dropdown className={this.props.className}
            onOptionChange={this.onOptionChange} onSearchChange={this._onSearchChange}
            menuWidth={298} getShortOption={this._flagImgForIso2}
        >
            {options}
        </Dropdown>
    }
}
