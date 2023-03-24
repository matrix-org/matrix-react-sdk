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
import { FormattingFunctions, MappedSuggestion } from "@matrix-org/matrix-wysiwyg";

import { useRoomContext } from "../../../../../contexts/RoomContext";
import Autocomplete from "../../Autocomplete";
import { ICompletion } from "../../../../../autocomplete/Autocompleter";
import { useMatrixClientContext } from "../../../../../contexts/MatrixClientContext";

interface WysiwygAutocompleteProps {
    suggestion: MappedSuggestion | null;
    handleMention: FormattingFunctions["mention"];
}

// Helper function that takes the rust suggestion and builds the query for the
// Autocomplete. This will change as we implement / commands.
// Returns an empty string if we don't want to show the suggestion menu.
function buildQuery(suggestion: MappedSuggestion | null): string {
    if (!suggestion || !suggestion.keyChar || suggestion.type === "command") {
        // if we have an empty key character, we do not build a query
        // TODO implement the command functionality
        return "";
    }

    return `${suggestion.keyChar}${suggestion.text}`;
}

// Helper function to get the mention text for a room as this is less straightforward
// than it is for determining the text we display for a user.
// TODO determine if it's worth bringing the switch case into this function to make it
// into a more general `getMentionText` component
function getRoomMentionText(completion: ICompletion, client: MatrixClient): string {
    const alias = completion.completion;
    const roomId = completion.completionId;

    let roomForAutocomplete: Room | undefined;
    if (roomId || alias[0] !== "#") {
        roomForAutocomplete = client.getRoom(roomId || alias) ?? undefined;
    } else {
        roomForAutocomplete = client.getRooms().find((r) => {
            return r.getCanonicalAlias() === alias || r.getAltAliases().includes(alias);
        });
    }

    return roomForAutocomplete?.name || alias;
}

const WysiwygAutocomplete = forwardRef(
    ({ suggestion, handleMention }: WysiwygAutocompleteProps, ref: ForwardedRef<Autocomplete>): JSX.Element | null => {
        const { room } = useRoomContext();
        const client = useMatrixClientContext();

        function handleConfirm(completion: ICompletion): void {
            if (!completion.href) return;

            switch (completion.type) {
                case "user":
                    handleMention(completion.href, completion.completion);
                    break;
                case "room": {
                    handleMention(completion.href, getRoomMentionText(completion, client));
                    break;
                }
                // TODO implement the command functionality
                // case "command":
                //     console.log("/command functionality not yet in place");
                //     break;
                default:
                    break;
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
