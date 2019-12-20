/*
Copyright 2016 OpenMarket Ltd
Copyright 2019 The Matrix.org Foundation C.I.C.

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

import SettingsStore from "../../../src/settings/SettingsStore";

import React from 'react';
import createReactClass from 'create-react-class';
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
const TestUtils = require('react-dom/test-utils');
const expect = require('expect');
import sinon from 'sinon';
import { EventEmitter } from "events";

const sdk = require('matrix-react-sdk');

const MessagePanel = sdk.getComponent('structures.MessagePanel');
import {MatrixClientPeg} from '../../../src/MatrixClientPeg';
import Matrix from 'matrix-js-sdk';

const test_utils = require('test-utils');
const mockclock = require('mock-clock');

import Velocity from 'velocity-animate';

let client;
const room = new Matrix.Room();

// wrap MessagePanel with a component which provides the MatrixClient in the context.
const WrappedMessagePanel = createReactClass({
    childContextTypes: {
        matrixClient: PropTypes.object,
        room: PropTypes.object,
    },

    getChildContext: function() {
        return {
            matrixClient: client,
            room: {
                canReact: true,
                canReply: true,
            },
        };
    },

    getInitialState: function() {
        return {
            resizeNotifier: new EventEmitter(),
        };
    },

    render: function() {
        return <MessagePanel room={room} {...this.props} resizeNotifier={this.state.resizeNotifier} />;
    },
});

describe('MessagePanel', function() {
    const clock = mockclock.clock();
    const realSetTimeout = window.setTimeout;
    const events = mkEvents();
    let sandbox = null;

    beforeEach(function() {
        test_utils.beforeEach(this);
        sandbox = test_utils.stubClient();
        client = MatrixClientPeg.get();
        client.credentials = {userId: '@me:here'};

        // HACK: We assume all settings want to be disabled
        SettingsStore.getValue = sinon.stub().returns(false);
        SettingsStore.getValue.withArgs('showDisplaynameChanges').returns(true);

        // This option clobbers the duration of all animations to be 1ms
        // which makes unit testing a lot simpler (the animation doesn't
        // complete without this even if we mock the clock and tick it
        // what should be the correct amount of time).
        Velocity.mock = true;
    });

    afterEach(function() {
        delete Velocity.mock;

        clock.uninstall();
        sandbox.restore();
    });

    function mkEvents() {
        const events = [];
        const ts0 = Date.now();
        for (let i = 0; i < 10; i++) {
            events.push(test_utils.mkMessage(
                {
                    event: true, room: "!room:id", user: "@user:id",
                    ts: ts0 + i*1000,
                }));
        }
        return events;
    }


    // make a collection of events with some member events that should be collapsed
    // with a MemberEventListSummary
    function mkMelsEvents() {
        const events = [];
        const ts0 = Date.now();

        let i = 0;
        events.push(test_utils.mkMessage({
            event: true, room: "!room:id", user: "@user:id",
            ts: ts0 + ++i*1000,
        }));

        for (i = 0; i < 10; i++) {
            events.push(test_utils.mkMembership({
                event: true, room: "!room:id", user: "@user:id",
                target: {
                    userId: "@user:id",
                    name: "Bob",
                    getAvatarUrl: () => {
                        return "avatar.jpeg";
                    },
                },
                ts: ts0 + i*1000,
                mship: 'join',
                prevMship: 'join',
                name: 'A user',
            }));
        }

        events.push(test_utils.mkMessage({
            event: true, room: "!room:id", user: "@user:id",
            ts: ts0 + ++i*1000,
        }));

        return events;
    }

    it('should show the events', function() {
        const res = TestUtils.renderIntoDocument(
                <WrappedMessagePanel className="cls" events={events} />,
        );

        // just check we have the right number of tiles for now
        const tiles = TestUtils.scryRenderedComponentsWithType(
            res, sdk.getComponent('rooms.EventTile'));
        expect(tiles.length).toEqual(10);
    });

    it('should collapse adjacent member events', function() {
        const res = TestUtils.renderIntoDocument(
            <WrappedMessagePanel className="cls" events={mkMelsEvents()} />,
        );

        // just check we have the right number of tiles for now
        const tiles = TestUtils.scryRenderedComponentsWithType(
            res, sdk.getComponent('rooms.EventTile'),
        );
        expect(tiles.length).toEqual(2);

        const summaryTiles = TestUtils.scryRenderedComponentsWithType(
            res, sdk.getComponent('elements.MemberEventListSummary'),
        );
        expect(summaryTiles.length).toEqual(1);
    });

    it('should show the read-marker in the right place', function() {
        const res = TestUtils.renderIntoDocument(
                <WrappedMessagePanel className="cls" events={events} readMarkerEventId={events[4].getId()}
                    readMarkerVisible={true} />,
        );

        const tiles = TestUtils.scryRenderedComponentsWithType(
            res, sdk.getComponent('rooms.EventTile'));

        // find the <li> which wraps the read marker
        const rm = TestUtils.findRenderedDOMComponentWithClass(res, 'mx_RoomView_myReadMarker_container');

        // it should follow the <li> which wraps the event tile for event 4
        const eventContainer = ReactDOM.findDOMNode(tiles[4]).parentNode;
        expect(rm.previousSibling).toEqual(eventContainer);
    });

    it('should show the read-marker that fall in summarised events after the summary', function() {
        const melsEvents = mkMelsEvents();
        const res = TestUtils.renderIntoDocument(
                <WrappedMessagePanel className="cls" events={melsEvents} readMarkerEventId={melsEvents[4].getId()}
                    readMarkerVisible={true} />,
        );

        const summary = TestUtils.findRenderedDOMComponentWithClass(res, 'mx_EventListSummary');

        // find the <li> which wraps the read marker
        const rm = TestUtils.findRenderedDOMComponentWithClass(res, 'mx_RoomView_myReadMarker_container');

        expect(rm.previousSibling).toEqual(summary);
    });

    it('shows a ghost read-marker when the read-marker moves', function(done) {
        // fake the clock so that we can test the velocity animation.
        clock.install();
        clock.mockDate();

        const parentDiv = document.createElement('div');

        // first render with the RM in one place
        let mp = ReactDOM.render(
                <WrappedMessagePanel className="cls" events={events} readMarkerEventId={events[4].getId()}
                    readMarkerVisible={true}
                />, parentDiv);

        const tiles = TestUtils.scryRenderedComponentsWithType(
            mp, sdk.getComponent('rooms.EventTile'));
        const tileContainers = tiles.map(function(t) {
            return ReactDOM.findDOMNode(t).parentNode;
        });

        // find the <li> which wraps the read marker
        const rm = TestUtils.findRenderedDOMComponentWithClass(mp, 'mx_RoomView_myReadMarker_container');
        expect(rm.previousSibling).toEqual(tileContainers[4]);

        // now move the RM
        mp = ReactDOM.render(
                <WrappedMessagePanel className="cls" events={events} readMarkerEventId={events[6].getId()}
                    readMarkerVisible={true}
                />, parentDiv);

        // now there should be two RM containers
        const found = TestUtils.scryRenderedDOMComponentsWithClass(mp, 'mx_RoomView_myReadMarker_container');
        expect(found.length).toEqual(2);

        // the first should be the ghost
        expect(found[0].previousSibling).toEqual(tileContainers[4]);
        const hr = found[0].children[0];

        // the second should be the real thing
        expect(found[1].previousSibling).toEqual(tileContainers[6]);

        // advance the clock, and then let the browser run an animation frame,
        // to let the animation start
        clock.tick(1500);

        realSetTimeout(() => {
            // then advance it again to let it complete
            clock.tick(1000);
            realSetTimeout(() => {
                // the ghost should now have finished
                expect(hr.style.opacity).toEqual('0');
                done();
            }, 100);
        }, 100);
    });
});
