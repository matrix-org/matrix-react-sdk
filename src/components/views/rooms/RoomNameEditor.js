/*
Copyright 2016 OpenMarket Ltd

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

const React = require('react');
import PropTypes from 'prop-types';
const sdk = require('../../../index');
const MatrixClientPeg = require('../../../MatrixClientPeg');
import { _t } from '../../../languageHandler';

module.exports = React.createClass({
    displayName: 'RoomNameEditor',

    propTypes: {
        room: PropTypes.object.isRequired,
    },

    getInitialState: function() {
        return {
            name: null,
        };
    },

    componentWillMount: function() {
        const room = this.props.room;
        const name = room.currentState.getStateEvents('m.room.name', '');
        const myId = MatrixClientPeg.get().credentials.userId;
        const defaultName = room.getDefaultRoomName(myId);

        this.setState({
            name: name ? name.getContent().name : '',
        });

        this._placeholderName = _t("Unnamed Room");
        if (defaultName && defaultName !== 'Empty room') { // default name from JS SDK, needs no translation as we don't ever show it.
            this._placeholderName += " (" + defaultName + ")";
        }
    },

    getRoomName: function() {
        return this.state.name;
    },

    _onValueChanged: function(value, shouldSubmit) {
        this.setState({
            name: value,
        });
    },

    render: function() {
        const EditableText = sdk.getComponent("elements.EditableText");

        return (
                <div className="mx_RoomHeader_name">
                    <EditableText ref="editor"
                         className="mx_RoomHeader_nametext mx_RoomHeader_editable"
                         placeholderClassName="mx_RoomHeader_placeholder"
                         placeholder={this._placeholderName}
                         blurToCancel={false}
                         initialValue={this.state.name}
                         onValueChanged={this._onValueChanged}
                         dir="auto" />
                </div>
        );
    },
});
