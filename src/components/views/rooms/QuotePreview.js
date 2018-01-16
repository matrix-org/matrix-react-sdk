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
import dis from '../../../dispatcher';
import sdk from '../../../index';
import { _t } from '../../../languageHandler';
import RoomViewStore from '../../../stores/RoomViewStore';

function cancelQuoting() {
    dis.dispatch({
        action: 'quote_event',
        event: null,
    });
}

export default class QuotePreview extends React.Component {
    constructor(props, context) {
        super(props, context);

        this.state = {
            event: null,
        };

        this._onRoomViewStoreUpdate = this._onRoomViewStoreUpdate.bind(this);

        this._roomStoreToken = RoomViewStore.addListener(this._onRoomViewStoreUpdate);
        this._onRoomViewStoreUpdate();
    }

    componentWillUnmount() {
        // Remove RoomStore listener
        if (this._roomStoreToken) {
            this._roomStoreToken.remove();
        }
    }

    _onRoomViewStoreUpdate() {
        const event = RoomViewStore.getQuotingEvent();
        if (this.state.event !== event) {
            this.setState({ event });
        }
    }

    render() {
        if (!this.state.event) return null;

        const EventTile = sdk.getComponent('rooms.EventTile');
        const EmojiText = sdk.getComponent('views.elements.EmojiText');

        return <div className="mx_QuotePreview">
            <div className="mx_QuotePreview_section">
                <EmojiText element="div" className="mx_QuotePreview_header mx_QuotePreview_title">
                    { '💬 ' + _t('Replying') }
                </EmojiText>
                <div className="mx_QuotePreview_header mx_QuotePreview_cancel">
                    <img className="mx_filterFlipColor" src="img/cancel.svg" width="18" height="18"
                         onClick={cancelQuoting} />
                </div>
                <div className="mx_QuotePreview_clear" />
                <EventTile mxEvent={this.state.event} last={true} tileShape="quote" />
            </div>
        </div>;
    }
}
