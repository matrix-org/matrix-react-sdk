/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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
import { CallType } from 'matrix-js-sdk/src/webrtc/call';

import { _t } from '../../../languageHandler';
import ContextMenu, { IProps as IContextMenuProps, MenuItem } from '../../structures/ContextMenu';
import CallHandler, { GroupCallProvider } from '../../../CallHandler';

interface IProps extends IContextMenuProps {
    roomId: string;
    callType: CallType;
}

export default class PlaceCallContextMenu extends React.Component<IProps> {
    constructor(props) {
        super(props);
    }

    onJitsiCallClick = () => {
        CallHandler.instance.placeCall(this.props.roomId, this.props.callType, null, GroupCallProvider.Jitsi);
        this.props.onFinished();
    };

    onElementCallClick = () => {
        CallHandler.instance.placeCall(this.props.roomId, this.props.callType, null, GroupCallProvider.ElementCall);
        this.props.onFinished();
    };

    render() {
        return <ContextMenu {...this.props}>
            <MenuItem className="mx_PlaceCallContextMenu_item" onClick={this.onJitsiCallClick}>
                { _t("Call with Jitsi") }
            </MenuItem>
            <MenuItem className="mx_PlaceCallContextMenu_item" onClick={this.onElementCallClick}>
                { _t("Call with Element call") }
            </MenuItem>
        </ContextMenu>;
    }
}
