/*
Copyright 2015, 2016 OpenMarket Ltd

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

var React = require('react');
var ReactDOM = require('react-dom');
var HtmlUtils = require('../../../HtmlUtils');
var linkify = require('linkifyjs');
var linkifyElement = require('linkifyjs/element');
var linkifyMatrix = require('../../../linkify-matrix');
var sdk = require('../../../index');

linkifyMatrix(linkify);

module.exports = React.createClass({
    displayName: 'TextualBody',

    propTypes: {
        /* the MatrixEvent to show */
        mxEvent: React.PropTypes.object.isRequired,

        /* a list of words to highlight */
        highlights: React.PropTypes.array,

        /* link URL for the highlights */
        highlightLink: React.PropTypes.string,

        /* callback for when our widget has loaded */
        onWidgetLoad: React.PropTypes.func,
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

    componentDidMount: function() {
        linkifyElement(this.refs.content, linkifyMatrix.options);

        var links = this.findLinks(this.refs.content.children);
        if (links.length) {
            this.setState({ links: links.map((link)=>{
                return link.getAttribute("href");
            })});

            // lazy-load the hidden state of the preview widget from localstorage
            if (global.localStorage) {
                var hidden = global.localStorage.getItem("hide_preview_" + this.props.mxEvent.getId());
                this.setState({ widgetHidden: hidden });
            }
        }

        if (this.props.mxEvent.getContent().format === "org.matrix.custom.html")
            HtmlUtils.highlightDom(ReactDOM.findDOMNode(this));
    },

    shouldComponentUpdate: function(nextProps, nextState) {
        // exploit that events are immutable :)
        // ...and that .links is only ever set in componentDidMount and never changes
        return (nextProps.mxEvent.getId() !== this.props.mxEvent.getId() ||
                nextProps.highlights !== this.props.highlights ||
                nextProps.highlightLink !== this.props.highlightLink ||
                nextState.links !== this.state.links ||
                nextState.widgetHidden !== this.state.widgetHidden);
    },

    findLinks: function(nodes) {
        var links = [];
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.tagName === "A" && node.getAttribute("href"))
            {
                if (this.isLinkPreviewable(node)) {
                    links.push(node);
                }
            }
            else if (node.tagName === "PRE" || node.tagName === "CODE") {
                continue;
            }
            else if (node.children && node.children.length) {
                links = links.concat(this.findLinks(node.children));
            }
        }
        return links;
    },

    isLinkPreviewable: function(node) {
        // don't try to preview relative links
        if (!node.getAttribute("href").startsWith("http://") &&
            !node.getAttribute("href").startsWith("https://"))
        {
            return false;
        }

        // as a random heuristic to avoid highlighting things like "foo.pl"
        // we require the linked text to either include a / (either from http://
        // or from a full foo.bar/baz style schemeless URL) - or be a markdown-style
        // link, in which case we check the target text differs from the link value.
        // TODO: make this configurable?
        if (node.textContent.indexOf("/") > -1)
        {
            return node;
        }
        else {
            var url = node.getAttribute("href");
            var host = url.match(/^https?:\/\/(.*?)(\/|$)/)[1];
            if (node.textContent.toLowerCase().trim().startsWith(host.toLowerCase())) {
                // it's a "foo.pl" style link
                return;
            }
            else {
                // it's a [foo bar](http://foo.com) style link
                return node;
            }
        }
    },

    onCancelClick: function(event) {
        this.setState({ widgetHidden: true });
        // FIXME: persist this somewhere smarter than local storage
        if (global.localStorage) {
            global.localStorage.setItem("hide_preview_" + this.props.mxEvent.getId(), "1");
        }
        this.forceUpdate();
    },

    getEventTileOps: function() {
        var self = this;
        return {
            isWidgetHidden: function() {
                return self.state.widgetHidden;
            },

            unhideWidget: function() {
                self.setState({ widgetHidden: false });
                if (global.localStorage) {
                    global.localStorage.removeItem("hide_preview_" + self.props.mxEvent.getId());
                }
            },
        }
    },

    render: function() {
        var mxEvent = this.props.mxEvent;
        var content = mxEvent.getContent();
        var body = HtmlUtils.bodyToHtml(content, this.props.highlights, {highlightLink: this.props.highlightLink});

        // TODO: separate this component from the textual event
        var TextualEvent = sdk.getComponent('messages.TextualEvent');

        var widgets;
        if (this.state.links.length && !this.state.widgetHidden) {
            var LinkPreviewWidget = sdk.getComponent('rooms.LinkPreviewWidget');
            widgets = this.state.links.map((link)=>{
                return (
                    <LinkPreviewWidget
                        key={ link }
                        link={ link }
                        mxEvent={ this.props.mxEvent }
                        onCancelClick={ this.onCancelClick }
                        onWidgetLoad={ this.props.onWidgetLoad } />
                );
            });
        }

        switch (content.msgtype) {
            case "m.emote":
                var name = mxEvent.sender ? mxEvent.sender.name : mxEvent.getSender();
                return (
                    <div ref="content" className="mx_MEmoteBody">
                        * { name } { body }
                        { widgets }
                    </div>
                );
            case "m.notice":
                return (
                    <div ref="content" className="mx_MNoticeBody">
                        { body }
                        { widgets }
                    </div>
                );
            default: // including "m.text"
                return (
                    <div ref="content" className="mx_MTextBody">
                        { body }
                        { widgets }
                    </div>
                );
        }
    },
});

