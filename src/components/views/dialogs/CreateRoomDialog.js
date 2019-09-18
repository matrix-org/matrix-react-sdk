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
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
import sdk from '../../../index';
import SdkConfig from '../../../SdkConfig';
import { _t } from '../../../languageHandler';
import MatrixClientPeg from '../../../MatrixClientPeg';

export default createReactClass({
    displayName: 'CreateRoomDialog',
    propTypes: {
        onFinished: PropTypes.func.isRequired,
    },

    getInitialState() {
        const config = SdkConfig.get();
        return {
            isPublic: false,
            name: "",
            topic: "",
            alias: "",
            detailsOpen: false,
            noFederate: config.default_federate === false,
        };
    },

    componentDidMount() {
        this._detailsRef.addEventListener("toggle", this._onDetailsToggled);
    },

    componentWillUnmount() {
        this._detailsRef.removeEventListener("toggle", this._onDetailsToggled);
    },

    onOk: function() {
        this.props.onFinished(true, this.state.name, this.state.noFederate);
    },

    onCancel: function() {
        this.props.onFinished(false);
    },

    onNameChange(ev) {
        this.setState({name: ev.target.value});
    },

    onTopicChange(ev) {
        this.setState({topic: ev.target.value});
    },

    onPublicChange(isPublic) {
        this.setState({isPublic});
    },

    onAliasChange(ev) {
        this.setState({alias: ev.target.value});
    },

    _onDetailsToggled(ev) {
        this.setState({detailsOpen: ev.target.open});
    },

    onNoFederateChange(noFederate) {
        this.setState({noFederate});
    },

    _collectDetailsRef(ref) {
        this._detailsRef = ref;
    },

    render: function() {
        const BaseDialog = sdk.getComponent('views.dialogs.BaseDialog');
        const DialogButtons = sdk.getComponent('views.elements.DialogButtons');
        const Field = sdk.getComponent('views.elements.Field');
        const LabelledToggleSwitch = sdk.getComponent('views.elements.LabelledToggleSwitch');
        const RoomAliasField = sdk.getComponent('views.elements.RoomAliasField');

        let privateLabel;
        let publicLabel;
        let aliasField;
        if (this.state.isPublic) {
            publicLabel = (<p>{_t("Set a room address to easily share your room with other people.")}</p>);
            const domain = MatrixClientPeg.get().getDomain();
            aliasField = (<RoomAliasField onChange={this.onAliasChange} domain={domain} />);
        } else {
            privateLabel = (<p>{_t("This room is private, and can only be joined by invitation.")}</p>);
        }

        const title = this.state.isPublic ? _t('Create a public room') : _t('Create a private room');
        return (
            <BaseDialog className="mx_CreateRoomDialog" onFinished={this.props.onFinished}
                title={title}
            >
                <form onSubmit={this.onOk}>
                    <div className="mx_Dialog_content">
                        <Field className="mx_CreateRoomDialog_input" label={ _t('Name') } onChange={this.onNameChange} />
                        <Field label={ _t('Topic (optional)') } onChange={this.onTopicChange} />
                        <LabelledToggleSwitch label={ _t("Make this room public")} onChange={this.onPublicChange} value={this.state.isPublic} />
                        { privateLabel }
                        { publicLabel }
                        { aliasField }
                        <details ref={this._collectDetailsRef} className="mx_CreateRoomDialog_details">
                            <summary className="mx_CreateRoomDialog_details_summary">{ this.state.detailsOpen ? _t('Hide advanced') : _t('Show advanced') }</summary>
                            <LabelledToggleSwitch label={ _t('Block users on other matrix homeservers from joining this room (This setting cannot be changed later!)')} onChange={this.onNoFederateChange} value={this.state.noFederate} />
                        </details>
                    </div>
                </form>
                <DialogButtons primaryButton={_t('Create Room')}
                    onPrimaryButtonClick={this.onOk}
                    onCancel={this.onCancel} />
            </BaseDialog>
        );
    },
});
