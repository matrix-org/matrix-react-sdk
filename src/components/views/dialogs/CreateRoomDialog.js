/*
Copyright 2017 Michael Telatynski <7t3chguy@gmail.com>

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
import sdk from '../../../index';
import SdkConfig from '../../../SdkConfig';
import { _t } from '../../../languageHandler';
import Tchap from '../../../Tchap';
import LabelledToggleSwitch from "../elements/LabelledToggleSwitch";

export default React.createClass({
    displayName: 'CreateRoomDialog',
    propTypes: {
        onFinished: PropTypes.func.isRequired,
    },

    getInitialState: function() {
        const domain = Tchap.getShortDomain();
        return {
            errorText: null,
            visibility: 'private',
            isPublic: false,
            federate: false,
            domain: domain,
            externAllowed: false,
            externAllowedSwitchDisabled: false
        };
    },

    onOk: function() {
        if (this.refs.textinput.value.trim().length < 1) {
            this.setState({
                errorText: _t("Room name is required"),
            });
        } else {
            const opts = {
                visibility: this.state.visibility,
                preset: this.state.visibility === 'public' ? 'public_chat' : 'private_chat',
                noFederate: this.state.federate,
                access_rules: this.state.externAllowed === true ? 'unrestricted' : 'restricted'
            };
            this.props.onFinished(true, this.refs.textinput.value, opts);
        }
    },

    onCancel: function() {
        this.props.onFinished(false);
    },

    _onRoomVisibilityRadioToggle: function(ev) {
        if (ev.target.value === "public") {
            this.setState({
                externAllowed: false,
                externAllowedSwitchDisabled: true,
                visibility: ev.target.value
            });
        } else {
            this.setState({
                externAllowedSwitchDisabled: false,
                visibility: ev.target.value
            });
        }
    },

    _onFederateSwitchChange: function(ev) {
        this.setState({
            federate: ev
        });
    },

    _onExternAllowedSwitchChange: function(ev) {
        this.setState({
            externAllowed: ev
        });
    },

    render: function() {
        const BaseDialog = sdk.getComponent('views.dialogs.BaseDialog');
        const DialogButtons = sdk.getComponent('views.elements.DialogButtons');
        const errorText = this.state.errorText;

        let errorTextSection;
        if (errorText) {
            errorTextSection = (
                <div className="mx_AddressPickerDialog_error">
                    { errorText }
                </div>
            );
        }

        let federationOption;
        if (this.state.visibility === 'public') {
            federationOption = (
                <LabelledToggleSwitch value={this.state.federate}
                                      onChange={ this._onFederateSwitchChange }
                                      label={ _t('Limit access to this room to domain members "%(domain)s"', {domain: this.state.domain}) } />
            );
        }

        let inputAvatarContainerClass = "mx_CreateRoomDialog_input_avatar_container";
        if (this.state.externAllowed) {
            inputAvatarContainerClass += " mx_CreateRoomDialog_input_avatar_container_unrestricted";
        } else {
            inputAvatarContainerClass += " mx_CreateRoomDialog_input_avatar_container_restricted";
        }

        return (
            <BaseDialog className="mx_CreateRoomDialog" onFinished={this.props.onFinished}
                title={_t('Create Room')}
            >
                <form onSubmit={this.onOk}>
                    <div className="mx_Dialog_content mx_SettingsTab_section">
                        <div className="mx_CreateRoomDialog_label">
                            <label htmlFor="textinput"> { _t('Room name (required)') } </label>
                        </div>
                        <div className="mx_CreateRoomDialog_input_container">
                            <div className={inputAvatarContainerClass}>
                                <img src={require("../../../../res/img/8b8999.png")} alt="Avatar"/>
                            </div>
                            <input id="textinput" ref="textinput" className="mx_CreateRoomDialog_input" autoFocus={true} />
                        </div>
                        {errorTextSection}
                        <br />

                        <label htmlFor="roomVis"> { _t('Room type') } : </label>
                        <label>
                            <input type="radio" name="roomVis" value="private"
                                   onChange={this._onRoomVisibilityRadioToggle}
                                   checked={this.state.visibility === "private"} />
                            { _t('Private') }
                        </label>
                        <label>
                            <input type="radio" name="roomVis" value="public"
                                   onChange={this._onRoomVisibilityRadioToggle}
                                   checked={this.state.visibility !== "private"} />
                            { _t('Public') }
                        </label>
                        <br />
                        <br />
                        <LabelledToggleSwitch value={this.state.externAllowed}
                                              onChange={ this._onExternAllowedSwitchChange }
                                              label={ _t("Allow the externals to join this room") }
                                              disabled={ this.state.externAllowedSwitchDisabled } />
                        { federationOption }
                    </div>
                </form>
                <DialogButtons primaryButton={_t('Create Room')}
                    onPrimaryButtonClick={this.onOk}
                    onCancel={this.onCancel} />
            </BaseDialog>
        );
    },
});
