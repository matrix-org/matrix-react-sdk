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

var React = require("react");
var ReactDOM = require("react-dom");
var GeminiScrollbar = require('react-gemini-scrollbar');
var q = require("q");

var DEBUG_SCROLL = false;

if (DEBUG_SCROLL) {
    // using bind means that we get to keep useful line numbers in the console
    var debuglog = console.log.bind(console);
} else {
    var debuglog = function () {};
}

/* This component implements an intelligent scrolling list.
 *
 * It wraps a list of <li> children; when items are added to the start or end
 * of the list, the scroll position is updated so that the user still sees the
 * same position in the list.
 *
 * It also provides a hook which allows parents to provide more list elements
 * when we get close to the start or end of the list.
 *
 * Some notes about the implementation:
 *
 * The saved 'scrollState' can exist in one of three states:
 *
 *   - null: (the default, and restored by resetScrollState) - no explicit
 *     state has been set yet. Updates to the children will be ignored as far
 *     as scrolling the viewport goes.
 *
 *   - atBottom: the viewport is scrolled down as far as it can be. When the
 *     children are updated, the scroll position will be updated to ensure it
 *     is still at the bottom.
 *
 *   - normal, in which the viewport is conceptually tied at a specific scroll
 *     offset.  We don't save the absolute scroll offset, because that would be
 *     affected by window width, zoom level, amount of scrollback, etc. Instead
 *     we save an identifier for the last fully-visible message, and the number
 *     of pixels the window was scrolled below it - which is hopefully be near
 *     enough.
 *
 * The 'stickyBottom' property controls the behaviour when we reach the bottom
 * of the window (either through a user-initiated scroll, or by calling
 * scrollToBottom). If stickyBottom is enabled, the scrollState will enter
 * 'atBottom' state - ensuring that new additions cause the window to scroll
 * down further. If stickyBottom is disabled, we just save the scroll offset as
 * normal.
 *
 * Each child element should have a 'data-scroll-token'. This token is used to
 * serialise the scroll state, and returned as the 'lastDisplayedScrollToken'
 * attribute by getScrollState().
 */
module.exports = React.createClass({
    displayName: 'ScrollPanel',

    propTypes: {
        /* stickyBottom: if set to true, then once the user hits the bottom of
         * the list, any new children added to the list will cause the list to
         * scroll down to show the new element, rather than preserving the
         * existing view.
         */
        stickyBottom: React.PropTypes.bool,

        /* onFillRequest(backwards): a callback which is called on scroll when
         * the user nears the start (backwards = true) or end (backwards =
         * false) of the list.
         *
         * This should return a promise; no more calls will be made until the
         * promise completes.
         *
         * The promise should resolve to true if there is more data to be
         * retrieved in this direction (in which case onFillRequest may be
         * called again immediately), or false if there is no more data in this
         * directon (at this time) - which will stop the pagination cycle until
         * the user scrolls again.
         */
        onFillRequest: React.PropTypes.func,

        /* onScroll: a callback which is called whenever any scroll happens.
         */
        onScroll: React.PropTypes.func,

        /* className: classnames to add to the top-level div
         */
        className: React.PropTypes.string,

        /* style: styles to add to the top-level div
         */
        style: React.PropTypes.object,
    },

    getDefaultProps: function() {
        return {
            stickyBottom: true,
            onFillRequest: function(backwards) { return q(false); },
            onScroll: function() {},
        };
    },

    componentWillMount: function() {
        this._pendingFillRequests = {b: null, f: null};
        this.resetScrollState();
    },

    componentDidMount: function() {
        this.checkFillState();
    },

    componentDidUpdate: function() {
        // after adding event tiles, we may need to tweak the scroll (either to
        // keep at the bottom of the timeline, or to maintain the view after
        // adding events to the top).
        this._restoreSavedScrollState();

        // we also re-check the fill state, in case the paginate was inadequate
        this.checkFillState();
    },

    componentWillUnmount: function() {
        // set a boolean to say we've been unmounted, which any pending
        // promises can use to throw away their results.
        //
        // (We could use isMounted(), but facebook have deprecated that.)
        this.unmounted = true;
    },

    onScroll: function(ev) {
        var sn = this._getScrollNode();
        debuglog("Scroll event: offset now:", sn.scrollTop, "recentEventScroll:", this.recentEventScroll);

        // Sometimes we see attempts to write to scrollTop essentially being
        // ignored. (Or rather, it is successfully written, but on the next
        // scroll event, it's been reset again).
        //
        // This was observed on Chrome 47, when scrolling using the trackpad in OS
        // X Yosemite.  Can't reproduce on El Capitan. Our theory is that this is
        // due to Chrome not being able to cope with the scroll offset being reset
        // while a two-finger drag is in progress.
        //
        // By way of a workaround, we detect this situation and just keep
        // resetting scrollTop until we see the scroll node have the right
        // value.
        if (this.recentEventScroll !== undefined) {
            if(sn.scrollTop < this.recentEventScroll-200) {
                console.log("Working around vector-im/vector-web#528");
                this._restoreSavedScrollState();
                return;
            }
            this.recentEventScroll = undefined;
        }

        // If there weren't enough children to fill the viewport, the scroll we
        // got might be different to the scroll we wanted; we don't want to
        // forget what we wanted, so don't overwrite the saved state unless
        // this appears to be a user-initiated scroll.
        if (sn.scrollTop != this._lastSetScroll) {
            this._saveScrollState();
        } else {
            debuglog("Ignoring scroll echo");
        }

        this.props.onScroll(ev);

        this.checkFillState();
    },

    // return true if the content is fully scrolled down right now; else false.
    //
    // Note that if the content hasn't yet been fully populated, this may
    // spuriously return true even if the user wanted to be looking at earlier
    // content. So don't call it in render() cycles.
    isAtBottom: function() {
        var sn = this._getScrollNode();
        // + 1 here to avoid fractional pixel rounding errors
        return sn.scrollHeight - Math.ceil(sn.scrollTop) <= sn.clientHeight + 1;
    },

    // check the scroll state and send out backfill requests if necessary.
    checkFillState: function() {
        if (this.unmounted) {
            return;
        }

        var sn = this._getScrollNode();

        // if there is less than a screenful of messages above or below the
        // viewport, try to get some more messages.
        //
        // scrollTop is the number of pixels between the top of the content and
        //     the top of the viewport.
        //
        // scrollHeight is the total height of the content.
        //
        // clientHeight is the height of the viewport (excluding borders,
        // margins, and scrollbars).
        //
        //
        //   .---------.          -                 -
        //   |         |          |  scrollTop      |
        // .-+---------+-.    -   -                 |
        // | |         | |    |                     |
        // | |         | |    |  clientHeight       | scrollHeight
        // | |         | |    |                     |
        // `-+---------+-'    -                     |
        //   |         |                            |
        //   |         |                            |
        //   `---------'                            -
        //

        if (sn.scrollTop < sn.clientHeight) {
            // need to back-fill
            this._maybeFill(true);
        }
        if (sn.scrollTop > sn.scrollHeight - sn.clientHeight * 2) {
            // need to forward-fill
            this._maybeFill(false);
        }
    },

    // check if there is already a pending fill request. If not, set one off.
    _maybeFill: function(backwards) {
        var dir = backwards ? 'b' : 'f';
        if (this._pendingFillRequests[dir]) {
            debuglog("ScrollPanel: Already a "+dir+" fill in progress - not starting another");
            return;
        }

        debuglog("ScrollPanel: starting "+dir+" fill");

        // onFillRequest can end up calling us recursively (via onScroll
        // events) so make sure we set this before firing off the call. That
        // does present the risk that we might not ever actually fire off the
        // fill request, so wrap it in a try/catch.
        this._pendingFillRequests[dir] = true;
        var fillPromise;
        try {
             fillPromise = this.props.onFillRequest(backwards);
        } catch (e) {
            this._pendingFillRequests[dir] = false;
            throw e;
        }

        q.finally(fillPromise, () => {
            this._pendingFillRequests[dir] = false;
        }).then((hasMoreResults) => {
            debuglog("ScrollPanel: "+dir+" fill complete; hasMoreResults:"+hasMoreResults);
            if (hasMoreResults) {
                // further pagination requests have been disabled until now, so
                // it's time to check the fill state again in case the pagination
                // was insufficient.
                this.checkFillState();
            }
        }).done();
    },

    // get the current scroll position of the room, so that it can be
    // restored later
    getScrollState: function() {
        return this.scrollState;
    },

    /* reset the saved scroll state.
     *
     * This will cause the scroll to be reinitialised on the next update of the
     * child list.
     *
     * This is useful if the list is being replaced, and you don't want to
     * preserve scroll even if new children happen to have the same scroll
     * tokens as old ones.
     */
    resetScrollState: function() {
        this.scrollState = null;
    },
    
    scrollToBottom: function() {
        // the easiest way to make sure that the scroll state is correctly
        // saved is to do the scroll, then save the updated state. (Calculating
        // it ourselves is hard, and we can't rely on an onScroll callback
        // happening, since there may be no user-visible change here).
        var scrollNode = this._getScrollNode();

        scrollNode.scrollTop = scrollNode.scrollHeight;
        debuglog("Scrolled to bottom; offset now", scrollNode.scrollTop);
        this._lastSetScroll = scrollNode.scrollTop;

        this._saveScrollState();
    },

    // scroll the message list to the node with the given scrollToken. See
    // notes in _saveScrollState on how this works.
    //
    // pixelOffset gives the number of pixels between the bottom of the node
    // and the bottom of the container. If undefined, it will put the node
    // in the middle of the container.
    scrollToToken: function(scrollToken, pixelOffset) {
        var scrollNode = this._getScrollNode();

        // default to the middle
        if (pixelOffset === undefined) {
            pixelOffset = scrollNode.clientHeight / 2;
        }

        // save the desired scroll state ...
        this.scrollState = {
            atBottom: false,
            lastDisplayedScrollToken: scrollToken,
            pixelOffset: pixelOffset
        };

        // ... then make it so.
        this._restoreSavedScrollState();
    },

    _scrollToToken: function(scrollToken, pixelOffset) {
        /* find the dom node with the right scrolltoken */
        var node;
        var messages = this.refs.itemlist.children;
        for (var i = messages.length-1; i >= 0; --i) {
            var m = messages[i];
            if (!m.dataset.scrollToken) continue;
            if (m.dataset.scrollToken == scrollToken) {
                node = m;
                break;
            }
        }

        if (!node) {
            debuglog("ScrollPanel: No node with scrollToken '"+scrollToken+"'");
            return;
        }

        var scrollNode = this._getScrollNode();
        var wrapperRect = ReactDOM.findDOMNode(this).getBoundingClientRect();
        var boundingRect = node.getBoundingClientRect();
        var scrollDelta = boundingRect.bottom + pixelOffset - wrapperRect.bottom;
        if(scrollDelta != 0) {
            scrollNode.scrollTop += scrollDelta;

            // see the comments in onMessageListScroll regarding recentEventScroll
            this.recentEventScroll = scrollNode.scrollTop;
        }

        debuglog("Scrolled to token", node.dataset.scrollToken, "+",
                 pixelOffset+":", scrollNode.scrollTop, 
                 "(delta: "+scrollDelta+")");
        debuglog("recentEventScroll now "+this.recentEventScroll);
    },

    _saveScrollState: function() {
        // Our scroll implementation is agnostic of the precise contents of the
        // message list (since it needs to work with both search results and
        // timelines). 'refs.messageList' is expected to be a DOM node with a
        // number of children, each of which may have a 'data-scroll-token'
        // attribute. It is this token which is stored as the
        // 'lastDisplayedScrollToken'.

        if (this.props.stickyBottom && this.isAtBottom()) {
            this.scrollState = { atBottom: true };
            debuglog("Saved scroll state", this.scrollState);
            return;
        }

        var itemlist = this.refs.itemlist;
        var wrapperRect = ReactDOM.findDOMNode(this).getBoundingClientRect();
        var messages = itemlist.children;

        for (var i = messages.length-1; i >= 0; --i) {
            var node = messages[i];
            if (!node.dataset.scrollToken) continue;

            var boundingRect = node.getBoundingClientRect();
            if (boundingRect.bottom < wrapperRect.bottom) {
                this.scrollState = {
                    atBottom: false,
                    lastDisplayedScrollToken: node.dataset.scrollToken,
                    pixelOffset: wrapperRect.bottom - boundingRect.bottom,
                }
                debuglog("Saved scroll state", this.scrollState);
                return;
            }
        }

        debuglog("Unable to save scroll state: found no children in the viewport");
    },

    _restoreSavedScrollState: function() {
        var scrollState = this.scrollState;
        var scrollNode = this._getScrollNode();

        if (!scrollState) {
            debuglog("No scroll state saved yet");
            return;
        }

        if (scrollState.atBottom) {
            scrollNode.scrollTop = scrollNode.scrollHeight;
            debuglog("Scrolled to bottom; offset now", scrollNode.scrollTop);
        } else if (scrollState.lastDisplayedScrollToken) {
            this._scrollToToken(scrollState.lastDisplayedScrollToken,
                               scrollState.pixelOffset);
            debuglog("Scrolled to token; offset now", scrollNode.scrollTop);
        }
        this._lastSetScroll = scrollNode.scrollTop;
    },


    /* get the DOM node which has the scrollTop property we care about for our
     * message panel.
     */
    _getScrollNode: function() {
        if (this.unmounted) {
            // this shouldn't happen, but when it does, turn the NPE into
            // something more meaningful.
            throw new Error("ScrollPanel._getScrollNode called when unmounted");
        }

        var panel = ReactDOM.findDOMNode(this.refs.geminiPanel);

        // If the gemini scrollbar is doing its thing, this will be a div within
        // the message panel (ie, the gemini container); otherwise it will be the
        // message panel itself.

        if (panel.classList.contains('gm-prevented')) {
            return panel;
        } else {
            return panel.children[2]; // XXX: Fragile!
        }
    },

    render: function() {
        // TODO: the classnames on the div and ol could do with being updated to
        // reflect the fact that we don't necessarily contain a list of messages.
        // it's not obvious why we have a separate div and ol anyway.
        return (<GeminiScrollbar autoshow={true} ref="geminiPanel" onScroll={ this.onScroll }
                className={this.props.className} style={this.props.style}>
                    <div className="mx_RoomView_messageListWrapper">
                        <ol ref="itemlist" className="mx_RoomView_MessageList" aria-live="polite">
                            {this.props.children}
                        </ol>
                    </div>
                </GeminiScrollbar>
               );
    },
});
