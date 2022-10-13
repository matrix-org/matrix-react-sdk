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

import React, { useCallback, useRef, useState } from 'react';
import { IEventRelation, MatrixEvent } from 'matrix-js-sdk/src/models/event';
import { useWysiwyg } from "@matrix-org/matrix-wysiwyg";

import defaultDispatcher from '../../../../dispatcher/dispatcher';
import { Action } from '../../../../dispatcher/actions';
import { ActionPayload } from '../../../../dispatcher/payloads';
import { RoomPermalinkCreator } from '../../../../utils/permalinks/Permalinks';
import { TimelineRenderingType, useRoomContext } from '../../../../contexts/RoomContext';
import { sendMessage } from './message';
import { useDispatcher } from "../../../../hooks/useDispatcher";
import { useMatrixClientContext } from '../../../../contexts/MatrixClientContext';

interface WysiwygProps {
    disabled?: boolean;
    onChange: (content: string) => void;
    relation?: IEventRelation;
    replyToEvent?: MatrixEvent;
    permalinkCreator: RoomPermalinkCreator;
    includeReplyLegacyFallback?: boolean;
    children?: (sendMessage: () => void) => void;
}

export function WysiwygComposer(
    { disabled = false, onChange, children, ...props }: WysiwygProps,
) {
    const roomContext = useRoomContext();
    const mxClient = useMatrixClientContext();
    const timeoutId = useRef<number>();

    const [content, setContent] = useState<string>();
    const { ref, isWysiwygReady, wysiwyg } = useWysiwyg({ onChange: (_content) => {
        setContent(_content);
        onChange(_content);
    } });

    const memoizedSendMessage = useCallback(() => {
        sendMessage(content, { mxClient, roomContext, ...props });
        wysiwyg.clear();
        ref.current?.focus();
    }, [content, mxClient, roomContext, wysiwyg, props, ref]);

    useDispatcher(defaultDispatcher, (payload: ActionPayload) => {
        // don't let the user into the composer if it is disabled - all of these branches lead
        // to the cursor being in the composer
        if (disabled) return;

        const context = payload.context ?? TimelineRenderingType.Room;

        switch (payload.action) {
            case 'reply_to_event':
            case Action.FocusSendMessageComposer:
                if (context === roomContext.timelineRenderingType) {
                    // Immediately set the focus, so if you start typing it
                    // will appear in the composer
                    ref.current?.focus();
                    // If we call focus immediate, the focus _is_ in the right
                    // place, but the cursor is invisible, presumably because
                    // some other event is still processing.
                    // The following line ensures that the cursor is actually
                    // visible in composer.
                    if (timeoutId.current) {
                        clearTimeout(timeoutId.current);
                    }
                    timeoutId.current = setTimeout(() => ref.current?.focus(), 200);
                }
                break;
            // TODO: case Action.ComposerInsert: - see SendMessageComposer
        }
    });

    return (
        <div className="mx_WysiwygComposer">
            <div className="mx_WysiwygComposer_container">
                <div className="mx_WysiwygComposer_content"
                    ref={ref}
                    contentEditable={!disabled && isWysiwygReady}
                    role="textbox"
                    aria-multiline="true"
                    aria-autocomplete="list"
                    aria-haspopup="listbox"
                    dir="auto"
                    aria-disabled={disabled || !isWysiwygReady}
                />
            </div>
            { children?.(memoizedSendMessage) }
        </div>
    );
}
