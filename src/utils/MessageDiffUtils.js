/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017, 2018 New Vector Ltd
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>

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

'use strict';

import React from 'react';
import classNames from 'classnames';
import DiffMatchPatch from 'diff-match-patch';
import {DiffDOM} from "diff-dom";
import { checkBlockNode, sanitizeMessageHtml } from "../HtmlUtils";

const decodeEntities = (function() {
    const textarea = document.createElement("textarea");
    return function(string) {
        textarea.innerHTML = string;
        return textarea.value;
    };
})();

function textToHtml(text) {
    const container = document.createElement("div");
    container.textContent = text;
    return container.innerHTML;
}

function getSanitizedHtmlBody(content) {
    if (content.format === "org.matrix.custom.html") {
        return sanitizeMessageHtml(content.formatted_body);
    } else {
        return textToHtml(content.body);
    }
}

function wrapInsertion(child) {
    const wrapper = document.createElement(checkBlockNode(child) ? "div" : "span");
    wrapper.className = "mx_EditHistoryMessage_insertion";
    wrapper.appendChild(child);
    return wrapper;
}

function wrapDeletion(child) {
    const wrapper = document.createElement(checkBlockNode(child) ? "div" : "span");
    wrapper.className = "mx_EditHistoryMessage_deletion";
    wrapper.appendChild(child);
    return wrapper;
}

function findRefNodes(root, route, isAddition) {
    let refNode = root;
    let refParentNode;
    const end = isAddition ? route.length - 1 : route.length;
    for (let i = 0; i < end; ++i) {
        refParentNode = refNode;
        refNode = refNode.childNodes[route[i]];
    }
    return {refNode, refParentNode};
}

function diffTreeToDOM(desc) {
    if (desc.nodeName === "#text") {
        return stringAsTextNode(desc.data);
    } else {
        const node = document.createElement(desc.nodeName);
        if (desc.attributes) {
            for (const [key, value] of Object.entries(desc.attributes)) {
                node.setAttribute(key, value);
            }
        }
        if (desc.childNodes) {
            for (const childDesc of desc.childNodes) {
                node.appendChild(diffTreeToDOM(childDesc));
            }
        }
        return node;
    }
}

function insertBefore(parent, nextSibling, child) {
    if (nextSibling) {
        parent.insertBefore(child, nextSibling);
    } else {
        parent.appendChild(child);
    }
}

function isRouteOfNextSibling(route1, route2) {
    // routes are arrays with indices,
    // to be interpreted as a path in the dom tree

    // ensure same parent
    for (let i = 0; i < route1.length - 1; ++i) {
        if (route1[i] !== route2[i]) {
            return false;
        }
    }
    // the route2 is only affected by the diff of route1
    // inserting an element if the index at the level of the
    // last element of route1 being larger
    // (e.g. coming behind route1 at that level)
    const lastD1Idx = route1.length - 1;
    return route2[lastD1Idx] >= route1[lastD1Idx];
}

function adjustRoutes(diff, remainingDiffs) {
    if (diff.action === "removeTextElement" || diff.action === "removeElement") {
        // as removed text is not removed from the html, but marked as deleted,
        // we need to readjust indices that assume the current node has been removed.
        const advance = 1;
        for (const rd of remainingDiffs) {
            console.log(rd.action, diff.route, rd.route);
            if (isRouteOfNextSibling(diff.route, rd.route)) {
                console.log(`adjustRoutes: advance(${advance}) ${rd.action} because of ${diff.action}`);
                rd.route[diff.route.length - 1] += advance;
            }
        }
    }
}

function stringAsTextNode(string) {
    console.log("stringAsTextNode", {string});
    return document.createTextNode(decodeEntities(string));
}

export function editBodyDiffToHtml(previousContent, newContent) {
    const domParser = new DOMParser();
    const oldBody = `<div>${getSanitizedHtmlBody(previousContent)}</div>`;
    const newBody = `<div>${getSanitizedHtmlBody(newContent)}</div>`;
    console.log({oldBody, newBody});
    const dd = new DiffDOM();
    const diffActions = dd.diff(oldBody, newBody);
    // for diffing text fragments
    const dpm = new DiffMatchPatch();
    // diff routes are relative to inside root element, so fish out div with children[0]
    const oldRootNode = domParser.parseFromString(oldBody, "text/html").body.children[0];
    console.info("editBodyDiffToHtml: before", oldRootNode.innerHTML, diffActions);
    for (let i = 0; i < diffActions.length; ++i) {
        const diff = diffActions[i];
        const {refNode, refParentNode} = findRefNodes(oldRootNode, diff.route);
        console.log("editBodyDiffToHtml: processing diff part", diff.action, refNode);
        let handled = false;
        switch (diff.action) {
            case "replaceElement": {
                const container = document.createElement("span");
                const delNode = wrapDeletion(diffTreeToDOM(diff.oldValue));
                const insNode = wrapInsertion(diffTreeToDOM(diff.newValue));
                container.appendChild(delNode);
                container.appendChild(insNode);
                refNode.parentNode.replaceChild(container, refNode);
                handled = true;
                break;
            }
            case "removeTextElement": {
                const delNode = wrapDeletion(stringAsTextNode(diff.value));
                refNode.parentNode.replaceChild(delNode, refNode);
                handled = true;
                break;
            }
            case "removeElement": {
                const delNode = wrapDeletion(diffTreeToDOM(diff.element));
                refNode.parentNode.replaceChild(delNode, refNode);
                handled = true;
                break;
            }
            case "modifyTextElement": {
                const textDiffs = dpm.diff_main(diff.oldValue, diff.newValue);
                dpm.diff_cleanupSemantic(textDiffs);
                console.log("modifyTextElement", textDiffs);
                const container = document.createElement("span");
                for (const [modifier, text] of textDiffs) {
                    let textDiffNode = stringAsTextNode(text);
                    if (modifier < 0) {
                        textDiffNode = wrapDeletion(textDiffNode);
                    } else if (modifier > 0) {
                        textDiffNode = wrapInsertion(textDiffNode);
                    }
                    container.appendChild(textDiffNode);
                }
                refNode.parentNode.replaceChild(container, refNode);
                handled = true;
                break;
            }
            case "addElement": {
                const insNode = wrapInsertion(diffTreeToDOM(diff.element));
                insertBefore(refParentNode, refNode, insNode);
                handled = true;
                break;
            }
            case "addTextElement": {
                if (diff.value !== "\n") {
                    const insNode = wrapInsertion(stringAsTextNode(diff.value));
                    insertBefore(refParentNode, refNode, insNode);
                    handled = true;
                }
                break;
            }
            // e.g. when changing a the href of a link,
            // show the link with old href as removed and with the new href as added
            case "removeAttribute":
            case "addAttribute":
            case "modifyAttribute": {
                const delNode = wrapDeletion(refNode.cloneNode(true));
                const updatedNode = refNode.cloneNode(true);
                if (diff.action === "addAttribute" || diff.action === "modifyAttribute") {
                    updatedNode.setAttribute(diff.name, diff.newValue);
                } else {
                    updatedNode.removeAttribute(diff.name);
                }
                const insNode = wrapInsertion(updatedNode);
                const container = document.createElement(checkBlockNode(refNode) ? "div" : "span");
                container.appendChild(delNode);
                container.appendChild(insNode);
                refNode.parentNode.replaceChild(container, refNode);
                handled = true;
                break;
            }
            default:
                /* modifyComment, ??? */
                console.warn("editBodyDiffToHtml: diff action not supported atm", diff);
        }
        if (handled) {
            adjustRoutes(diff, diffActions.slice(i + 1));
        }
    }
    const safeBody = oldRootNode.innerHTML;
    console.info("editBodyDiffToHtml: after", safeBody);

    const className = classNames({
        'mx_EventTile_body': true,
        'markdown-body': true,
    });

    return <span key="body" className={className} dangerouslySetInnerHTML={{ __html: safeBody }} dir="auto" />;
}
