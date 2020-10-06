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
import PropTypes from 'prop-types';

import * as sdk from '../../../index';

import {COUNTRIES, getEmojiFlag} from '../../../phonenumber';
import SdkConfig from "../../../SdkConfig";
import { _t } from "../../../languageHandler";

const COUNTRIES_BY_ISO2: Record<string, Country> = {};

for (const c of COUNTRIES) {
    COUNTRIES_BY_ISO2[c.iso2] = c;
}

interface Country {
    iso2: string;
    name: string;
    prefix: string;
}

interface IProps {
    className?: string;
    showPrefix?: boolean;
    onOptionChange: (country: Country) => void;

    /** The country code to use. */
    value?: string;

    /** Whether or not to append a numeral prefix to the value. */
    isSmall?: boolean;

    disabled?: true;
}

function countryMatchesSearchQuery(query, country) {
    // Remove '+' if present (when searching for a prefix)
    if (query[0] === '+') {
        query = query.slice(1);
    }

    if (country.name.toUpperCase().indexOf(query.toUpperCase()) == 0) return true;
    if (country.iso2 == query.toUpperCase()) return true;
    if (country.prefix.indexOf(query) !== -1) return true;
    return false;
}

/** UI component that renders an emoji container for the dropdown. */
function FlagImgForISO2({ value }: IProps) {
    return (
        <div className="mx_Dropdown_option_emoji">{ getEmojiFlag(value) }</div>
    );
}

/** UI component that renders the short option for the dropdown. */
function ShortOption(props: IProps) {
    if (!props.isSmall) {
        return null;
    }

    const countryPrefix = props.showPrefix ? '+' + COUNTRIES_BY_ISO2[props.value].prefix : null;
    return (
        <span className="mx_CountryDropdown_shortOption">
            <FlagImgForISO2 {...props} />
            { countryPrefix }
        </span>
    );
}

/** UI component that renders an option in the country dropdown. */
function CountryDropdownOption(props: IProps & { country: Country }) {
    const { country } = props;

    return (
        <div className="mx_CountryDropdown_option" key={country.iso2}>
            { <FlagImgForISO2 {...props} /> }
            { props.country.name } (+{ country.prefix })
        </div>
    );
}

/** UI component that renders a country dropdown. */
export default function CountryDropdown(props: IProps) {
    const Dropdown = sdk.getComponent('elements.Dropdown');
    const defaultCountryCode = SdkConfig.get()["defaultCountryCode"];
    const defaultCountry = defaultCountryCode ? COUNTRIES_BY_ISO2[defaultCountryCode] : COUNTRIES[0];
    const [searchQuery, setSearchQuery] = React.useState('');
    const { onOptionChange, value: baseValue } = props;

    React.useEffect(() => {
        if (baseValue) {
            // If no value is given, we start with the default
            // country selected, but our parent component
            // doesn't know this, therefore we do this.
            onOptionChange(defaultCountry);
        }
    }, [onOptionChange, defaultCountry, baseValue]);

    let [displayedCountries, setDisplayedCountries] = React.useState<Country[]>([]);

    if (searchQuery) {
        // If we have a search query, we'll filter through the list of countries and render the result.
        setDisplayedCountries(COUNTRIES.filter(
            (country: Country) => countryMatchesSearchQuery(searchQuery, country),
        ));

        if (
            searchQuery.length == 2 &&
            COUNTRIES_BY_ISO2[searchQuery.toUpperCase()]
        ) {
            // The user is searching for an ISO2 code. Make the first result one
            // that matches the ISO2.
            const matched = COUNTRIES_BY_ISO2[searchQuery.toUpperCase()];

            // Insert the matched item into the start of the array.
            setDisplayedCountries([matched, ...displayedCountries.filter(country => country.iso2 != matched.iso2)]);
        }
    } else {
        // Otherwise, if there isn't a search query, we'll just render every country in the list.
        displayedCountries = COUNTRIES;
    }

    // Default value here too, otherwise we need to handle null / undefined
    // values between mounting and the initial value propagating.
    const value = props.value || defaultCountry.iso2;

    const options = displayedCountries.map((country) => (
        // Now it's time to take the options and render them.
        <CountryDropdownOption {...props} value={value} country={country} key={country.iso2} />
    ));

    return (
        <Dropdown
            id="mx_CountryDropdown"
            className={props.className + " mx_CountryDropdown"}
            onOptionChange={(iso2) => onOptionChange(COUNTRIES_BY_ISO2[iso2])}
            onSearchChange={(search) => setSearchQuery(search)}
            menuWidth={298}
            getShortOption={iso2 => <ShortOption {...props} value={iso2} />}
            value={value}
            searchEnabled={true}
            disabled={props.disabled}
            label={_t("Country Dropdown")}
        >
            { options }
        </Dropdown>
    );
}

CountryDropdown.propTypes = {
    className: PropTypes.string,
    isSmall: PropTypes.bool,
    // if isSmall, show +44 in the selected value
    showPrefix: PropTypes.bool,
    onOptionChange: PropTypes.func.isRequired,
    value: PropTypes.string,
    disabled: PropTypes.bool,
};
