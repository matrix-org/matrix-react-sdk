/*
Copyright 2020 - 2021 The Matrix.org Foundation C.I.C.

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
import { MatrixEvent, Room } from 'matrix-js-sdk';

import BaseDialog from "./BaseDialog";
import { _t } from "../../../languageHandler";
import { IDialogProps } from "./IDialogProps";
import DialogButtons from "../elements/DialogButtons";
import AppTile from "../elements/AppTile";
import WidgetStore, { IApp } from '../../../stores/WidgetStore';

interface IProps extends IDialogProps {
    room: Room;
    widgetEvent: MatrixEvent;
    onFinished: (success: boolean, payload?: BridgeInviteCandidate) => void;
}

interface IState {
    app: IApp;
}

export interface BridgeInviteCandidate {
    userId: string;
    displayName?: string;
    avatarMxc?: string;
}

export default class BridgeInviteDialogue extends React.PureComponent<IProps, IState> {
    constructor(props: IProps) {
        super(props);
        this.state = {
            app: WidgetStore.instance.getApps(this.props.room.roomId)
                .find(app => app.eventId === this.props.widgetEvent.getId()),
        };
    }

    private onClose = () => {
        this.props.onFinished(false);
    };

    private onInviteCandidate = (payload: BridgeInviteCandidate) => {
        this.props.onFinished(true, payload);
    };

    public render() {
        return (
            <BaseDialog
                className="mx_BridgeInviteDialog"
                onFinished={this.props.onFinished}
                title={_t("Invite via bridge")}
            >
                <div className="mx_Dialog_content">
                    <div className="text-muted">{ _t("Use the interface below to invite a user via your bridge.") }</div>
                    <AppTile
                        room={this.props.room}
                        showMenubar={false}
                        showTitle={false}
                        showPopout={false}
                        userWidget={true}
                        fullWidth={true}
                        app={this.state.app}
                        additionalUrlParams={
                            { bridgeInvites: 'true' }
                        }
                        onNewInviteCandidate={this.onInviteCandidate}
                    />
                    <DialogButtons
                        hasCancel={false}
                        primaryButton={_t("Close")}
                        onPrimaryButtonClick={this.onClose}
                    />
                </div>
            </BaseDialog>
        );
    }
}
