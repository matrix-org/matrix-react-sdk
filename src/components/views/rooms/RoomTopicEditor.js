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
import { _t } from "../../../languageHandler";

module.exports = class extends React.Component {
    static displayName = 'RoomTopicEditor';

    static propTypes = {
        room: PropTypes.object.isRequired,
    };

    state = {
        topic: null,
    };

    componentWillMount() {
        const room = this.props.room;
        const topic = room.currentState.getStateEvents('m.room.topic', '');
        this.setState({
            topic: topic ? topic.getContent().topic : '',
        });
    }

    getTopic = () => {
        return this.state.topic;
    };

    _onValueChanged = (value) => {
        this.setState({
            topic: value,
        });
    };

    render() {
        const EditableText = sdk.getComponent("elements.EditableText");

        return (
                <EditableText
                     className="mx_RoomHeader_topic mx_RoomHeader_editable"
                     placeholderClassName="mx_RoomHeader_placeholder"
                     placeholder={_t("Add a topic")}
                     blurToCancel={false}
                     initialValue={this.state.topic}
                     onValueChanged={this._onValueChanged}
                     dir="auto" />
        );
    }
};
