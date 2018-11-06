/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd
Copyright 2018 New Vector Ltd

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
import classNames from 'classnames';
import sdk from '../../index';
import { Droppable } from 'react-beautiful-dnd';
import { _t } from '../../languageHandler';
import dis from '../../dispatcher';
import Unread from '../../Unread';
import * as RoomNotifs from '../../RoomNotifs';
import * as FormattingUtils from '../../utils/FormattingUtils';
import { KeyCode } from '../../Keyboard';
import { Group } from 'matrix-js-sdk';
import PropTypes from 'prop-types';


// turn this on for drop & drag console debugging galore
const debug = false;

const TRUNCATE_AT = 10;

const RoomSubList = React.createClass({
    displayName: 'RoomSubList',

    debug: debug,

    propTypes: {
        list: PropTypes.arrayOf(PropTypes.object).isRequired,
        label: PropTypes.string.isRequired,
        tagName: PropTypes.string,
        editable: PropTypes.bool,

        order: PropTypes.string.isRequired,

        // passed through to RoomTile and used to highlight room with `!` regardless of notifications count
        isInvite: PropTypes.bool,

        startAsHidden: PropTypes.bool,
        showSpinner: PropTypes.bool, // true to show a spinner if 0 elements when expanded
        collapsed: PropTypes.bool.isRequired, // is LeftPanel collapsed?
        onHeaderClick: PropTypes.func,
        alwaysShowHeader: PropTypes.bool,
        incomingCall: PropTypes.object,
        onShowMoreRooms: PropTypes.func,
        searchFilter: PropTypes.string,
        emptyContent: PropTypes.node, // content shown if the list is empty
        headerItems: PropTypes.node, // content shown in the sublist header
        extraTiles: PropTypes.arrayOf(PropTypes.node), // extra elements added beneath tiles
        showEmpty: PropTypes.bool,
    },

    getInitialState: function() {
        return {
            hidden: this.props.startAsHidden || false,
            truncateAt: TRUNCATE_AT,
            sortedList: [],
        };
    },

    getDefaultProps: function() {
        return {
            onHeaderClick: function() {
            }, // NOP
            onShowMoreRooms: function() {
            }, // NOP
            extraTiles: [],
            isInvite: false,
            showEmpty: true,
        };
    },

    componentWillMount: function() {
        this.setState({
            sortedList: this.applySearchFilter(this.props.list, this.props.searchFilter),
        });
        this.dispatcherRef = dis.register(this.onAction);
    },

    componentWillUnmount: function() {
        dis.unregister(this.dispatcherRef);
    },

    componentWillReceiveProps: function(newProps) {
        // order the room list appropriately before we re-render
        //if (debug) console.log("received new props, list = " + newProps.list);
        this.setState({
            sortedList: this.applySearchFilter(newProps.list, newProps.searchFilter),
        });
    },

    applySearchFilter: function(list, filter) {
        if (filter === "") return list;
        const lcFilter = filter.toLowerCase();
        // case insensitive if room name includes filter,
        // or if starts with `#` and one of room's aliases starts with filter
        return list.filter((room) => (room.name && room.name.toLowerCase().includes(lcFilter)) ||
            (filter[0] === '#' && room.getAliases().some((alias) => alias.toLowerCase().startsWith(lcFilter))));
    },

    // The header is collapsable if it is hidden or not stuck
    // The dataset elements are added in the RoomList _initAndPositionStickyHeaders method
    isCollapsableOnClick: function() {
        const stuck = this.refs.header.dataset.stuck;
        if (this.state.hidden || stuck === undefined || stuck === "none") {
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
        if (payload.action === 'on_room_read' &&
            this.props.list.some((r) => r.roomId === payload.roomId)
        ) {
            this.forceUpdate();
        }
    },

    onClick: function(ev) {
        if (this.isCollapsableOnClick()) {
            // The header isCollapsable, so the click is to be interpreted as collapse and truncation logic
            const isHidden = !this.state.hidden;
            this.setState({hidden: isHidden});

            if (isHidden) {
                // as good a way as any to reset the truncate state
                this.setState({truncateAt: TRUNCATE_AT});
            }

            this.props.onShowMoreRooms();
            this.props.onHeaderClick(isHidden);
        } else {
            // The header is stuck, so the click is to be interpreted as a scroll to the header
            this.props.onHeaderClick(this.state.hidden, this.refs.header.dataset.originalPosition);
        }
    },

    onRoomTileClick(roomId, ev) {
        dis.dispatch({
            action: 'view_room',
            room_id: roomId,
            clear_search: (ev && (ev.keyCode === KeyCode.ENTER || ev.keyCode === KeyCode.SPACE)),
        });
    },

    _shouldShowNotifBadge: function(roomNotifState) {
        const showBadgeInStates = [RoomNotifs.ALL_MESSAGES, RoomNotifs.ALL_MESSAGES_LOUD];
        return showBadgeInStates.indexOf(roomNotifState) > -1;
    },

    _shouldShowMentionBadge: function(roomNotifState) {
        return roomNotifState !== RoomNotifs.MUTE;
    },

    /**
     * Total up all the notification counts from the rooms
     *
     * @param {Number} truncateAt If supplied will only total notifications for rooms outside the truncation number
     * @returns {Array} The array takes the form [total, highlight] where highlight is a bool
     */
    roomNotificationCount: function(truncateAt) {
        const self = this;

        if (this.props.isInvite) {
            return [0, true];
        }

        return this.props.list.reduce(function(result, room, index) {
            if (truncateAt === undefined || index >= truncateAt) {
                const roomNotifState = RoomNotifs.getRoomNotifsState(room.roomId);
                const highlight = room.getUnreadNotificationCount('highlight') > 0;
                const notificationCount = room.getUnreadNotificationCount();

                const notifBadges = notificationCount > 0 && self._shouldShowNotifBadge(roomNotifState);
                const mentionBadges = highlight && self._shouldShowMentionBadge(roomNotifState);
                const badges = notifBadges || mentionBadges;

                if (badges) {
                    result[0] += notificationCount;
                    if (highlight) {
                        result[1] = true;
                    }
                }
            }
            return result;
        }, [0, false]);
    },

    _updateSubListCount: function() {
        // Force an update by setting the state to the current state
        // Doing it this way rather than using forceUpdate(), so that the shouldComponentUpdate()
        // method is honoured
        this.setState(this.state);
    },

    makeRoomTiles: function() {
        const DNDRoomTile = sdk.getComponent("rooms.DNDRoomTile");
        const RoomTile = sdk.getComponent("rooms.RoomTile");
        return this.state.sortedList.map((room, index) => {
            // XXX: is it evil to pass in this as a prop to RoomTile? Yes.

            // We should only use <DNDRoomTile /> when editable
            const RoomTileComponent = this.props.editable ? DNDRoomTile : RoomTile;
            return <RoomTileComponent
                index={index} // For DND
                room={room}
                roomSubList={this}
                tagName={this.props.tagName}
                key={room.roomId}
                collapsed={this.props.collapsed || false}
                unread={Unread.doesRoomHaveUnreadMessages(room)}
                highlight={room.getUnreadNotificationCount('highlight') > 0 || this.props.isInvite}
                isInvite={this.props.isInvite}
                refreshSubList={this._updateSubListCount}
                incomingCall={null}
                onClick={this.onRoomTileClick}
            />;
        });
    },

    _onNotifBadgeClick: function(e) {
        // prevent the roomsublist collapsing
        e.preventDefault();
        e.stopPropagation();
        // find first room which has notifications and switch to it
        for (const room of this.state.sortedList) {
            const roomNotifState = RoomNotifs.getRoomNotifsState(room.roomId);
            const highlight = room.getUnreadNotificationCount('highlight') > 0;
            const notificationCount = room.getUnreadNotificationCount();

            const notifBadges = notificationCount > 0 && this._shouldShowNotifBadge(roomNotifState);
            const mentionBadges = highlight && this._shouldShowMentionBadge(roomNotifState);

            if (notifBadges || mentionBadges) {
                dis.dispatch({
                    action: 'view_room',
                    room_id: room.roomId,
                });
                return;
            }
        }
    },

    _onInviteBadgeClick: function(e) {
        // prevent the roomsublist collapsing
        e.preventDefault();
        e.stopPropagation();
        // switch to first room in sortedList as that'll be the top of the list for the user
        if (this.state.sortedList && this.state.sortedList.length > 0) {
            dis.dispatch({
                action: 'view_room',
                room_id: this.state.sortedList[0].roomId,
            });
        } else if (this.props.extraTiles && this.props.extraTiles.length > 0) {
            // Group Invites are different in that they are all extra tiles and not rooms
            // XXX: this is a horrible special case because Group Invite sublist is a hack
            if (this.props.extraTiles[0].props && this.props.extraTiles[0].props.group instanceof Group) {
                dis.dispatch({
                    action: 'view_group',
                    group_id: this.props.extraTiles[0].props.group.groupId,
                });
            }
        }
    },

    _getHeaderJsx: function() {
        const subListNotifications = this.roomNotificationCount();
        const subListNotifCount = subListNotifications[0];
        const subListNotifHighlight = subListNotifications[1];

        const totalTiles = this.props.list.length + (this.props.extraTiles || []).length;
        const roomCount = totalTiles > 0 ? totalTiles : '';

        const chevronClasses = classNames({
            'mx_RoomSubList_chevron': true,
            'mx_RoomSubList_chevronRight': this.state.hidden,
            'mx_RoomSubList_chevronDown': !this.state.hidden,
        });

        const badgeClasses = classNames({
            'mx_RoomSubList_badge': true,
            'mx_RoomSubList_badgeHighlight': subListNotifHighlight,
        });

        let badge;
        if (subListNotifCount > 0) {
            badge = <div className={badgeClasses} onClick={this._onNotifBadgeClick}>
                { FormattingUtils.formatCount(subListNotifCount) }
            </div>;
        } else if (this.props.isInvite) {
            // no notifications but highlight anyway because this is an invite badge
            badge = <div className={badgeClasses} onClick={this._onInviteBadgeClick}>!</div>;
        }

        // When collapsed, allow a long hover on the header to show user
        // the full tag name and room count
        let title;
        if (this.props.collapsed) {
            title = this.props.label;
            if (roomCount !== '') {
                title += " [" + roomCount + "]";
            }
        }

        let incomingCall;
        if (this.props.incomingCall) {
            const self = this;
            // Check if the incoming call is for this section
            const incomingCallRoom = this.props.list.filter(function(room) {
                return self.props.incomingCall.roomId === room.roomId;
            });

            if (incomingCallRoom.length === 1) {
                const IncomingCallBox = sdk.getComponent("voip.IncomingCallBox");
                incomingCall =
                    <IncomingCallBox className="mx_RoomSubList_incomingCall" incomingCall={this.props.incomingCall} />;
            }
        }

        const tabindex = this.props.searchFilter === "" ? "0" : "-1";

        const AccessibleButton = sdk.getComponent('elements.AccessibleButton');
        return (
            <div className="mx_RoomSubList_labelContainer" title={title} ref="header">
                <AccessibleButton onClick={this.onClick} className="mx_RoomSubList_label" tabIndex={tabindex}>
                    {this.props.collapsed ? '' : this.props.label}
                    <div className="mx_RoomSubList_roomCount">{roomCount}</div>
                    <div className={chevronClasses} />
                    {badge}
                    {incomingCall}
                </AccessibleButton>
            </div>
        );
    },

    _createOverflowTile: function(overflowCount, totalCount) {
        let content = <div className="mx_RoomSubList_chevronDown" />;

        const overflowNotifications = this.roomNotificationCount(TRUNCATE_AT);
        const overflowNotifCount = overflowNotifications[0];
        const overflowNotifHighlight = overflowNotifications[1];
        if (overflowNotifCount && !this.props.collapsed) {
            content = FormattingUtils.formatCount(overflowNotifCount);
        }

        const badgeClasses = classNames({
            'mx_RoomSubList_moreBadge': true,
            'mx_RoomSubList_moreBadgeNotify': overflowNotifCount && !this.props.collapsed,
            'mx_RoomSubList_moreBadgeHighlight': overflowNotifHighlight && !this.props.collapsed,
        });

        const AccessibleButton = sdk.getComponent('elements.AccessibleButton');
        return (
            <AccessibleButton className="mx_RoomSubList_ellipsis" onClick={this._showFullMemberList}>
                <div className="mx_RoomSubList_line" />
                <div className="mx_RoomSubList_more">{_t("more")}</div>
                <div className={badgeClasses}>{content}</div>
            </AccessibleButton>
        );
    },

    _showFullMemberList: function() {
        this.setState({
            truncateAt: -1,
        });

        this.props.onShowMoreRooms();
        this.props.onHeaderClick(false);
    },

    render: function() {
        const TruncatedList = sdk.getComponent('elements.TruncatedList');

        let content;

        if (this.props.showEmpty) {
            // this is new behaviour with still controversial UX in that in hiding RoomSubLists the drop zones for DnD
            // are also gone so when filtering users can't DnD rooms to some tags but is a lot cleaner otherwise.
            if (this.state.sortedList.length === 0 && !this.props.searchFilter && this.props.extraTiles.length === 0) {
                content = this.props.emptyContent;
            } else {
                content = this.makeRoomTiles();
                content.push(...this.props.extraTiles);
            }
        } else {
            if (this.state.sortedList.length === 0 && this.props.extraTiles.length === 0) {
                // if no search filter is applied and there is a placeholder defined then show it, otherwise show nothing
                if (!this.props.searchFilter && this.props.emptyContent) {
                    content = this.props.emptyContent;
                } else {
                    // don't show an empty sublist
                    return null;
                }
            } else {
                content = this.makeRoomTiles();
                content.push(...this.props.extraTiles);
            }
        }

        if (this.state.sortedList.length > 0 || this.props.extraTiles.length > 0 || this.props.editable) {
            let subList;
            const classes = "mx_RoomSubList";

            if (!this.state.hidden) {
                subList = <TruncatedList className={classes} truncateAt={this.state.truncateAt}
                                         createOverflowElement={this._createOverflowTile}>
                    {content}
                </TruncatedList>;
            } else {
                subList = <TruncatedList className={classes}>
                </TruncatedList>;
            }

            const subListContent = <div>
                {this._getHeaderJsx()}
                {subList}
            </div>;

            return this.props.editable ?
                <Droppable
                    droppableId={"room-sub-list-droppable_" + this.props.tagName}
                    type="draggable-RoomTile"
                >
                    {(provided, snapshot) => (
                        <div ref={provided.innerRef}>
                            {subListContent}
                        </div>
                    )}
                </Droppable> : subListContent;
        } else {
            const Loader = sdk.getComponent("elements.Spinner");
            if (this.props.showSpinner) {
                content = <Loader />;
            }

            return (
                <div className="mx_RoomSubList">
                    {this.props.alwaysShowHeader ? this._getHeaderJsx() : undefined}
                    { this.state.hidden ? undefined : content }
                </div>
            );
        }
    },
});

module.exports = RoomSubList;
