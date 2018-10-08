/*
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
import React from 'react';
import sdk from '../../../index';
import {_t} from '../../../languageHandler';
import PropTypes from 'prop-types';
import dis from '../../../dispatcher';
import {wantsDateSeparator} from '../../../DateUtils';
import {MatrixEvent, MatrixClient} from 'matrix-js-sdk';
import {makeEventPermalink, makeUserPermalink} from "../../../matrix-to";
import SettingsStore from "../../../settings/SettingsStore";

// This component does no cycle detection, simply because the only way to make such a cycle would be to
// craft event_id's, using a homeserver that generates predictable event IDs; even then the impact would
// be low as each event being loaded (after the first) is triggered by an explicit user action.
export default class ReplyThread extends React.Component {
    static propTypes = {
        // the latest event in this chain of replies
        parentEv: PropTypes.instanceOf(MatrixEvent),
        // called when the ReplyThread contents has changed, including EventTiles thereof
        onWidgetLoad: PropTypes.func.isRequired,
    };

    static contextTypes = {
        matrixClient: PropTypes.instanceOf(MatrixClient).isRequired,
    };

    constructor(props, context) {
        super(props, context);

        this.state = {
            // The loaded events to be rendered as linear-replies
            events: [],

            // The latest loaded event which has not yet been shown
            loadedEv: null,
            // Whether the component is still loading more events
            loading: true,

            // Whether as error was encountered fetching a replied to event.
            err: false,
        };

        this.onQuoteClick = this.onQuoteClick.bind(this);
        this.canCollapse = this.canCollapse.bind(this);
        this.collapse = this.collapse.bind(this);
    }

    static getParentEventId(ev) {
        if (!ev || ev.isRedacted()) return;

        const mRelatesTo = ev.getWireContent()['m.relates_to'];
        if (mRelatesTo && mRelatesTo['m.in_reply_to']) {
            const mInReplyTo = mRelatesTo['m.in_reply_to'];
            if (mInReplyTo && mInReplyTo['event_id']) return mInReplyTo['event_id'];
        }
    }

    // Part of Replies fallback support
    static stripPlainReply(body) {
        // Removes lines beginning with `> ` until you reach one that doesn't.
        const lines = body.split('\n');
        while (lines.length && lines[0].startsWith('> ')) lines.shift();
        // Reply fallback has a blank line after it, so remove it to prevent leading newline
        if (lines[0] === '') lines.shift();
        return lines.join('\n');
    }

    // Part of Replies fallback support
    static stripHTMLReply(html) {
        return html.replace(/^<mx-reply>[\s\S]+?<\/mx-reply>/, '');
    }

    // Part of Replies fallback support
    static getNestedReplyText(ev) {
        if (!ev) return null;

        let {body, formatted_body: html} = ev.getContent();
        if (this.getParentEventId(ev)) {
            if (body) body = this.stripPlainReply(body);
            if (html) html = this.stripHTMLReply(html);
        }

        const evLink = makeEventPermalink(ev.getRoomId(), ev.getId());
        const userLink = makeUserPermalink(ev.getSender());
        const mxid = ev.getSender();

        // This fallback contains text that is explicitly EN.
        switch (ev.getContent().msgtype) {
            case 'm.text':
            case 'm.notice': {
                html = `<mx-reply><blockquote><a href="${evLink}">In reply to</a> <a href="${userLink}">${mxid}</a>`
                    + `<br>${html || body}</blockquote></mx-reply>`;
                const lines = body.trim().split('\n');
                if (lines.length > 0) {
                    lines[0] = `<${mxid}> ${lines[0]}`;
                    body = lines.map((line) => `> ${line}`).join('\n') + '\n\n';
                }
                break;
            }
            case 'm.image':
                html = `<mx-reply><blockquote><a href="${evLink}">In reply to</a> <a href="${userLink}">${mxid}</a>`
                    + `<br>sent an image.</blockquote></mx-reply>`;
                body = `> <${mxid}> sent an image.\n\n`;
                break;
            case 'm.video':
                html = `<mx-reply><blockquote><a href="${evLink}">In reply to</a> <a href="${userLink}">${mxid}</a>`
                    + `<br>sent a video.</blockquote></mx-reply>`;
                body = `> <${mxid}> sent a video.\n\n`;
                break;
            case 'm.audio':
                html = `<mx-reply><blockquote><a href="${evLink}">In reply to</a> <a href="${userLink}">${mxid}</a>`
                    + `<br>sent an audio file.</blockquote></mx-reply>`;
                body = `> <${mxid}> sent an audio file.\n\n`;
                break;
            case 'm.file':
                html = `<mx-reply><blockquote><a href="${evLink}">In reply to</a> <a href="${userLink}">${mxid}</a>`
                    + `<br>sent a file.</blockquote></mx-reply>`;
                body = `> <${mxid}> sent a file.\n\n`;
                break;
            case 'm.emote': {
                html = `<mx-reply><blockquote><a href="${evLink}">In reply to</a> * `
                    + `<a href="${userLink}">${mxid}</a><br>${html || body}</blockquote></mx-reply>`;
                const lines = body.trim().split('\n');
                if (lines.length > 0) {
                    lines[0] = `* <${mxid}> ${lines[0]}`;
                    body = lines.map((line) => `> ${line}`).join('\n') + '\n\n';
                }
                break;
            }
            default:
                return null;
        }

        return {body, html};
    }

    static makeReplyMixIn(ev) {
        if (!ev) return {};
        return {
            'm.relates_to': {
                'm.in_reply_to': {
                    'event_id': ev.getId(),
                },
            },
        };
    }

    static makeThread(parentEv, onWidgetLoad, ref) {
        if (!ReplyThread.getParentEventId(parentEv)) {
            return <div />;
        }
        return <ReplyThread parentEv={parentEv} onWidgetLoad={onWidgetLoad} ref={ref} />;
    }

    componentWillMount() {
        this.unmounted = false;
        this.room = this.context.matrixClient.getRoom(this.props.parentEv.getRoomId());
        this.initialize();
    }

    componentDidUpdate() {
        this.props.onWidgetLoad();
    }

    componentWillUnmount() {
        this.unmounted = true;
    }

    async initialize() {
        const {parentEv} = this.props;
        // at time of making this component we checked that props.parentEv has a parentEventId
        const ev = await this.getEvent(ReplyThread.getParentEventId(parentEv));
        if (this.unmounted) return;

        if (ev) {
            this.setState({
                events: [ev],
            }, this.loadNextEvent);
        } else {
            this.setState({err: true});
        }
    }

    async loadNextEvent() {
        if (this.unmounted) return;
        const ev = this.state.events[0];
        const inReplyToEventId = ReplyThread.getParentEventId(ev);

        if (!inReplyToEventId) {
            this.setState({
                loading: false,
            });
            return;
        }

        const loadedEv = await this.getEvent(inReplyToEventId);
        if (this.unmounted) return;

        if (loadedEv) {
            this.setState({loadedEv});
        } else {
            this.setState({err: true});
        }
    }

    async getEvent(eventId) {
        const event = this.room.findEventById(eventId);
        if (event) return event;

        try {
            // ask the client to fetch the event we want using the context API, only interface to do so is to ask
            // for a timeline with that event, but once it is loaded we can use findEventById to look up the ev map
            await this.context.matrixClient.getEventTimeline(this.room.getUnfilteredTimelineSet(), eventId);
        } catch (e) {
            // if it fails catch the error and return early, there's no point trying to find the event in this case.
            // Return null as it is falsey and thus should be treated as an error (as the event cannot be resolved).
            return null;
        }
        return this.room.findEventById(eventId);
    }

    canCollapse() {
        return this.state.events.length > 1;
    }

    collapse() {
        this.initialize();
    }

    onQuoteClick() {
        const events = [this.state.loadedEv, ...this.state.events];

        this.setState({
            loadedEv: null,
            events,
        }, this.loadNextEvent);

        dis.dispatch({action: 'focus_composer'});
    }

    render() {
        let header = null;

        if (this.state.err) {
            header = <blockquote className="mx_ReplyThread mx_ReplyThread_error">
                {
                    _t('Unable to load event that was replied to, ' +
                        'it either does not exist or you do not have permission to view it.')
                }
            </blockquote>;
        } else if (this.state.loadedEv) {
            const ev = this.state.loadedEv;
            const Pill = sdk.getComponent('elements.Pill');
            const room = this.context.matrixClient.getRoom(ev.getRoomId());
            header = <blockquote className="mx_ReplyThread">
                {
                    _t('<a>In reply to</a> <pill>', {}, {
                        'a': (sub) => <a onClick={this.onQuoteClick} className="mx_ReplyThread_show">{ sub }</a>,
                        'pill': <Pill type={Pill.TYPE_USER_MENTION} room={room}
                                      url={makeUserPermalink(ev.getSender())} shouldShowPillAvatar={true} />,
                    })
                }
            </blockquote>;
        } else if (this.state.loading) {
            const Spinner = sdk.getComponent("elements.Spinner");
            header = <Spinner w={16} h={16} />;
        }

        const EventTile = sdk.getComponent('views.rooms.EventTile');
        const DateSeparator = sdk.getComponent('messages.DateSeparator');
        const evTiles = this.state.events.map((ev) => {
            let dateSep = null;

            if (wantsDateSeparator(this.props.parentEv.getDate(), ev.getDate())) {
                dateSep = <a href={this.props.url}><DateSeparator ts={ev.getTs()} /></a>;
            }

            return <blockquote className="mx_ReplyThread" key={ev.getId()}>
                { dateSep }
                <EventTile mxEvent={ev}
                           tileShape="reply"
                           onWidgetLoad={this.props.onWidgetLoad}
                           isTwelveHour={SettingsStore.getValue("showTwelveHourTimestamps")} />
            </blockquote>;
        });

        return <div>
            <div>{ header }</div>
            <div>{ evTiles }</div>
        </div>;
    }
}
