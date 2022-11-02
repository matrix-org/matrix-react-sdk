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

import { FocusEvent, useCallback, useEffect, useState } from "react";

export function useIsFocused() {
    const [isFocused, setIsFocused] = useState(false);

    const [timeoutID, setTimeoutID] = useState<number>();
    useEffect(() => {
        return () => clearTimeout(timeoutID);
    }, [timeoutID]);

    const onFocus = useCallback((event: FocusEvent<HTMLElement>) => {
        if (event.type === 'focus') {
            setIsFocused(true);
        } else {
            // To avoid a blink when we switch mode between plain text and rich text mode
            // We delay the unfocused action
            setTimeoutID(setTimeout(() => setIsFocused(false), 1000));
        }
        setIsFocused(event.type === 'focus');
    }, [setIsFocused]);

    return { isFocused, onFocus };
}
