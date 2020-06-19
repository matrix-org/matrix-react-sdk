/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017, 2018 New Vector Ltd

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
import React, {createRef, useCallback, useEffect, useRef, useState} from 'react';
import PropTypes from 'prop-types';
import { _t } from '../../../languageHandler';
import CallHandler from '../../../CallHandler';
import {Key} from '../../../Keyboard';
import {MatrixClientPeg} from '../../../MatrixClientPeg';
import dis from '../../../dispatcher/dispatcher';
import * as sdk from '../../../index';
import ContentMessages from '../../../ContentMessages';
import Stickerpicker from './Stickerpicker';
import {aboveLeftOf, ContextMenu, ContextMenuButton, useContextMenu} from "../../structures/ContextMenu";

function CallButton(props) {
    const AccessibleButton = sdk.getComponent('elements.AccessibleButton');
    const onVoiceCallClick = (ev) => {
        dis.dispatch({
            action: 'place_call',
            type: "voice",
            room_id: props.roomId,
        });
    };

    return (<AccessibleButton className="mx_MessageComposer_button mx_MessageComposer_voicecall"
            tabIndex={props.tabIndex}
            onClick={onVoiceCallClick}
            title={_t('Voice call')}
        />);
}

CallButton.propTypes = {
    roomId: PropTypes.string.isRequired,
    tabIndex: PropTypes.number,
};

const EmojiButton = ({addEmoji, tabIndex}) => {
    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu();

    let contextMenu;
    if (menuDisplayed) {
        const buttonRect = button.current.getBoundingClientRect();
        const EmojiPicker = sdk.getComponent('emojipicker.EmojiPicker');
        contextMenu = <ContextMenu {...aboveLeftOf(buttonRect)} onFinished={closeMenu} catchTab={false}>
            <EmojiPicker onChoose={addEmoji} showQuickReactions={true} />
        </ContextMenu>;
    }

    return <React.Fragment>
        <ContextMenuButton className="mx_MessageComposer_button mx_MessageComposer_emoji"
                           onClick={openMenu}
                           isExpanded={menuDisplayed}
                           label={_t('Emoji picker')}
                           inputRef={button}
                           tabIndex={tabIndex}
        >

        </ContextMenuButton>

        { contextMenu }
    </React.Fragment>;
};

const addEmoji = (emoji) => {
    dis.dispatch({
        action: "insert_emoji",
        emoji,
    });
};

function HangupButton(props) {
    const AccessibleButton = sdk.getComponent('elements.AccessibleButton');
    const onHangupClick = () => {
        const call = CallHandler.getCallForRoom(props.roomId);
        if (!call) {
            return;
        }
        dis.dispatch({
            action: 'hangup',
            // hangup the call for this room, which may not be the room in props
            // (e.g. conferences which will hangup the 1:1 room instead)
            room_id: call.roomId,
        });
    };
    return (<AccessibleButton className="mx_MessageComposer_button mx_MessageComposer_hangup"
            tabIndex={props.tabIndex}
            onClick={onHangupClick}
            title={_t('Hangup')}
        />);
}

HangupButton.propTypes = {
    roomId: PropTypes.string.isRequired,
    tabIndex: PropTypes.tabIndex,
};

class UploadButton extends React.Component {
    static propTypes = {
        roomId: PropTypes.string.isRequired,
        tabIndex: PropTypes.number,
    }

    constructor(props) {
        super(props);
        this.onUploadClick = this.onUploadClick.bind(this);
        this.onUploadFileInputChange = this.onUploadFileInputChange.bind(this);

        this._uploadInput = createRef();
        this._dispatcherRef = dis.register(this.onAction);
    }

    componentWillUnmount() {
        dis.unregister(this._dispatcherRef);
    }

    onAction = payload => {
        if (payload.action === "upload_file") {
            this.onUploadClick();
        }
    };

    onUploadClick(ev) {
        if (MatrixClientPeg.get().isGuest()) {
            dis.dispatch({action: 'require_registration'});
            return;
        }
        this._uploadInput.current.click();
    }

    onUploadFileInputChange(ev) {
        if (ev.target.files.length === 0) return;

        // take a copy so we can safely reset the value of the form control
        // (Note it is a FileList: we can't use slice or sensible iteration).
        const tfiles = [];
        for (let i = 0; i < ev.target.files.length; ++i) {
            tfiles.push(ev.target.files[i]);
        }

        ContentMessages.sharedInstance().sendContentListToRoom(
            tfiles, this.props.roomId, MatrixClientPeg.get(),
        );

        // This is the onChange handler for a file form control, but we're
        // not keeping any state, so reset the value of the form control
        // to empty.
        // NB. we need to set 'value': the 'files' property is immutable.
        ev.target.value = '';
    }

    render() {
        const uploadInputStyle = {display: 'none'};
        const AccessibleButton = sdk.getComponent('elements.AccessibleButton');
        return (
            <AccessibleButton className="mx_MessageComposer_button mx_MessageComposer_upload"
                tabIndex={this.props.tabIndex}
                onClick={this.onUploadClick}
                title={_t('Upload file')}
            >
                <input
                    ref={this._uploadInput}
                    type="file"
                    style={uploadInputStyle}
                    multiple
                    onChange={this.onUploadFileInputChange}
                />
            </AccessibleButton>
        );
    }
}

function VideoCallButton(props) {
    const AccessibleButton = sdk.getComponent('elements.AccessibleButton');
    const onCallClick = (ev) => {
        dis.dispatch({
            action: 'place_call',
            type: ev.shiftKey ? "screensharing" : "video",
            room_id: props.roomId,
        });
    };

    return <AccessibleButton className="mx_MessageComposer_button mx_MessageComposer_videocall"
        tabIndex={props.tabIndex}
        onClick={onCallClick}
        title={_t('Video call')}
    />;
}

VideoCallButton.propTypes = {
    roomId: PropTypes.string.isRequired,
    tabIndex: PropTypes.number,
};

/**
 * This component implements the Toolbar design pattern from the WAI-ARIA
 * Authoring Practices guidelines.
 *
 * https://www.w3.org/TR/wai-aria-practices-1.1/#toolbar
 */
export default function MessageActions(props) {
    const callInProgress = props.callState && props.callState !== 'ended';
    const elRef = useRef(null);
    const [focused, setFocused] = useState('upload');
    const tabIndex = (target) => target === focused ? 0 : -1;
    const controls = [
        <UploadButton key="upload"
                      tabIndex={tabIndex('upload')}
                      roomId={props.room.roomId} />,
        <EmojiButton key="emoji"
                     tabIndex={tabIndex('emoji')}
                     addEmoji={addEmoji} />,
        <Stickerpicker key="sticker"
                       tabIndex={tabIndex('sticker')}
                       room={props.room} />,
    ];

    if (props.showCallButtons) {
        if (callInProgress) {
            controls.push(
                <HangupButton key="hangup"
                              tabIndex={tabIndex('hangup')}
                              roomId={props.room.roomId} />,
            );
        } else {
            controls.push(
                <CallButton key="call"
                            tabIndex={tabIndex('call')}
                            roomId={props.room.roomId} />,
                <VideoCallButton key="videocall"
                                 tabIndex={tabIndex('videocall')}
                                 roomId={props.room.roomId} />,
            );
        }
    }

    // Serialize keys for use as a callback dependency. The serialized form
    // (rather than the original data structure) must be used within the
    // callback in order to satisfy the project's linter.
    const keysString = controls.map(({key}) => key).join(',');
    const handleKeyDown = useCallback(
        (event) => {
            const keys = keysString.split(',');
            const current = keys.indexOf(focused);
            let newIndex;

            if (event.key === Key.ARROW_RIGHT) {
                newIndex = (current + 1) % keys.length;
            } else if (event.key === Key.ARROW_LEFT) {
                newIndex = current ? current - 1 : keys.length - 1;
            } else if (event.key === Key.HOME) {
                newIndex = 0;
            } else if (event.key === Key.END) {
                newIndex = keys.length - 1;
            } else {
                return;
            }

            setFocused(keys[newIndex]);
            elRef.current.children[newIndex].focus();
            event.stopPropagation();
        },
        [keysString, focused],
    );

    useEffect(() => {
        const el = elRef.current;
        el.addEventListener('keydown', handleKeyDown, true);

        return () => {
            el.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [handleKeyDown]);

    return (
        <div role="toolbar"
             ref={elRef}
             className="mx_MessageActions_wrapper"
             aria-label={_t("Message actions")}>
            {controls}
        </div>
    );
}
