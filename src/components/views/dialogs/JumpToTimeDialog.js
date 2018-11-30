/*
Copyright 2018 New Vector Ltd.

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
import Modal from '../../..//Modal';
import SdkConfig from '../../../SdkConfig';
import { fuzzyParseTime } from '../../../utils/TimeUtils';
import OpenRoomsStore from "../../../stores/OpenRoomsStore";
import { _t } from '../../../languageHandler';
import ThreadViewStore from '../../../stores/ThreadViewStore';

export default React.createClass({
    displayName: 'JumpToTimeDialog',

    getInitialState: function() {
        return {
            timeStr: '',
            remoteChecked: false,
        };
    },

    _onOk: function(ev) {
        ev.preventDefault();
        const ts = fuzzyParseTime(this.state.timeStr);
        if (ts === null) {
            const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");

            Modal.createTrackedDialog('Invalid dtae-time group', '', ErrorDialog, {
                title: _t('Invalid DTG'),
                description: _t("Unable to parse input as a valid date-time group."),
            });
            this.props.onFinished(false);
            return;
        }

        if (ThreadViewStore.activeThreadEvent && this.state.remoteChecked) {
            dis.dispatch({
                action: 'view_right_panel_phase',
                phase: 'ThreadPanel',
                mxEvent: ThreadViewStore.activeThreadEvent,
                atEventId: 't'+ts,
            });
        } else {
            dis.dispatch({
                action: 'view_room',
                room_id: OpenRoomsStore.getActiveRoomStore().getRoomId(),
                event_id: 't'+ts,
            });
        }
        this.props.onFinished(true);
    },

    _onCancel: function(ev) {
        ev.preventDefault();
        this.props.onFinished(false);
    },

    _onDateInputChange: function(ev) {
        this.setState({
            timeStr: ev.target.value,
        });
    },

    _onRemoteCheckboxChange: function(ev) {
        this.setState({
            remoteChecked: ev.target.checked,
        });
    },

    render: function() {
        const BaseDialog = sdk.getComponent('views.dialogs.BaseDialog');
        const DialogButtons = sdk.getComponent('views.elements.DialogButtons');

        let remoteCheckbox;
        if (ThreadViewStore.activeThreadEvent) {
            remoteCheckbox = <div>
                <label htmlFor="mx_JumpToTimeDialog_remoteCheckBox">{_t("Jump to time in Remote Messages")}</label>
                <input id="mx_JumpToTimeDialog_remoteCheckBox" type="checkbox"
                    checked={this.state.remoteChecked}
                    onChange={this._onRemoteCheckboxChange}
                />
            </div>;
        }

        return (
            <BaseDialog className="mx_JumpToTimeDialog" onFinished={this.props.onFinished}
                title={_t('Jump to Date Group')}
            >
                <form onSubmit={this._onOk}>
                    <div className="mx_Dialog_content">
                        <input placeholder="9 Jul 2011…" autoFocus={true}
                            className="mx_SearchBar_input"
                            onChange={this._onDateInputChange}
                            value={this.state.timeStr}
                        />
                        <br />
                    </div>
                    {remoteCheckbox}
                </form>
                <DialogButtons primaryButton={_t('Continue')}
                    onPrimaryButtonClick={this._onOk}
                    hasCancel={false}
                />
            </BaseDialog>
        );
    },
});
