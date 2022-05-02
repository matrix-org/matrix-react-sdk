/*
Copyright 2020 New Vector Ltd

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
import { MatrixCall } from 'matrix-js-sdk/src/webrtc/call';

import { _t } from '../../../languageHandler';
import ContextMenu, { IProps as IContextMenuProps, MenuItem } from '../../structures/ContextMenu';
import CallHandler from '../../../CallHandler';

interface IProps extends IContextMenuProps {
    call: MatrixCall;
}

export default class CallContextMenu extends React.Component<IProps> {
    static propTypes = {
        // js-sdk User object. Not required because it might not exist.
        user: PropTypes.object,
    };

    constructor(props) {
        super(props);
    }

    onHoldClick = () => {
        this.props.call.setRemoteOnHold(true);
        this.props.onFinished();
    };

    onUnholdClick = () => {
        CallHandler.instance.setActiveCallRoomId(this.props.call.roomId);

        this.props.onFinished();
    };

    onTransferClick = () => {
        CallHandler.instance.showTransferDialog(this.props.call);
        this.props.onFinished();
    };

    render() {
        const holdUnholdCaption = this.props.call.isRemoteOnHold() ? _t("Resume") : _t("Hold");
        const handler = this.props.call.isRemoteOnHold() ? this.onUnholdClick : this.onHoldClick;

        let transferItem;
        if (this.props.call.opponentCanBeTransferred()) {
            transferItem = <MenuItem className="mx_CallContextMenu_item" onClick={this.onTransferClick}>
                { _t("Transfer") }
            </MenuItem>;
        }

        return <ContextMenu {...this.props}>
            <MenuItem className="mx_CallContextMenu_item" onClick={handler}>
                { holdUnholdCaption }
            </MenuItem>
            { transferItem }
        </ContextMenu>;
    }
}
