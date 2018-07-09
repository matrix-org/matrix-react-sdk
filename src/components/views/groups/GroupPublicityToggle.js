/*
Copyright 2017 New Vector Ltd

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
import GroupStore from '../../../stores/GroupStore';
import { _t } from '../../../languageHandler.js';

export default React.createClass({
    displayName: 'GroupPublicityToggle',

    propTypes: {
        groupId: PropTypes.string.isRequired,
    },

    getInitialState() {
        return {
            busy: false,
            ready: false,
            isGroupPublicised: null,
        };
    },

    componentWillMount: function() {
        this._initGroupStore(this.props.groupId);
    },

    _initGroupStore: function(groupId) {
        this._groupStoreToken = GroupStore.registerListener(groupId, () => {
            this.setState({
                isGroupPublicised: GroupStore.getGroupPublicity(groupId),
                ready: GroupStore.isStateReady(groupId, GroupStore.STATE_KEY.Summary),
            });
        });
    },

    componentWillUnmount() {
        if (this._groupStoreToken) this._groupStoreToken.unregister();
    },

    _onPublicityToggle: function(e) {
        e.stopPropagation();
        this.setState({
            busy: true,
            // Optimistic early update
            isGroupPublicised: !this.state.isGroupPublicised,
        });
        GroupStore.setGroupPublicity(this.props.groupId, !this.state.isGroupPublicised).then(() => {
            this.setState({
                busy: false,
            });
        });
    },

    render() {
        const GroupTile = sdk.getComponent('groups.GroupTile');
        const input = <input type="checkbox"
            onChange={this._onPublicityToggle}
            checked={this.state.isGroupPublicised}
        />;
        const labelText = !this.state.ready ? _t("Loading...") :
            (this.state.isGroupPublicised ?
             _t("Flair will appear if enabled in room settings") :
             _t("Flair will not appear")
            );
        return <div className="mx_GroupPublicity_toggle">
            <GroupTile groupId={this.props.groupId} showDescription={false} avatarHeight={40} />
            <label onClick={this._onPublicityToggle}>
                { input }
                { labelText }
            </label>
        </div>;
    },
});
