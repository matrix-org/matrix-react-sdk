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

import classNames from 'classnames';
import { IEventRelation } from "matrix-js-sdk/src/models/event";
import { M_POLL_START } from "matrix-events-sdk";
import React, { createContext, ReactElement, useContext, useRef } from 'react';
import { Room } from 'matrix-js-sdk/src/models/room';
import { MatrixClient } from 'matrix-js-sdk/src/client';
import { THREAD_RELATION_TYPE } from 'matrix-js-sdk/src/models/thread';

import { _t } from '../../../languageHandler';
import AccessibleTooltipButton from "../elements/AccessibleTooltipButton";
import { CollapsibleButton } from './CollapsibleButton';
import ContextMenu, { aboveLeftOf, AboveLeftOf, useContextMenu } from '../../structures/ContextMenu';
import dis from '../../../dispatcher/dispatcher';
import EmojiPicker from '../emojipicker/EmojiPicker';
import ErrorDialog from "../dialogs/ErrorDialog";
import LocationButton from '../location/LocationButton';
import Modal from "../../../Modal";
import PollCreateDialog from "../elements/PollCreateDialog";
import { MatrixClientPeg } from '../../../MatrixClientPeg';
import ContentMessages from '../../../ContentMessages';
import MatrixClientContext from '../../../contexts/MatrixClientContext';
import RoomContext from '../../../contexts/RoomContext';
import { useDispatcher } from "../../../hooks/useDispatcher";
import { chromeFileInputFix } from "../../../utils/BrowserWorkarounds";
import IconizedContextMenu, { IconizedContextMenuOptionList } from '../context_menus/IconizedContextMenu';

interface IProps {
    addEmoji: (emoji: string) => boolean;
    haveRecording: boolean;
    isMenuOpen: boolean;
    isStickerPickerOpen: boolean;
    menuPosition: AboveLeftOf;
    onRecordStartEndClick: () => void;
    relation?: IEventRelation;
    setStickerPickerOpen: (isStickerPickerOpen: boolean) => void;
    showLocationButton: boolean;
    showPollsButton: boolean;
    showStickersButton: boolean;
    toggleButtonMenu: () => void;
}

type OverflowMenuCloser = () => void;
export const OverflowMenuContext = createContext<OverflowMenuCloser | null>(null);

const MessageComposerButtons: React.FC<IProps> = (props: IProps) => {
    const matrixClient: MatrixClient = useContext(MatrixClientContext);
    const { room, roomId, narrow } = useContext(RoomContext);

    if (props.haveRecording) {
        return null;
    }

    let mainButtons: ReactElement[];
    let moreButtons: ReactElement[];
    if (narrow) {
        mainButtons = [
            emojiButton(props),
        ];
        moreButtons = [
            uploadButton(), // props passed via UploadButtonContext
            showStickersButton(props),
            voiceRecordingButton(props, narrow),
            props.showPollsButton && pollButton(room, props.relation),
            showLocationButton(props, room, roomId, matrixClient),
        ];
    } else {
        mainButtons = [
            emojiButton(props),
            uploadButton(), // props passed via UploadButtonContext
        ];
        moreButtons = [
            showStickersButton(props),
            voiceRecordingButton(props, narrow),
            props.showPollsButton && pollButton(room, props.relation),
            showLocationButton(props, room, roomId, matrixClient),
        ];
    }

    mainButtons = mainButtons.filter((x: ReactElement) => x);
    moreButtons = moreButtons.filter((x: ReactElement) => x);

    const moreOptionsClasses = classNames({
        mx_MessageComposer_button: true,
        mx_MessageComposer_buttonMenu: true,
        mx_MessageComposer_closeButtonMenu: props.isMenuOpen,
    });

    return <UploadButtonContextProvider roomId={roomId} relation={props.relation}>
        { mainButtons }
        { moreButtons.length > 0 && <AccessibleTooltipButton
            className={moreOptionsClasses}
            onClick={props.toggleButtonMenu}
            title={_t("More options")}
        /> }
        { props.isMenuOpen && (
            <IconizedContextMenu
                onFinished={props.toggleButtonMenu}
                {...props.menuPosition}
                wrapperClassName="mx_MessageComposer_Menu"
                compact={true}
            >
                <OverflowMenuContext.Provider value={props.toggleButtonMenu}>
                    <IconizedContextMenuOptionList>
                        { moreButtons }
                    </IconizedContextMenuOptionList>
                </OverflowMenuContext.Provider>
            </IconizedContextMenu>
        ) }
    </UploadButtonContextProvider>;
};

function emojiButton(props: IProps): ReactElement {
    return <EmojiButton
        key="emoji_button"
        addEmoji={props.addEmoji}
        menuPosition={props.menuPosition}
    />;
}

interface IEmojiButtonProps {
    addEmoji: (unicode: string) => boolean;
    menuPosition: AboveLeftOf;
}

const EmojiButton: React.FC<IEmojiButtonProps> = ({ addEmoji, menuPosition }) => {
    const overflowMenuCloser = useContext(OverflowMenuContext);
    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu();

    let contextMenu: React.ReactElement | null = null;
    if (menuDisplayed) {
        const position = (
            menuPosition ?? aboveLeftOf(button.current.getBoundingClientRect())
        );

        contextMenu = <ContextMenu
            {...position}
            onFinished={() => {
                closeMenu();
                overflowMenuCloser?.();
            }}
            managed={false}
        >
            <EmojiPicker onChoose={addEmoji} showQuickReactions={true} />
        </ContextMenu>;
    }

    const className = classNames(
        "mx_MessageComposer_button",
        {
            "mx_MessageComposer_button_highlight": menuDisplayed,
        },
    );

    // TODO: replace ContextMenuTooltipButton with a unified representation of
    // the header buttons and the right panel buttons
    return <React.Fragment>
        <CollapsibleButton
            className={className}
            iconClassName="mx_MessageComposer_emoji"
            onClick={openMenu}
            title={_t("Emoji")}
        />

        { contextMenu }
    </React.Fragment>;
};

function uploadButton(): ReactElement {
    return <UploadButton key="controls_upload" />;
}

type UploadButtonFn = () => void;
export const UploadButtonContext = createContext<UploadButtonFn | null>(null);

interface IUploadButtonProps {
    roomId: string;
    relation?: IEventRelation | null;
}

// We put the file input outside the UploadButton component so that it doesn't get killed when the context menu closes.
const UploadButtonContextProvider: React.FC<IUploadButtonProps> = ({ roomId, relation, children }) => {
    const cli = useContext(MatrixClientContext);
    const roomContext = useContext(RoomContext);
    const uploadInput = useRef<HTMLInputElement>();

    const onUploadClick = () => {
        if (cli.isGuest()) {
            dis.dispatch({ action: 'require_registration' });
            return;
        }
        uploadInput.current?.click();
    };

    useDispatcher(dis, payload => {
        if (roomContext.timelineRenderingType === payload.context && payload.action === "upload_file") {
            onUploadClick();
        }
    });

    const onUploadFileInputChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
        if (ev.target.files.length === 0) return;

        // Take a copy, so we can safely reset the value of the form control
        ContentMessages.sharedInstance().sendContentListToRoom(
            Array.from(ev.target.files),
            roomId,
            relation,
            cli,
            roomContext.timelineRenderingType,
        );

        // This is the onChange handler for a file form control, but we're
        // not keeping any state, so reset the value of the form control
        // to empty.
        // NB. we need to set 'value': the 'files' property is immutable.
        ev.target.value = '';
    };

    const uploadInputStyle = { display: 'none' };
    return <UploadButtonContext.Provider value={onUploadClick}>
        { children }

        <input
            ref={uploadInput}
            type="file"
            style={uploadInputStyle}
            multiple
            onClick={chromeFileInputFix}
            onChange={onUploadFileInputChange}
        />
    </UploadButtonContext.Provider>;
};

// Must be rendered within an UploadButtonContextProvider
const UploadButton = () => {
    const overflowMenuCloser = useContext(OverflowMenuContext);
    const uploadButtonFn = useContext(UploadButtonContext);

    const onClick = () => {
        uploadButtonFn?.();
        overflowMenuCloser?.(); // close overflow menu
    };

    return <CollapsibleButton
        className="mx_MessageComposer_button"
        iconClassName="mx_MessageComposer_upload"
        onClick={onClick}
        title={_t('Attachment')}
    />;
};

function showStickersButton(props: IProps): ReactElement {
    return (
        props.showStickersButton
            ? <CollapsibleButton
                id='stickersButton'
                key="controls_stickers"
                className="mx_MessageComposer_button"
                iconClassName="mx_MessageComposer_stickers"
                onClick={() => props.setStickerPickerOpen(!props.isStickerPickerOpen)}
                title={props.isStickerPickerOpen ? _t("Hide stickers") : _t("Sticker")}
            />
            : null
    );
}

function voiceRecordingButton(props: IProps, narrow: boolean): ReactElement {
    // XXX: recording UI does not work well in narrow mode, so hide for now
    return (
        narrow
            ? null
            : <CollapsibleButton
                key="voice_message_send"
                className="mx_MessageComposer_button"
                iconClassName="mx_MessageComposer_voiceMessage"
                onClick={props.onRecordStartEndClick}
                title={_t("Voice Message")}
            />
    );
}

function pollButton(room: Room, relation?: IEventRelation): ReactElement {
    return <PollButton key="polls" room={room} relation={relation} />;
}

interface IPollButtonProps {
    room: Room;
    relation?: IEventRelation;
}

class PollButton extends React.PureComponent<IPollButtonProps> {
    public static contextType = OverflowMenuContext;
    public context!: React.ContextType<typeof OverflowMenuContext>;

    private onCreateClick = () => {
        this.context?.(); // close overflow menu
        const canSend = this.props.room.currentState.maySendEvent(
            M_POLL_START.name,
            MatrixClientPeg.get().getUserId(),
        );
        if (!canSend) {
            Modal.createDialog(
                ErrorDialog,
                {
                    title: _t("Permission Required"),
                    description: _t(
                        "You do not have permission to start polls in this room.",
                    ),
                },
            );
        } else {
            const threadId = this.props.relation?.rel_type === THREAD_RELATION_TYPE.name
                ? this.props.relation.event_id
                : null;

            Modal.createDialog(
                PollCreateDialog,
                {
                    room: this.props.room,
                    threadId,
                },
                'mx_CompoundDialog',
                false, // isPriorityModal
                true,  // isStaticModal
            );
        }
    };

    public render() {
        // do not allow sending polls within threads at this time
        if (this.props.relation?.rel_type === THREAD_RELATION_TYPE.name) return null;

        return (
            <CollapsibleButton
                className="mx_MessageComposer_button"
                iconClassName="mx_MessageComposer_poll"
                onClick={this.onCreateClick}
                title={_t("Poll")}
            />
        );
    }
}

function showLocationButton(
    props: IProps,
    room: Room,
    roomId: string,
    matrixClient: MatrixClient,
): ReactElement {
    return (
        props.showLocationButton
            ? <LocationButton
                key="location"
                roomId={roomId}
                relation={props.relation}
                sender={room.getMember(matrixClient.getUserId())}
                menuPosition={props.menuPosition}
            />
            : null
    );
}

export default MessageComposerButtons;
