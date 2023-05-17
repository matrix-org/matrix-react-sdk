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

import { RefObject, useEffect } from "react";
import { MatrixClient, Room } from "matrix-js-sdk/src/matrix";

import { wipFormatter } from "../utils/mentions";

export function usePlainTextInitialization(
    initialContent = "",
    ref: RefObject<HTMLElement>,
    room: Room,
    client: MatrixClient,
    onChange?: (content: string) => void,
): void {
    useEffect(() => {
        if (ref.current) {
            const content = wipFormatter(initialContent, room, client);
            ref.current.innerHTML = content;
            onChange?.(content);
        }
    }, [ref, initialContent, room, onChange, client]);
}
