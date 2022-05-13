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

import React from "react";
import ReactDOM from 'react-dom';

import PlatformPeg from "../PlatformPeg";
import TextWithTooltip from "../components/views/elements/TextWithTooltip";

/**
 * Recurses depth-first through a DOM tree, adding tooltip previews for link elements.
 *
 * @param {Element[]} rootNodes - a list of sibling DOM nodes to traverse to try
 *   to add tooltips.
 * @param {Element[]} ignoredNodes: a list of nodes to not recurse into.
 * @param {Element[]} containers: an accumulator of the DOM nodes which contain
 *   React components that have been mounted by this function. The initial caller
 *   should pass in an empty array to seed the accumulator.
 */
export function tooltipifyLinks(rootNodes: ArrayLike<Element>, ignoredNodes: Element[], containers: Element[]) {
    if (!PlatformPeg.get()?.needsUrlTooltips()) {
        return;
    }

    let node = rootNodes[0];

    while (node) {
        let tooltipified = false;

        if (ignoredNodes.indexOf(node) >= 0) {
            node = node.nextSibling as Element;
            continue;
        }

        if (node.tagName === "A" && node.getAttribute("href")
            && node.getAttribute("href") !== node.textContent.trim()
        ) {
            const container = document.createElement("span");
            const href = node.getAttribute("href");

            const tooltip = <TextWithTooltip
                // Disable focusing on the tooltip target to avoid double / nested focus. The contained anchor element
                // itself allows focusing which also triggers the tooltip.
                tabIndex={-1}
                tooltip={new URL(href, window.location.href).toString()}
                onClick={e => (e.target as HTMLElement).blur()} // Force tooltip to hide on clickout
            >
                <span dangerouslySetInnerHTML={{ __html: node.outerHTML }} />
            </TextWithTooltip>;

            ReactDOM.render(tooltip, container);
            node.parentNode.replaceChild(container, node);
            containers.push(container);
            tooltipified = true;
        }

        if (node.childNodes?.length && !tooltipified) {
            tooltipifyLinks(node.childNodes as NodeListOf<Element>, ignoredNodes, containers);
        }

        node = node.nextSibling as Element;
    }
}

/**
 * Unmount tooltip containers created by tooltipifyLinks.
 *
 * It's critical to call this after tooltipifyLinks, otherwise
 * tooltips will leak.
 *
 * @param {Element[]} containers - array of tooltip containers to unmount
 */
export function unmountTooltips(containers: Element[]) {
    for (const container of containers) {
        ReactDOM.unmountComponentAtNode(container);
    }
}
