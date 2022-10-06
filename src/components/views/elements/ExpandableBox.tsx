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

import classNames from "classnames";
import React, { useCallback, useState } from "react";

interface ExpandableBoxProps {
    body: React.ReactNode;
    className: string;// How many? 3?
    lines: number;// Number of lines to show before cut-off
}

/**
 * A container for text and inline elements. Initially limits its height to a number of lines.
 * If the text exceeds the number of lines, the full text can be shown via a toggle.
 */
const ExpandableBox: React.FC<ExpandableBoxProps> = ({ body, className, lines = 2 }) => {
    const [lineHeight, setLineHeight] = useState(16);       // Default replaced by computedStyle value
    const [scrollHeight, setScrollHeight] = useState(32);   // Default replaced in ref callback
    const [isExpanded, setIsExpanded] = useState(false);
    const [isOverflow, setIsOverflow] = useState(false);

    const ToggleButton = ({ isExpanded, onClick }) => {
        return (
            <button className="mx_RoomSummaryCard_infoTopic_toggle" onClick={onClick}>
                { isExpanded ? "Less" : "More" }
            </button>
        );
    };

    const handleToggle = () => {
        setIsExpanded((prev) => !prev);
    };

    const checkScrollHeight = useCallback((node: HTMLDivElement) => {
        if (node != null) {
            const computedLineHeight = parseInt(getComputedStyle(node).getPropertyValue("line-height"));
            const maxHeight = computedLineHeight * lines;
            setLineHeight(computedLineHeight);
            setScrollHeight(node.scrollHeight);

            if (node.scrollHeight > maxHeight) {
                setIsOverflow(true);
            }
        }
    // Run when body changes to check if we still overflow
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [body]);

    // Use styles to expand or shrink the component based on the toggle
    const styleNotExpanded = {
        lineHeight: `${lineHeight}px`,
        WebkitLineClamp: `${lines}`,
    };

    const styleExpanded = {
        height: `${scrollHeight}px`,
        lineHeight: `${lineHeight}px`,
        WebkitLineClamp: 'unset',
    };

    return (
        <div className="mx_RoomSummaryCard_infoTopic">
            <div ref={checkScrollHeight}
                className={classNames("mx_RoomSummaryCard_infoTopic_text", className)}
                style={isExpanded ? styleExpanded : styleNotExpanded}>
                { body }
            </div>
            { isOverflow && <ToggleButton isExpanded={isExpanded} onClick={handleToggle} /> }
        </div>
    );
};

export default ExpandableBox;
