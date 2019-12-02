/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd
Copyright 2018, 2019 New Vector Ltd
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

import React, { createRef } from "react";
import createReactClass from "create-react-class";
import classNames from "classnames";
import sdk from "../../index";
import dis from "../../dispatcher";
import Unread from "../../Unread";
import * as RoomNotifs from "../../RoomNotifs";
import * as FormattingUtils from "../../utils/FormattingUtils";
import IndicatorScrollbar from "./IndicatorScrollbar";
import { Key, KeyCode } from "../../Keyboard";
import { Group } from "matrix-js-sdk";
import PropTypes from "prop-types";
import RoomTile from "../views/rooms/RoomTile";
import LazyRenderList from "../views/elements/LazyRenderList";
import { _t } from "../../languageHandler";

// turn this on for drop & drag console debugging galore
const debug = false;

const RoomSubList = createReactClass({
    displayName: "RoomSubList",

    debug: debug,

    propTypes: {
        list: PropTypes.arrayOf(PropTypes.object).isRequired,
        label: PropTypes.string.isRequired,
        tagName: PropTypes.string,
        addRoomLabel: PropTypes.string,

        order: PropTypes.string.isRequired,

        // passed through to RoomTile and used to highlight room with `!` regardless of notifications count
        isInvite: PropTypes.bool,

        startAsHidden: PropTypes.bool,
        showSpinner: PropTypes.bool, // true to show a spinner if 0 elements when expanded
        collapsed: PropTypes.bool.isRequired, // is LeftPanel collapsed?
        onHeaderClick: PropTypes.func,
        incomingCall: PropTypes.object,
        extraTiles: PropTypes.arrayOf(PropTypes.node), // extra elements added beneath tiles
        forceExpand: PropTypes.bool
    },

    getInitialState: function() {
        return {
            hidden: this.props.startAsHidden || false,
            // some values to get LazyRenderList starting
            scrollerHeight: 800,
            scrollTop: 0,
            // React 16's getDerivedStateFromProps(props, state) doesn't give the previous props so
            // we have to store the length of the list here so we can see if it's changed or not...
            listLength: null
        };
    },

    getDefaultProps: function() {
        return {
            onHeaderClick: function() {}, // NOP
            extraTiles: [],
            isInvite: false
        };
    },

    componentDidMount: function() {
        this._headerButton = createRef();
        this.dispatcherRef = dis.register(this.onAction);
    },

    statics: {
        getDerivedStateFromProps: function(props, state) {
            return {
                listLength: props.list.length,
                scrollTop:
                    props.list.length === state.listLength ? state.scrollTop : 0
            };
        }
    },

    componentWillUnmount: function() {
        dis.unregister(this.dispatcherRef);
    },

    // The header is collapsible if it is hidden or not stuck
    // The dataset elements are added in the RoomList _initAndPositionStickyHeaders method
    isCollapsibleOnClick: function() {
        const stuck = this.refs.header.dataset.stuck;
        if (
            !this.props.forceExpand &&
            (this.state.hidden || stuck === undefined || stuck === "none")
        ) {
            return true;
        } else {
            return false;
        }
    },

    onAction: function(payload) {
        // XXX: Previously RoomList would forceUpdate whenever on_room_read is dispatched,
        // but this is no longer true, so we must do it here (and can apply the small
        // optimisation of checking that we care about the room being read).
        //
        // Ultimately we need to transition to a state pushing flow where something
        // explicitly notifies the components concerned that the notif count for a room
        // has change (e.g. a Flux store).
        if (
            payload.action === "on_room_read" &&
            this.props.list.some(r => r.roomId === payload.roomId)
        ) {
            this.forceUpdate();
        }
    },

    onClick: function(ev) {
        if (this.isCollapsibleOnClick()) {
            // The header isCollapsible, so the click is to be interpreted as collapse and truncation logic
            const isHidden = !this.state.hidden;
            this.setState({ hidden: isHidden }, () => {
                this.props.onHeaderClick(isHidden);
            });
        } else {
            // The header is stuck, so the click is to be interpreted as a scroll to the header
            this.props.onHeaderClick(
                this.state.hidden,
                this.refs.header.dataset.originalPosition
            );
        }
    },

    onHeaderKeyDown: function(ev) {
        switch (ev.key) {
            case Key.TAB:
                // Prevent LeftPanel handling Tab if focus is on the sublist header itself
                ev.stopPropagation();
                break;
            case Key.ARROW_LEFT:
                // On ARROW_LEFT collapse the room sublist
                if (!this.state.hidden && !this.props.forceExpand) {
                    this.onClick();
                }
                ev.stopPropagation();
                break;
            case Key.ARROW_RIGHT: {
                ev.stopPropagation();
                if (this.state.hidden && !this.props.forceExpand) {
                    // sublist is collapsed, expand it
                    this.onClick();
                } else if (!this.props.forceExpand) {
                    // sublist is expanded, go to first room
                    const element =
                        this.refs.subList &&
                        this.refs.subList.querySelector(".mx_RoomTile");
                    if (element) {
                        element.focus();
                    }
                }
                break;
            }
        }
    },

    onKeyDown: function(ev) {
        switch (ev.key) {
            // On ARROW_LEFT go to the sublist header
            case Key.ARROW_LEFT:
                ev.stopPropagation();
                this._headerButton.current.focus();
                break;
            // Consume ARROW_RIGHT so it doesn't cause focus to get sent to composer
            case Key.ARROW_RIGHT:
                ev.stopPropagation();
        }
    },

    onRoomTileClick(roomId, ev) {
        dis.dispatch({
            action: "view_room",
            room_id: roomId,
            clear_search:
                ev &&
                (ev.keyCode === KeyCode.ENTER || ev.keyCode === KeyCode.SPACE)
        });
    },

    onRoomTileClickCall(roomId, ev) {
        dis.dispatch({
            action: "call_view",
            room_id: roomId,
            clear_search:
                ev &&
                (ev.keyCode === KeyCode.ENTER || ev.keyCode === KeyCode.SPACE)
        });
    },

    _updateSubListCount: function() {
        // Force an update by setting the state to the current state
        // Doing it this way rather than using forceUpdate(), so that the shouldComponentUpdate()
        // method is honoured
        this.setState(this.state);
    },

    // TODO
    // THIS WILL NEED TO BE CHANGED IN THE FUTURE FOR CALL PROPS TO BE TRUE ONLY ON AUDIO/VIDEO CALLS SUB_LIST
    makeRoomTile: function(room) {
        return (
            <RoomTile
                calls={this.props.tagName === "u.phone"}
                room={room}
                roomSubList={this}
                tagName={"CATS"}
                //tagName={this.props.tagName}
                key={room.roomId}
                collapsed={this.props.collapsed || false}
                unread={Unread.doesRoomHaveUnreadMessages(room)}
                highlight={
                    this.props.isInvite ||
                    RoomNotifs.getUnreadNotificationCount(room, "highlight") > 0
                }
                notificationCount={RoomNotifs.getUnreadNotificationCount(room)}
                isInvite={this.props.isInvite}
                refreshSubList={this._updateSubListCount}
                incomingCall={null}
                onClick={
                    this.props.tagName === "u.phone"
                        ? this.onRoomTileClickCall
                        : this.onRoomTileClick
                }
            />
        );
    },

    _onNotifBadgeClick: function(e) {
        // prevent the roomsublist collapsing
        e.preventDefault();
        e.stopPropagation();
        const room = this.props.list.find(room =>
            RoomNotifs.getRoomHasBadge(room)
        );
        if (room) {
            dis.dispatch({
                action: "view_room",
                room_id: room.roomId
            });
        }
    },

    _onInviteBadgeClick: function(e) {
        // prevent the roomsublist collapsing
        e.preventDefault();
        e.stopPropagation();
        // switch to first room in sortedList as that'll be the top of the list for the user
        if (this.props.list && this.props.list.length > 0) {
            dis.dispatch({
                action: "view_room",
                room_id: this.props.list[0].roomId
            });
        } else if (this.props.extraTiles && this.props.extraTiles.length > 0) {
            // Group Invites are different in that they are all extra tiles and not rooms
            // XXX: this is a horrible special case because Group Invite sublist is a hack
            if (
                this.props.extraTiles[0].props &&
                this.props.extraTiles[0].props.group instanceof Group
            ) {
                dis.dispatch({
                    action: "view_group",
                    group_id: this.props.extraTiles[0].props.group.groupId
                });
            }
        }
    },

    onAddRoom: function(e) {
        e.stopPropagation();
        if (this.props.onAddRoom) this.props.onAddRoom();
    },

    _getHeaderJsx: function(isCollapsed) {
        const AccessibleButton = sdk.getComponent("elements.AccessibleButton");
        const AccessibleTooltipButton = sdk.getComponent(
            "elements.AccessibleTooltipButton"
        );
        const subListNotifications = !this.props.isInvite
            ? RoomNotifs.aggregateNotificationCount(this.props.list)
            : { count: 0, highlight: true };
        const subListNotifCount = subListNotifications.count;
        const subListNotifHighlight = subListNotifications.highlight;

        let badge;
        if (!this.props.collapsed) {
            const badgeClasses = classNames({
                mx_RoomSubList_badge: true,
                mx_RoomSubList_badgeHighlight: subListNotifHighlight
            });
            // Wrap the contents in a div and apply styles to the child div so that the browser default outline works
            if (subListNotifCount > 0) {
                badge = (
                    <AccessibleButton
                        className={badgeClasses}
                        onClick={this._onNotifBadgeClick}
                        aria-label={_t("Jump to first unread room.")}
                    >
                        <div>
                            {FormattingUtils.formatCount(subListNotifCount)}
                        </div>
                    </AccessibleButton>
                );
            } else if (this.props.isInvite && this.props.list.length) {
                // no notifications but highlight anyway because this is an invite badge
                badge = (
                    <AccessibleButton
                        className={badgeClasses}
                        onClick={this._onInviteBadgeClick}
                        aria-label={_t("Jump to first invite.")}
                    >
                        <div>{this.props.list.length}</div>
                    </AccessibleButton>
                );
            }
        }

        // When collapsed, allow a long hover on the header to show user
        // the full tag name and room count
        let title;
        if (this.props.collapsed) {
            title = this.props.label;
        }

        let incomingCall;
        if (this.props.incomingCall) {
            // We can assume that if we have an incoming call then it is for this list
            const IncomingCallBox = sdk.getComponent("voip.IncomingCallBox");
            incomingCall = (
                <IncomingCallBox
                    className="mx_RoomSubList_incomingCall"
                    incomingCall={this.props.incomingCall}
                />
            );
        }

        let addRoomButton;
        if (this.props.onAddRoom) {
            addRoomButton = (
                <AccessibleTooltipButton
                    onClick={this.onAddRoom}
                    className="mx_RoomSubList_addRoom"
                    title={this.props.addRoomLabel || _t("Add room")}
                />
            );
        }

        const len = this.props.list.length + this.props.extraTiles.length;
        let chevron;
        if (len) {
            const chevronClasses = classNames({
                mx_RoomSubList_chevron: true,
                mx_RoomSubList_chevronRight: isCollapsed,
                mx_RoomSubList_chevronDown: !isCollapsed
            });
            chevron = <div className={chevronClasses} />;
        }

        return (
            <div
                className="mx_RoomSubList_labelContainer"
                title={title}
                ref="header"
                onKeyDown={this.onHeaderKeyDown}
            >
                <AccessibleButton
                    onClick={this.onClick}
                    className="mx_RoomSubList_label"
                    tabIndex={0}
                    aria-expanded={!isCollapsed}
                    inputRef={this._headerButton}
                    role="treeitem"
                    aria-level="1"
                >
                    {chevron}
                    <span>{this.props.label}</span>
                    {incomingCall}
                </AccessibleButton>
                {badge}
                {addRoomButton}
            </div>
        );
    },

    checkOverflow: function() {
        if (this.refs.scroller) {
            this.refs.scroller.checkOverflow();
        }
    },

    setHeight: function(height) {
        if (this.refs.subList) {
            this.refs.subList.style.height = `${height}px`;
        }
        this._updateLazyRenderHeight(height);
    },

    _updateLazyRenderHeight: function(height) {
        this.setState({ scrollerHeight: height });
    },

    _onScroll: function() {
        this.setState({ scrollTop: this.refs.scroller.getScrollTop() });
    },

    _canUseLazyListRendering() {
        // for now disable lazy rendering as they are already rendered tiles
        // not rooms like props.list we pass to LazyRenderList
        return !this.props.extraTiles || !this.props.extraTiles.length;
    },

    render: function() {
        const len = this.props.list.length + this.props.extraTiles.length;
        const isCollapsed = this.state.hidden && !this.props.forceExpand;

        const subListClasses = classNames({
            mx_RoomSubList: true,
            mx_RoomSubList_hidden: len && isCollapsed,
            mx_RoomSubList_nonEmpty: len && !isCollapsed
        });

        let content;
        if (len) {
            if (isCollapsed) {
                // no body
            } else if (this._canUseLazyListRendering()) {
                content = (
                    <IndicatorScrollbar
                        ref="scroller"
                        className="mx_RoomSubList_scroll"
                        onScroll={this._onScroll}
                    >
                        <LazyRenderList
                            scrollTop={this.state.scrollTop}
                            height={this.state.scrollerHeight}
                            renderItem={this.makeRoomTile}
                            itemHeight={34}
                            items={this.props.list}
                        />
                    </IndicatorScrollbar>
                );
            } else {
                const roomTiles = this.props.list.map(r => {
                    this.makeRoomTile(r);
                });
                const tiles = roomTiles.concat(this.props.extraTiles);
                content = (
                    <IndicatorScrollbar
                        ref="scroller"
                        className="mx_RoomSubList_scroll"
                        onScroll={this._onScroll}
                    >
                        {tiles}
                    </IndicatorScrollbar>
                );
            }
        } else {
            if (this.props.showSpinner && !isCollapsed) {
                const Loader = sdk.getComponent("elements.Spinner");
                content = <Loader />;
            }
        }

        return (
            <div
                ref="subList"
                className={subListClasses}
                role="group"
                aria-label={this.props.label}
                onKeyDown={this.onKeyDown}
            >
                {this._getHeaderJsx(isCollapsed)}
                {content}
            </div>
        );
    }
});

module.exports = RoomSubList;
