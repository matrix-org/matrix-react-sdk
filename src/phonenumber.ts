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

import data from "countries-list/dist/minimal/countries.minimal.min.json";

const PHONE_NUMBER_REGEXP = /^[0-9 -.]+$/;

/*
 * Do basic validation to determine if the given input could be
 * a valid phone number.
 *
 * @param {String} phoneNumber The string to validate. This could be
 *     either an international format number (MSISDN or e.164) or
 *     a national-format number.
 * @return True if the number could be a valid phone number, otherwise false.
 */
export function looksValid(phoneNumber: string) {
    return PHONE_NUMBER_REGEXP.test(phoneNumber);
}

export const COUNTRIES = Object.keys(data).map(iso2 => {
    const [enName, nativeName, phonePrefixes, continent, capital, currencyCode, languages] = data[iso2];
    return {
        iso2,
        name: enName,
        prefix: phonePrefixes.split(",").pop(),
    };
});
