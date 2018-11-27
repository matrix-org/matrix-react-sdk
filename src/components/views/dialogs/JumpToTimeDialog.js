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
import OpenRoomsStore from "../../../stores/OpenRoomsStore";
import { _t } from '../../../languageHandler';

function dtgTzToGmtOffset(tz) {
    switch (tz) {
        case 'Y':
            return '-1200';
        case 'X':
            return '-1100';
        case 'W':
            return '-1000';
        case 'V':
            return '-0900';
        case 'U':
            return '-0800';
        case 'T':
            return '-0700';
        case 'S':
            return '-0600';
        case 'R':
            return '-0500';
        case 'Q':
            return '-0400';
        case 'P':
            return '-0300';
        case 'O':
            return '-0200';
        case 'N':
            return '-0100';
        case 'Z':
            return '+0000';
        case 'A':
            return '+0100';
        case 'B':
            return '+0200';
        case 'C':
            return '+0100';
        case 'D':
            return '+0300';
        case 'E':
            return '+0400';
        case 'F':
            return '+0500';
        case 'G':
            return '+0600';
        case 'H':
            return '+0700';
        case 'I':
            return '+0800';
        case 'J':
            return '+0900';
        case 'K':
            return '+1000';
        case 'L':
            return '+1100';
        case 'M':
            return '+1200';
        default:
            return null;
    }
}

function dtgToTs(dtg) {
    const dtgRe = /([0-9]{2})([0-9]{2})([0-9]{2})([A-Z])([A-Z]{3})([0-9]{2})/;
    const strippedDtg = dtg.replace(/ /g, '').toUpperCase();
    const match = dtgRe.exec(strippedDtg);
    if (!match) return null;
    const [day, hour, minute, tz, mon, year] = match.slice(1);

    const gmtOffset = dtgTzToGmtOffset(tz);
    if (gmtOffset === null) return null;

    return new Date(`${mon} ${day} ${year} ${hour}:${minute}:00 GMT${gmtOffset}`).getTime();
}

export default React.createClass({
    displayName: 'JumpToTimeDialog',

    getInitialState: function() {
        return {
            dtg: '',
        };
    },

    _onOk: function(ev) {
        ev.preventDefault();
        const ts = dtgToTs(this.state.dtg);
        if (ts === null) {
            const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");

            Modal.createTrackedDialog('Invalid dtae-time group', '', ErrorDialog, {
                title: _t('Invalid DTG'),
                description: _t("Unable to parse input as a valid date-time group."),
            });
            return;
            this.props.onFinished(false);
        }

        dis.dispatch({
            action: 'view_room',
            room_id: OpenRoomsStore.getActiveRoomStore().getRoomId(),
            event_id: 't'+ts,
        });
        this.props.onFinished(true);
    },

    _onCancel: function(ev) {
        ev.preventDefault();
        this.props.onFinished(false);
    },

    _onDateInputChange: function(ev) {
        this.setState({
            dtg: ev.target.value,
        });
    },

    render: function() {
        const BaseDialog = sdk.getComponent('views.dialogs.BaseDialog');
        const DialogButtons = sdk.getComponent('views.elements.DialogButtons');
        return (
            <BaseDialog className="mx_JumpToTimeDialog" onFinished={this.props.onFinished}
                title={_t('Jump to Date-time Group')}
            >
                <form onSubmit={this._onOk}>
                    <div className="mx_Dialog_content">
                        <p>{_t("For example, 091630ZJUL11 represents 1630 UTC on 9 July 2011.")}</p>

                        <input placeholder="DDTTTTZMMMYY…" autoFocus={true}
                            onChange={this._onDateInputChange}
                            value={this.state.dtg}
                        />
                        <br />
                    </div>
                </form>
                <DialogButtons primaryButton={_t('Continue')}
                    onPrimaryButtonClick={this._onOk}
                    hasCancel={false}
                />
            </BaseDialog>
        );
    },
});
