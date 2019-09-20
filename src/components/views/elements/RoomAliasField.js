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

const SAFE_LOCALPART_REGEX = /^[a-z0-9=_\-./]+$/;

export default class RoomAliasField extends React.PureComponent {
    static propTypes = {
        id: PropTypes.string.isRequired,
        domain: PropTypes.string.isRequired,
        onChange: PropTypes.func,
    };

    constructor(props) {
        super(props);
        this.state = {isValid: true};
    }

    render() {
        const Field = sdk.getComponent('views.elements.Field');
        const poundSign = (<span>#</span>);
        const aliasPostfix = ":" + this.props.domain;
        const domain = (<span title={aliasPostfix}>{aliasPostfix}</span>);
        return (
                <Field
                    label={_t("Room alias")}
                    className="mx_RoomAliasField"
                    prefix={poundSign}
                    postfix={domain}
                    id={this.props.id}
                    ref={ref => this._fieldRef = ref}
                    onValidate={this._onValidate}
                    placeholder={_t("e.g. my-room")}
                    onChange={this.props.onChange} />
        );
    }

    _onValidate = async (fieldState) => {
        const result = await this._validationRules(fieldState);
        console.log("RoomAliasField.valid", fieldState.allowEmpty, result.valid);
        this.setState({isValid: result.valid});
        return result;
    };

    _validationRules = withValidation({
        rules: [
            {
                key: "safeLocalpart",
                test: async ({ value, allowEmpty }) => {
                    const result = (!value && allowEmpty) || SAFE_LOCALPART_REGEX.test(value);
                    console.log("validating", value, result);
                    return result;
                },
                invalid: () => _t("Some characters not allowed"),
            },
        ],
    });

    get isValid() {
        return this.state.isValid;
    }

    validate(options) {
        return this._fieldRef.validate(options);
    }

    focus() {
        this._fieldRef.focus();
    }
}
