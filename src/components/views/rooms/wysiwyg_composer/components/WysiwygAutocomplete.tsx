/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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

import React, { ForwardedRef, forwardRef } from "react";
import { MatrixClient, Room } from "matrix-js-sdk/src/matrix";
import { Attributes, FormattingFunctions, MappedSuggestion } from "@matrix-org/matrix-wysiwyg";

import * as Avatar from "../../../../../Avatar";
import { useRoomContext } from "../../../../../contexts/RoomContext";
import Autocomplete from "../../Autocomplete";
import { ICompletion } from "../../../../../autocomplete/Autocompleter";
import { useMatrixClientContext } from "../../../../../contexts/MatrixClientContext";

interface WysiwygAutocompleteProps {
    /**
     * The suggestion output from the rust model is used to build the query that is
     * passed to the `<Autocomplete />` component
     */
    suggestion: MappedSuggestion | null;

    /**
     * This handler will be called with the href and display text for a mention on clicking
     * a mention in the autocomplete list or pressing enter on a selected item
     */
    handleMention: FormattingFunctions["mention"];
}

/**
 * Builds the query for the `<Autocomplete />` component from the rust suggestion. This
 * will change as we implement handling / commands.
 *
 * @param suggestion  - represents if the rust model is tracking a potential mention
 * @returns an empty string if we can not generate a query, otherwise a query beginning
 * with @ for a user query, # for a room or space query
 */
function buildQuery(suggestion: MappedSuggestion | null): string {
    if (!suggestion || !suggestion.keyChar || suggestion.type === "command") {
        // if we have an empty key character, we do not build a query
        // TODO implement the command functionality
        return "";
    }

    return `${suggestion.keyChar}${suggestion.text}`;
}

/**
 * Given an autocomplete suggestion, determine the text to display in the pill
 *
 * @param completion - the item selected from the autocomplete
 * @param client - the MatrixClient is required for us to look up the correct room mention text
 * @returns the text to display in the mention
 */
function getMentionDisplayText(completion: ICompletion, client: MatrixClient): string {
    if (completion.type === "user") {
        return completion.completion;
    } else if (completion.type === "room") {
        const roomId = completion.completionId;
        const alias = completion.completion;

        let roomForAutocomplete: Room | null | undefined;

        // Not quite sure if the logic here makes sense - specifically calling .getRoom with an alias
        // that doesn't start with #, but keeping the logic the same as in PartCreator.roomPill for now
        if (roomId) {
            roomForAutocomplete = client.getRoom(roomId);
        } else if (!alias.startsWith("#")) {
            roomForAutocomplete = client.getRoom(alias);
        } else {
            roomForAutocomplete = client.getRooms().find((r) => {
                return r.getCanonicalAlias() === alias || r.getAltAliases().includes(alias);
            });
        }

        // if we haven't managed to find the room, use the alias as a fallback
        return roomForAutocomplete?.name || alias;
    }
}

/**
 * For a given completion, the attributes will change depending on the completion type
 *
 * @param completion - the item selected from the autocomplete
 * @param client - the MatrixClient is required for us to look up the correct room mention text
 * @returns an object of attributes containing HTMLAnchor attributes or data-* attri
 */
function getMentionAttributes(completion: ICompletion, client: MatrixClient, room: Room): Attributes {
    let background = "background";
    let letter = "letter";
    if (completion.type === "user") {
        // TODO try and get the avatar background url and avatar letter for a user
        // looks like we need a RoomMember
        // which you get by calling this.room.getMember(userId)
        // and it looks like the userId is actually the display name which is completion.completion
        const member = room.getMember(completion.completionId);

        if (!member) return;

        const name = member.name || member.userId;
        const defaultAvatarUrl = Avatar.defaultAvatarUrlForString(member.userId);
        const avatarUrl = Avatar.avatarUrlForMember(member, 16, 16, "crop");
        let initialLetter = "";
        if (avatarUrl === defaultAvatarUrl) {
            initialLetter = Avatar.getInitialLetter(name) ?? "";
        }

        background = `url(${avatarUrl})`;
        letter = `'${initialLetter}'`; // not a mistake, need to ensure it's there
    }
    if (completion.type === "room") {
        // TODO try and get the avatar background url and avatar letter for a room
    }

    return {
        "data-mention-type": completion.type,
        "style": `--avatar-background: ${background}; --avatar-letter: ${letter}`,
    };
}

/**
 * Given the current suggestion from the rust model and a handler function, this component
 * will display the legacy `<Autocomplete />` component (as used in the BasicMessageComposer)
 * and call the handler function with the required arguments when a mention is selected
 *
 * @param props.ref - the ref will be attached to the rendered `<Autocomplete />` component
 */
const WysiwygAutocomplete = forwardRef(
    ({ suggestion, handleMention }: WysiwygAutocompleteProps, ref: ForwardedRef<Autocomplete>): JSX.Element | null => {
        const { room } = useRoomContext();
        const client = useMatrixClientContext();

        function handleConfirm(completion: ICompletion): void {
            if (!completion.href) return;

            // for now we can use this if to make sure we handle only the mentions we know we can handle properly
            // in the model
            // TODO handle all of the completion types
            if (completion.type === "room" || completion.type === "user") {
                handleMention(
                    completion.href,
                    getMentionDisplayText(completion, client),
                    getMentionAttributes(completion, client, room),
                );
            }
        }

        return room ? (
            <div className="mx_SendWysiwygComposer_AutoCompleteWrapper" data-testid="autocomplete-wrapper">
                <Autocomplete
                    ref={ref}
                    query={buildQuery(suggestion)}
                    onConfirm={handleConfirm}
                    selection={{ start: 0, end: 0 }}
                    room={room}
                />
            </div>
        ) : null;
    },
);

WysiwygAutocomplete.displayName = "WysiwygAutocomplete";

export { WysiwygAutocomplete };
