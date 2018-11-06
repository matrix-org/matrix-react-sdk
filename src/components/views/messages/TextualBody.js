/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 New Vector Ltd

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
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import highlight from 'highlight.js';
import * as HtmlUtils from '../../../HtmlUtils';
import * as linkify from 'linkifyjs';
import linkifyElement from 'linkifyjs/element';
import linkifyMatrix from '../../../linkify-matrix';
import sdk from '../../../index';
import ScalarAuthClient from '../../../ScalarAuthClient';
import Modal from '../../../Modal';
import SdkConfig from '../../../SdkConfig';
import dis from '../../../dispatcher';
import { _t } from '../../../languageHandler';
import MatrixClientPeg from '../../../MatrixClientPeg';
import * as ContextualMenu from '../../structures/ContextualMenu';
import SettingsStore from "../../../settings/SettingsStore";
import PushProcessor from 'matrix-js-sdk/lib/pushprocessor';
import ReplyThread from "../elements/ReplyThread";
import {host as matrixtoHost} from '../../../matrix-to';

linkifyMatrix(linkify);

module.exports = React.createClass({
    displayName: 'TextualBody',

    propTypes: {
        /* the MatrixEvent to show */
        mxEvent: PropTypes.object.isRequired,

        /* a list of words to highlight */
        highlights: PropTypes.array,

        /* link URL for the highlights */
        highlightLink: PropTypes.string,

        /* should show URL previews for this event */
        showUrlPreview: PropTypes.bool,

        /* callback for when our widget has loaded */
        onWidgetLoad: PropTypes.func,

        /* the shape of the tile, used */
        tileShape: PropTypes.string,
    },

    getInitialState: function() {
        return {
            // the URLs (if any) to be previewed with a LinkPreviewWidget
            // inside this TextualBody.
            links: [],

            // track whether the preview widget is hidden
            widgetHidden: false,
        };
    },

    copyToClipboard: function(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();

        let successful = false;
        try {
            successful = document.execCommand('copy');
        } catch (err) {
            console.log('Unable to copy');
        }

        document.body.removeChild(textArea);
        return successful;
    },

    componentDidMount: function() {
        this._unmounted = false;

        // pillifyLinks BEFORE linkifyElement because plain room/user URLs in the composer
        // are still sent as plaintext URLs. If these are ever pillified in the composer,
        // we should be pillify them here by doing the linkifying BEFORE the pillifying.
        this.pillifyLinks(this.refs.content.children);
        linkifyElement(this.refs.content, linkifyMatrix.options);
        this.calculateUrlPreview();

        if (this.props.mxEvent.getContent().format === "org.matrix.custom.html") {
            const blocks = ReactDOM.findDOMNode(this).getElementsByTagName("code");
            if (blocks.length > 0) {
                // Do this asynchronously: parsing code takes time and we don't
                // need to block the DOM update on it.
                setTimeout(() => {
                    if (this._unmounted) return;
                    for (let i = 0; i < blocks.length; i++) {
                        if (SettingsStore.getValue("enableSyntaxHighlightLanguageDetection")) {
                            highlight.highlightBlock(blocks[i]);
                        } else {
                            // Only syntax highlight if there's a class starting with language-
                            const classes = blocks[i].className.split(/\s+/).filter(function(cl) {
                                return cl.startsWith('language-');
                            });

                            if (classes.length != 0) {
                                highlight.highlightBlock(blocks[i]);
                            }
                        }
                    }
                }, 10);
            }
            this._addCodeCopyButton();
        }
    },

    componentDidUpdate: function() {
        this.calculateUrlPreview();
    },

    componentWillUnmount: function() {
        this._unmounted = true;
    },

    shouldComponentUpdate: function(nextProps, nextState) {
        //console.log("shouldComponentUpdate: ShowUrlPreview for %s is %s", this.props.mxEvent.getId(), this.props.showUrlPreview);

        // exploit that events are immutable :)
        return (nextProps.mxEvent.getId() !== this.props.mxEvent.getId() ||
                nextProps.highlights !== this.props.highlights ||
                nextProps.highlightLink !== this.props.highlightLink ||
                nextProps.showUrlPreview !== this.props.showUrlPreview ||
                nextState.links !== this.state.links ||
                nextState.widgetHidden !== this.state.widgetHidden);
    },

    calculateUrlPreview: function() {
        //console.log("calculateUrlPreview: ShowUrlPreview for %s is %s", this.props.mxEvent.getId(), this.props.showUrlPreview);

        if (this.props.showUrlPreview && !this.state.links.length) {
            let links = this.findLinks(this.refs.content.children);
            if (links.length) {
                // de-dup the links (but preserve ordering)
                const seen = new Set();
                links = links.filter((link) => {
                    if (seen.has(link)) return false;
                    seen.add(link);
                    return true;
                });

                this.setState({ links: links });

                // lazy-load the hidden state of the preview widget from localstorage
                if (global.localStorage) {
                    const hidden = global.localStorage.getItem("hide_preview_" + this.props.mxEvent.getId());
                    this.setState({ widgetHidden: hidden });
                }
            }
        }
    },

    pillifyLinks: function(nodes) {
        const shouldShowPillAvatar = !SettingsStore.getValue("Pill.shouldHidePillAvatar");
        let node = nodes[0];
        while (node) {
            let pillified = false;

            if (node.tagName === "A" && node.getAttribute("href")) {
                const href = node.getAttribute("href");

                // If the link is a (localised) matrix.to link, replace it with a pill
                const Pill = sdk.getComponent('elements.Pill');
                if (Pill.isMessagePillUrl(href)) {
                    const pillContainer = document.createElement('span');

                    const room = MatrixClientPeg.get().getRoom(this.props.mxEvent.getRoomId());
                    const pill = <Pill
                        url={href}
                        inMessage={true}
                        room={room}
                        shouldShowPillAvatar={shouldShowPillAvatar}
                    />;

                    ReactDOM.render(pill, pillContainer);
                    node.parentNode.replaceChild(pillContainer, node);
                    // Pills within pills aren't going to go well, so move on
                    pillified = true;

                    // update the current node with one that's now taken its place
                    node = pillContainer;
                }
            } else if (node.nodeType === Node.TEXT_NODE) {
                const Pill = sdk.getComponent('elements.Pill');

                let currentTextNode = node;
                const roomNotifTextNodes = [];

                // Take a textNode and break it up to make all the instances of @room their
                // own textNode, adding those nodes to roomNotifTextNodes
                while (currentTextNode !== null) {
                    const roomNotifPos = Pill.roomNotifPos(currentTextNode.textContent);
                    let nextTextNode = null;
                    if (roomNotifPos > -1) {
                        let roomTextNode = currentTextNode;

                        if (roomNotifPos > 0) roomTextNode = roomTextNode.splitText(roomNotifPos);
                        if (roomTextNode.textContent.length > Pill.roomNotifLen()) {
                            nextTextNode = roomTextNode.splitText(Pill.roomNotifLen());
                        }
                        roomNotifTextNodes.push(roomTextNode);
                    }
                    currentTextNode = nextTextNode;
                }

                if (roomNotifTextNodes.length > 0) {
                    const pushProcessor = new PushProcessor(MatrixClientPeg.get());
                    const atRoomRule = pushProcessor.getPushRuleById(".m.rule.roomnotif");
                    if (atRoomRule && pushProcessor.ruleMatchesEvent(atRoomRule, this.props.mxEvent)) {
                        // Now replace all those nodes with Pills
                        for (const roomNotifTextNode of roomNotifTextNodes) {
                            // Set the next node to be processed to the one after the node
                            // we're adding now, since we've just inserted nodes into the structure
                            // we're iterating over.
                            // Note we've checked roomNotifTextNodes.length > 0 so we'll do this at least once
                            node = roomNotifTextNode.nextSibling;

                            const pillContainer = document.createElement('span');
                            const room = MatrixClientPeg.get().getRoom(this.props.mxEvent.getRoomId());
                            const pill = <Pill
                                type={Pill.TYPE_AT_ROOM_MENTION}
                                inMessage={true}
                                room={room}
                                shouldShowPillAvatar={true}
                            />;

                            ReactDOM.render(pill, pillContainer);
                            roomNotifTextNode.parentNode.replaceChild(pillContainer, roomNotifTextNode);
                        }
                        // Nothing else to do for a text node (and we don't need to advance
                        // the loop pointer because we did it above)
                        continue;
                    }
                }
            }

            if (node.childNodes && node.childNodes.length && !pillified) {
                this.pillifyLinks(node.childNodes);
            }

            node = node.nextSibling;
        }
    },

    findLinks: function(nodes) {
        let links = [];

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.tagName === "A" && node.getAttribute("href")) {
                if (this.isLinkPreviewable(node)) {
                    links.push(node.getAttribute("href"));
                }
            } else if (node.tagName === "PRE" || node.tagName === "CODE" ||
                    node.tagName === "BLOCKQUOTE") {
                continue;
            } else if (node.children && node.children.length) {
                links = links.concat(this.findLinks(node.children));
            }
        }
        return links;
    },

    isLinkPreviewable: function(node) {
        // don't try to preview relative links
        if (!node.getAttribute("href").startsWith("http://") &&
            !node.getAttribute("href").startsWith("https://")) {
            return false;
        }

        // as a random heuristic to avoid highlighting things like "foo.pl"
        // we require the linked text to either include a / (either from http://
        // or from a full foo.bar/baz style schemeless URL) - or be a markdown-style
        // link, in which case we check the target text differs from the link value.
        // TODO: make this configurable?
        if (node.textContent.indexOf("/") > -1) {
            return true;
        } else {
            const url = node.getAttribute("href");
            const host = url.match(/^https?:\/\/(.*?)(\/|$)/)[1];

            // never preview matrix.to links (if anything we should give a smart
            // preview of the room/user they point to: nobody needs to be reminded
            // what the matrix.to site looks like).
            if (host === matrixtoHost) return false;

            if (node.textContent.toLowerCase().trim().startsWith(host.toLowerCase())) {
                // it's a "foo.pl" style link
                return false;
            } else {
                // it's a [foo bar](http://foo.com) style link
                return true;
            }
        }
    },

    _addCodeCopyButton() {
        // Add 'copy' buttons to pre blocks
        Array.from(ReactDOM.findDOMNode(this).querySelectorAll('.mx_EventTile_body pre')).forEach((p) => {
            const button = document.createElement("span");
            button.className = "mx_EventTile_copyButton";
            button.onclick = (e) => {
                const copyCode = button.parentNode.getElementsByTagName("code")[0];
                const successful = this.copyToClipboard(copyCode.textContent);

                const GenericTextContextMenu = sdk.getComponent('context_menus.GenericTextContextMenu');
                const buttonRect = e.target.getBoundingClientRect();

                // The window X and Y offsets are to adjust position when zoomed in to page
                const x = buttonRect.right + window.pageXOffset;
                const y = (buttonRect.top + (buttonRect.height / 2) + window.pageYOffset) - 19;
                const {close} = ContextualMenu.createMenu(GenericTextContextMenu, {
                    chevronOffset: 10,
                    left: x,
                    top: y,
                    message: successful ? _t('Copied!') : _t('Failed to copy'),
                }, false);
                e.target.onmouseleave = close;
            };

            // Wrap a div around <pre> so that the copy button can be correctly positioned
            // when the <pre> overflows and is scrolled horizontally.
            const div = document.createElement("div");
            div.className = "mx_EventTile_pre_container";

            // Insert containing div in place of <pre> block
            p.parentNode.replaceChild(div, p);

            // Append <pre> block and copy button to container
            div.appendChild(p);
            div.appendChild(button);
        });
    },

    onCancelClick: function(event) {
        this.setState({ widgetHidden: true });
        // FIXME: persist this somewhere smarter than local storage
        if (global.localStorage) {
            global.localStorage.setItem("hide_preview_" + this.props.mxEvent.getId(), "1");
        }
        this.forceUpdate();
    },

    onEmoteSenderClick: function(event) {
        const mxEvent = this.props.mxEvent;
        dis.dispatch({
            action: 'insert_mention',
            user_id: mxEvent.getSender(),
        });
    },

    getEventTileOps: function() {
        return {
            isWidgetHidden: () => {
                return this.state.widgetHidden;
            },

            unhideWidget: () => {
                this.setState({ widgetHidden: false });
                if (global.localStorage) {
                    global.localStorage.removeItem("hide_preview_" + this.props.mxEvent.getId());
                }
            },

            getInnerText: () => {
                return this.refs.content.innerText;
            },
        };
    },

    onStarterLinkClick: function(starterLink, ev) {
        ev.preventDefault();
        // We need to add on our scalar token to the starter link, but we may not have one!
        // In addition, we can't fetch one on click and then go to it immediately as that
        // is then treated as a popup!
        // We can get around this by fetching one now and showing a "confirmation dialog" (hurr hurr)
        // which requires the user to click through and THEN we can open the link in a new tab because
        // the window.open command occurs in the same stack frame as the onClick callback.

        // Go fetch a scalar token
        const scalarClient = new ScalarAuthClient();
        scalarClient.connect().then(() => {
            const completeUrl = scalarClient.getStarterLink(starterLink);
            const QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");
            const integrationsUrl = SdkConfig.get().integrations_ui_url;
            Modal.createTrackedDialog('Add an integration', '', QuestionDialog, {
                title: _t("Add an Integration"),
                description:
                    <div>
                        { _t("You are about to be taken to a third-party site so you can " +
                            "authenticate your account for use with %(integrationsUrl)s. " +
                            "Do you wish to continue?", { integrationsUrl: integrationsUrl }) }
                    </div>,
                button: _t("Continue"),
                onFinished: function(confirmed) {
                    if (!confirmed) {
                        return;
                    }
                    const width = window.screen.width > 1024 ? 1024 : window.screen.width;
                    const height = window.screen.height > 800 ? 800 : window.screen.height;
                    const left = (window.screen.width - width) / 2;
                    const top = (window.screen.height - height) / 2;
                    window.open(completeUrl, '_blank', `height=${height}, width=${width}, top=${top}, left=${left},`);
                },
            });
        });
    },

    render: function() {
        const EmojiText = sdk.getComponent('elements.EmojiText');
        const mxEvent = this.props.mxEvent;
        const content = mxEvent.getContent();

        const stripReply = ReplyThread.getParentEventId(mxEvent);
        let body = HtmlUtils.bodyToHtml(content, this.props.highlights, {
            disableBigEmoji: SettingsStore.getValue('TextualBody.disableBigEmoji'),
            // Part of Replies fallback support
            stripReplyFallback: stripReply,
        });

        if (this.props.highlightLink) {
            body = <a href={this.props.highlightLink}>{ body }</a>;
        } else if (content.data && typeof content.data["org.matrix.neb.starter_link"] === "string") {
            body = <a href="#" onClick={this.onStarterLinkClick.bind(this, content.data["org.matrix.neb.starter_link"])}>{ body }</a>;
        }

        let widgets;
        if (this.state.links.length && !this.state.widgetHidden && this.props.showUrlPreview) {
            const LinkPreviewWidget = sdk.getComponent('rooms.LinkPreviewWidget');
            widgets = this.state.links.map((link)=>{
                return <LinkPreviewWidget
                            key={link}
                            link={link}
                            mxEvent={this.props.mxEvent}
                            onCancelClick={this.onCancelClick}
                            onWidgetLoad={this.props.onWidgetLoad} />;
            });
        }

        switch (content.msgtype) {
            case "m.emote":
                const name = mxEvent.sender ? mxEvent.sender.name : mxEvent.getSender();
                return (
                    <span ref="content" className="mx_MEmoteBody mx_EventTile_content">
                        *&nbsp;
                        <EmojiText
                            className="mx_MEmoteBody_sender"
                            onClick={this.onEmoteSenderClick}
                        >
                            { name }
                        </EmojiText>
                        &nbsp;
                        { body }
                        { widgets }
                    </span>
                );
            case "m.notice":
                return (
                    <span ref="content" className="mx_MNoticeBody mx_EventTile_content">
                        { body }
                        { widgets }
                    </span>
                );
            default: // including "m.text"
                return (
                    <span ref="content" className="mx_MTextBody mx_EventTile_content">
                        { body }
                        { widgets }
                    </span>
                );
        }
    },
});
