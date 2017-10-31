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
import sdk from '../../../index';
import dis from '../../../dispatcher';
import { _t } from '../../../languageHandler';
import MatrixClientPeg from '../../../MatrixClientPeg';

export default React.createClass({
    displayName: 'CreateGroupDialog',
    propTypes: {
        onFinished: PropTypes.func.isRequired,
    },

    getInitialState: function() {
        return {
            groupName: '',
            groupId: '',
            groupError: null,
            creating: false,
            createError: null,
        };
    },

    _onGroupNameChange: function(e) {
        this.setState({
            groupName: e.target.value,
        });
    },

    _onGroupIdChange: function(e) {
        this.setState({
            groupId: e.target.value,
        });
    },

    _onFormSubmit: function(e) {
        e.preventDefault();

        const profile = {};
        if (this.state.groupName !== '') {
            profile.name = this.state.groupName;
        }
        this.setState({creating: true});
        MatrixClientPeg.get().createGroup({
            localpart: this.state.groupId,
            profile: profile,
        }).then((result) => {
            dis.dispatch({
                action: 'view_group',
                group_id: result.group_id,
            });
            this.props.onFinished(true);
        }).catch((e) => {
            this.setState({createError: e});
        }).finally(() => {
            this.setState({creating: false});
        }).done();
    },

    _onCancel: function() {
        this.props.onFinished(false);
    },

    render: function() {
        const BaseDialog = sdk.getComponent('views.dialogs.BaseDialog');
        const Spinner = sdk.getComponent('elements.Spinner');

        if (this.state.creating) {
            return <Spinner />;
        }

        let createErrorNode;
        if (this.state.createError) {
            // XXX: We should catch errcodes and give sensible i18ned messages for them,
            // rather than displaying what the server gives us, but synapse doesn't give
            // any yet.
            createErrorNode = <div className="error">
                <div>{ _t('Something went wrong whilst creating your community') }</div>
                <div>{ this.state.createError.message }</div>
            </div>;
        }

        return (
            <BaseDialog className="mx_CreateGroupDialog" onFinished={this.props.onFinished}
                onEnterPressed={this._onFormSubmit}
                title={_t('Create Community')}
            >
                <form onSubmit={this._onFormSubmit}>
                    <div className="mx_Dialog_content">
                        <div className="mx_CreateGroupDialog_inputRow">
                            <div className="mx_CreateGroupDialog_label">
                                <label htmlFor="groupname">{ _t('Community Name') }</label>
                            </div>
                            <div>
                                <input id="groupname" className="mx_CreateGroupDialog_input"
                                    autoFocus={true} size="64"
                                    placeholder={_t('Example')}
                                    onChange={this._onGroupNameChange}
                                    value={this.state.groupName}
                                />
                            </div>
                        </div>
                        <div className="mx_CreateGroupDialog_inputRow">
                            <div className="mx_CreateGroupDialog_label">
                                <label htmlFor="groupid">{ _t('Community ID') }</label>
                            </div>
                            <div>
                                <span>+</span>
                                <input id="groupid" className="mx_CreateGroupDialog_input"
                                    size="32"
                                    placeholder={_t('example')}
                                    onChange={this._onGroupIdChange}
                                    value={this.state.groupId}
                                />
                                <span>:{ MatrixClientPeg.get().getDomain() }</span>
                            </div>
                        </div>
                        { createErrorNode }
                    </div>
                    <div className="mx_Dialog_buttons">
                        <button onClick={this._onCancel}>
                            { _t("Cancel") }
                        </button>
                        <input type="submit" value={_t('Create')} className="mx_Dialog_primary" />
                    </div>
                </form>
            </BaseDialog>
        );
    },
});
