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

import React, { useCallback, useEffect, useState } from "react";

export default function useHover(
    ref: React.MutableRefObject<HTMLElement>,
    ignoreHover?: (ev: MouseEvent) => boolean,
) {
    const [hovered, setHoverState] = useState(false);

    const handleMouseOver = () => setHoverState(true);
    const handleMouseOut = () => setHoverState(false);
    const handleMouseMove = useCallback((ev: MouseEvent): void => {
        setHoverState(!ignoreHover(ev));
    }, [ignoreHover]);

    useEffect(
        () => {
            const node = ref.current;
            if (node) {
                node.addEventListener("mouseover", handleMouseOver);
                node.addEventListener("mouseout", handleMouseOut);
                if (ignoreHover) {
                    node.addEventListener("mousemove", handleMouseMove);
                }

                return () => {
                    node.removeEventListener("mouseover", handleMouseOver);
                    node.removeEventListener("mouseout", handleMouseOut);
                    if (ignoreHover) {
                        node.removeEventListener("mousemove", handleMouseMove);
                    }
                };
            }
        },
        [ref, ignoreHover, handleMouseMove],
    );

    return hovered;
}
