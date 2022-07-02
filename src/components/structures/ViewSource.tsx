/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2019 The Matrix.org Foundation C.I.C.

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

import React from "react";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";

import SyntaxHighlight from "../views/elements/SyntaxHighlight";
import { _t } from "../../languageHandler";
import MatrixClientContext from "../../contexts/MatrixClientContext";
import { canEditContent } from "../../utils/EventUtils";
import { MatrixClientPeg } from '../../MatrixClientPeg';
import { IDialogProps } from "../views/dialogs/IDialogProps";
import BaseDialog from "../views/dialogs/BaseDialog";
import { DevtoolsContext } from "../views/dialogs/devtools/BaseTool";
import { StateEventEditor } from "../views/dialogs/devtools/RoomState";
import { stringify, TimelineEventEditor } from "../views/dialogs/devtools/Event";
import CopyableText from "../views/elements/CopyableText";

interface IProps extends IDialogProps {
    mxEvent: MatrixEvent; // the MatrixEvent associated with the context menu
}

interface IState {
    isEditing: boolean;
}

export default class ViewSource extends React.Component<IProps, IState> {
    constructor(props: IProps) {
        super(props);

        this.state = {
            isEditing: false,
        };
    }

    private onBack = (): void => {
        // TODO: refresh the "Event ID:" modal header
        this.setState({ isEditing: false });
    };

    private onEdit(): void {
        this.setState({ isEditing: true });
    }

    // returns the dialog body for viewing the event source
    private viewSourceContent(): JSX.Element {
        const mxEvent = this.props.mxEvent.replacingEvent() || this.props.mxEvent; // show the replacing event, not the original, if it is an edit
        const isEncrypted = mxEvent.isEncrypted();
        // @ts-ignore
        const decryptedEventSource = mxEvent.clearEvent; // FIXME: clearEvent is private
        const originalEventSource = mxEvent.event;
        const copyOriginalFunc = (): string => {
            return stringify(originalEventSource);
        };
        if (isEncrypted) {
            const copyDecryptedFunc = (): string => {
                return stringify(decryptedEventSource);
            };
            return (
                <>
                    <details open className="mx_ViewSource_details">
                        <summary>
                            <span className="mx_ViewSource_heading">
                                { _t("Decrypted event source") }
                            </span>
                        </summary>
                        <CopyableText getTextToCopy={copyDecryptedFunc}>
                            <SyntaxHighlight language="json">
                                { stringify(decryptedEventSource) }
                            </SyntaxHighlight>
                        </CopyableText>
                    </details>
                    <details className="mx_ViewSource_details">
                        <summary>
                            <span className="mx_ViewSource_heading">
                                { _t("Original event source") }
                            </span>
                        </summary>
                        <CopyableText getTextToCopy={copyOriginalFunc}>
                            <SyntaxHighlight language="json">
                                { stringify(originalEventSource) }
                            </SyntaxHighlight>
                        </CopyableText>
                    </details>
                </>
            );
        } else {
            return (
                <>
                    <div className="mx_ViewSource_heading">
                        { _t("Original event source") }
                    </div>
                    <CopyableText getTextToCopy={copyOriginalFunc}>
                        <SyntaxHighlight language="json">
                            { stringify(originalEventSource) }
                        </SyntaxHighlight>
                    </CopyableText>
                </>
            );
        }
    }

    // returns the SendCustomEvent component prefilled with the correct details
    private editSourceContent(): JSX.Element {
        const mxEvent = this.props.mxEvent.replacingEvent() || this.props.mxEvent; // show the replacing event, not the original, if it is an edit

        const isStateEvent = mxEvent.isState();
        const roomId = mxEvent.getRoomId();

        if (isStateEvent) {
            return (
                <MatrixClientContext.Consumer>
                    { (cli) => (
                        <DevtoolsContext.Provider value={{ room: cli.getRoom(roomId) }}>
                            <StateEventEditor onBack={this.onBack} mxEvent={mxEvent} />
                        </DevtoolsContext.Provider>
                    ) }
                </MatrixClientContext.Consumer>
            );
        }

        return (
            <MatrixClientContext.Consumer>
                { (cli) => (
                    <DevtoolsContext.Provider value={{ room: cli.getRoom(roomId) }}>
                        <TimelineEventEditor onBack={this.onBack} mxEvent={mxEvent} />
                    </DevtoolsContext.Provider>
                ) }
            </MatrixClientContext.Consumer>
        );
    }

    private canSendStateEvent(mxEvent: MatrixEvent): boolean {
        const cli = MatrixClientPeg.get();
        const room = cli.getRoom(mxEvent.getRoomId());
        return room.currentState.mayClientSendStateEvent(mxEvent.getType(), cli);
    }

    public render(): JSX.Element {
        const mxEvent = this.props.mxEvent.replacingEvent() || this.props.mxEvent; // show the replacing event, not the original, if it is an edit

        const isEditing = this.state.isEditing;
        const roomId = mxEvent.getRoomId();
        const eventId = mxEvent.getId();
        const canEdit = mxEvent.isState() ? this.canSendStateEvent(mxEvent) : canEditContent(this.props.mxEvent);
        return (
            <BaseDialog className="mx_ViewSource" onFinished={this.props.onFinished} title={_t("View Source")}>
                <div className="mx_ViewSource_header">
                    <CopyableText getTextToCopy={() => roomId} border={false}>
                        { _t("Room ID: %(roomId)s", { roomId }) }
                    </CopyableText>
                    <CopyableText getTextToCopy={() => eventId} border={false}>
                        { _t("Event ID: %(eventId)s", { eventId }) }
                    </CopyableText>
                </div>
                { isEditing ? this.editSourceContent() : this.viewSourceContent() }
                { !isEditing && canEdit && (
                    <div className="mx_Dialog_buttons">
                        <button onClick={() => this.onEdit()}>{ _t("Edit") }</button>
                    </div>
                ) }
            </BaseDialog>
        );
    }
}
