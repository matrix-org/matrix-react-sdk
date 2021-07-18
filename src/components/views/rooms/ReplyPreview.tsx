/*
Copyright 2017 - 2021 The Matrix.org Foundation C.I.C.

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
import dis from '../../../dispatcher/dispatcher';
import { _t } from '../../../languageHandler';
import RoomViewStore from '../../../stores/RoomViewStore';
import { RoomPermalinkCreator } from "../../../utils/permalinks/Permalinks";
import { replaceableComponent } from "../../../utils/replaceableComponent";
import ReplyTile from './ReplyTile';
import { MatrixEvent } from 'matrix-js-sdk/src/models/event';
import { EventSubscription } from 'fbemitter';

function cancelQuoting() {
    dis.dispatch({
        action: 'reply_to_event',
        event: null,
    });
}

interface IProps {
    permalinkCreator: RoomPermalinkCreator;
}

interface IState {
    event: MatrixEvent;
}

@replaceableComponent("views.rooms.ReplyPreview")
export default class ReplyPreview extends React.Component<IProps, IState> {
    private unmounted = false;
    private readonly roomStoreToken: EventSubscription;

    constructor(props) {
        super(props);

        this.state = {
            event: RoomViewStore.getQuotingEvent(),
        };

        this.roomStoreToken = RoomViewStore.addListener(this.onRoomViewStoreUpdate);
    }

    componentWillUnmount() {
        this.unmounted = true;

        // Remove RoomStore listener
        if (this.roomStoreToken) {
            this.roomStoreToken.remove();
        }
    }

    private onRoomViewStoreUpdate = (): void => {
        if (this.unmounted) return;

        const event = RoomViewStore.getQuotingEvent();
        if (this.state.event !== event) {
            this.setState({ event });
        }
    };

    render() {
        if (!this.state.event) return null;

        return <div className="mx_ReplyPreview">
            <div className="mx_ReplyPreview_section">
                <div className="mx_ReplyPreview_header mx_ReplyPreview_title">
                    { _t('Replying') }
                </div>
                <div className="mx_ReplyPreview_header mx_ReplyPreview_cancel">
                    <img
                        className="mx_filterFlipColor"
                        src={require("../../../../res/img/cancel.svg")}
                        width="18"
                        height="18"
                        onClick={cancelQuoting}
                    />
                </div>
                <div className="mx_ReplyPreview_clear" />
                <div className="mx_ReplyPreview_tile">
                    <ReplyTile
                        mxEvent={this.state.event}
                        permalinkCreator={this.props.permalinkCreator}
                    />
                </div>
            </div>
        </div>;
    }
}
