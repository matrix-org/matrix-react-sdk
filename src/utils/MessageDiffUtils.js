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
        return document.createTextNode(desc.data);
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

function isNextSibling(d1, d2) {
    // compare up to parent element in route
    for (let i = 0; i < d1.route.length - 1; ++i) {
        if (d1.route[i] !== d2.route[i]) {
            return false;
        }
    }
    const lastD1Idx = d1.route.length - 1;
    return d2.route[lastD1Idx] >= d1.route[lastD1Idx];
}

// as removed text is not removed from the html, but marked as deleted,
// we need to readjust indices that assume the current node has been removed.
function adjustRoutes(diff, remainingDiffs) {
    let advance = 0;
    switch (diff.action) {
        case "removeTextElement":
        case "removeElement":
            advance = 1;
            break;
    }
    if (advance === 0) {
        return;
    }
    for (const rd of remainingDiffs) {
        console.log(rd.action, diff.route, rd.route);
        if (isNextSibling(diff, rd)) {
            console.log(`adjustRoutes: advance(${advance}) ${rd.action} because of ${diff.action}`);
            rd.route[diff.route.length - 1] += advance;
        }
    }
}

// todo: html in text messages should not be rendered as html ...!!

function parseHtml(html) {
    // diff routes are relative to inside root element, so fish out div with children[0]
    return new DOMParser().parseFromString(html, "text/html").body.children[0];
}

export function editBodyDiffToHtml(previousContent, newContent) {
    const oldBody = `<div>${getSanitizedHtmlBody(previousContent)}</div>`;
    const newBody = `<div>${getSanitizedHtmlBody(newContent)}</div>`;
    console.log({oldBody, newBody});
    const dd = new DiffDOM();
    const diffActions = dd.diff(oldBody, newBody);
    // for diffing text fragments
    const dpm = new DiffMatchPatch();
    const oldRootNode = parseHtml(oldBody);
    console.info("editBodyDiffToHtml: before", oldRootNode.innerHTML, diffActions);
    for (let i = 0; i < diffActions.length; ++i) {
        const diff = diffActions[i];
        const {refNode, refParentNode} = findRefNodes(oldRootNode, diff.route);
        console.log("editBodyDiffToHtml: processing diff part", diff.action, refNode);
        switch (diff.action) {
            case "replaceElement": {
                const container = document.createElement("span");
                const delNode = wrapDeletion(diffTreeToDOM(diff.oldValue));
                const insNode = wrapInsertion(diffTreeToDOM(diff.newValue));
                container.appendChild(delNode);
                container.appendChild(insNode);
                refNode.parentNode.replaceChild(container, refNode);
                break;
            }
            case "removeTextElement": {
                const delNode = wrapDeletion(document.createTextNode(diff.value));
                refNode.parentNode.replaceChild(delNode, refNode);
                break;
            }
            case "removeElement": {
                const delNode = wrapDeletion(diffTreeToDOM(diff.element));
                refNode.parentNode.replaceChild(delNode, refNode);
                break;
            }
            case "modifyTextElement": {
                const textDiffs = dpm.diff_main(diff.oldValue, diff.newValue);
                dpm.diff_cleanupSemantic(textDiffs);
                console.log("modifyTextElement", textDiffs);
                const container = document.createElement("span");
                for (const [modifier, text] of textDiffs) {
                    let textDiffNode = document.createTextNode(text);
                    if (modifier < 0) {
                        textDiffNode = wrapDeletion(textDiffNode);
                    } else if (modifier > 0) {
                        textDiffNode = wrapInsertion(textDiffNode);
                    }
                    container.appendChild(textDiffNode);
                }
                refNode.parentNode.replaceChild(container, refNode);
                break;
            }
            case "addElement": {
                const insNode = wrapInsertion(diffTreeToDOM(diff.element));
                insertBefore(refParentNode, refNode, insNode);
                break;
            }
            case "addTextElement": {
                if (diff.value !== "\n") {
                    const insNode = wrapInsertion(document.createTextNode(diff.value));
                    insertBefore(refParentNode, refNode, insNode);
                }
                break;
            }
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
                break;
            }
            default:
                /*
                    modifyComment
                    ...
                */
                console.warn("editBodyDiffToHtml: diff action not supported atm", diff);
        }
        adjustRoutes(diff, diffActions.slice(i + 1));
    }
    const safeBody = oldRootNode.innerHTML;
    console.info("editBodyDiffToHtml: after", safeBody);

    const className = classNames({
        'mx_EventTile_body': true,
        'markdown-body': true,
    });

    return <span key="body" className={className} dangerouslySetInnerHTML={{ __html: safeBody }} dir="auto" />;
}
