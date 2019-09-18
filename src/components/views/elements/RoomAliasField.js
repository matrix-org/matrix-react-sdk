/*
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
import { _t } from '../../../languageHandler';
import React from 'react';
import PropTypes from 'prop-types';
import sdk from '../../../index';
import withValidation from './Validation';

export const SAFE_LOCALPART_REGEX = /^[a-z0-9=_\-./]+$/;

export default class RoomAliasField extends React.PureComponent {
    static propTypes = {
        domain: PropTypes.string.isRequired,
        onChange: PropTypes.func,
    };

    render() {
        const Field = sdk.getComponent('views.elements.Field');
        return (
            <div className="mx_RoomAliasField">
                <span>#</span>
                <Field ref={ref => this._fieldRef = ref} onValidate={this._onValidate} placeholder={_t("e.g. my-room")} onChange={this.props.onChange} />
                <span>:{this.props.domain}</span>
            </div>
        );
    }

    _onValidate(fieldState) {
        const result = this._validationRules(fieldState);
        this.setState({isValid: result.valid});
        return result;
    }

    _validationRules = withValidation({
        rules: [
            {
                key: "safeLocalpart",
                test: ({ value }) => !value || SAFE_LOCALPART_REGEX.test(value),
                invalid: () => _t("Some characters not allowed"),
            },
        ],
    });

    get isValid() {
        return this.state.isValid;
    }

    validate(...params) {
        return this._fieldRef.validate(...params);
    }

    focus() {
        this._fieldRef.focus();
    }
}

