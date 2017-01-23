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

/*
 * State vars:
 * 'can': {
 *   kick: boolean,
 *   ban: boolean,
 *   mute: boolean,
 *   modifyLevel: boolean
 * },
 * 'muted': boolean,
 * 'isTargetMod': boolean
 */
var React = require('react');
var classNames = require('classnames');
var dis = require("../../../dispatcher");
var Modal = require("../../../Modal");
var sdk = require('../../../index');
var createRoom = require('../../../createRoom');
var DMRoomMap = require('../../../utils/DMRoomMap');
var Unread = require('../../../Unread');
var Receipt = require('../../../utils/Receipt');
var WithMatrixClient = require('../../../wrappers/WithMatrixClient');

module.exports = WithMatrixClient(React.createClass({
    displayName: 'MemberInfo',

    propTypes: {
        matrixClient: React.PropTypes.object.isRequired,
        member: React.PropTypes.object.isRequired,
        onFinished: React.PropTypes.func,
    },

    getDefaultProps: function() {
        return {
            onFinished: function() {}
        };
    },

    getInitialState: function() {
        return {
            can: {
                kick: false,
                ban: false,
                mute: false,
                modifyLevel: false
            },
            muted: false,
            isTargetMod: false,
            updating: 0,
            devicesLoading: true,
            devices: null,
        };
    },

    componentWillMount: function() {
        this._cancelDeviceList = null;

        // only display the devices list if our client supports E2E
        this._enableDevices = this.props.matrixClient.isCryptoEnabled();

        const cli = this.props.matrixClient;
        cli.on("deviceVerificationChanged", this.onDeviceVerificationChanged);
        cli.on("Room", this.onRoom);
        cli.on("deleteRoom", this.onDeleteRoom);
        cli.on("Room.timeline", this.onRoomTimeline);
        cli.on("Room.name", this.onRoomName);
        cli.on("Room.receipt", this.onRoomReceipt);
        cli.on("RoomState.events", this.onRoomStateEvents);
        cli.on("RoomMember.name", this.onRoomMemberName);
        cli.on("accountData", this.onAccountData);
    },

    componentDidMount: function() {
        this._updateStateForNewMember(this.props.member);
    },

    componentWillReceiveProps: function(newProps) {
        if (this.props.member.userId != newProps.member.userId) {
            this._updateStateForNewMember(newProps.member);
        }
    },

    componentWillUnmount: function() {
        var client = this.props.matrixClient;
        if (client) {
            client.removeListener("deviceVerificationChanged", this.onDeviceVerificationChanged);
            client.removeListener("Room", this.onRoom);
            client.removeListener("deleteRoom", this.onDeleteRoom);
            client.removeListener("Room.timeline", this.onRoomTimeline);
            client.removeListener("Room.name", this.onRoomName);
            client.removeListener("Room.receipt", this.onRoomReceipt);
            client.removeListener("RoomState.events", this.onRoomStateEvents);
            client.removeListener("RoomMember.name", this.onRoomMemberName);
            client.removeListener("accountData", this.onAccountData);
        }
        if (this._cancelDeviceList) {
            this._cancelDeviceList();
        }
    },

    _disambiguateDevices: function(devices) {
        var names = Object.create(null);
        for (var i = 0; i < devices.length; i++) {
            var name = devices[i].getDisplayName();
            var indexList = names[name] || [];
            indexList.push(i);
            names[name] = indexList;
        }
        for (name in names) {
            if (names[name].length > 1) {
                names[name].forEach((j)=>{
                    devices[j].ambiguous = true;
                });
            }
        }
    },

    onDeviceVerificationChanged: function(userId, device) {
        if (!this._enableDevices) {
            return;
        }

        if (userId == this.props.member.userId) {
            // no need to re-download the whole thing; just update our copy of
            // the list.
            var devices = this.props.matrixClient.getStoredDevicesForUser(userId);
            this.setState({devices: devices});
        }
    },

    onRoom: function(room) {
        this.forceUpdate();
    },

    onDeleteRoom: function(roomId) {
        this.forceUpdate();
    },

    onRoomTimeline: function(ev, room, toStartOfTimeline) {
        if (toStartOfTimeline) return;
        this.forceUpdate();
    },

    onRoomName: function(room) {
        this.forceUpdate();
    },

    onRoomReceipt: function(receiptEvent, room) {
        // because if we read a notification, it will affect notification count
        // only bother updating if there's a receipt from us
        if (Receipt.findReadReceiptFromUserId(receiptEvent, this.props.matrixClient.credentials.userId)) {
            this.forceUpdate();
        }
    },

    onRoomStateEvents: function(ev, state) {
        this.forceUpdate();
    },

    onRoomMemberName: function(ev, member) {
        this.forceUpdate();
    },

    onAccountData: function(ev) {
        if (ev.getType() == 'm.direct') {
            this.forceUpdate();
        }
    },

    _updateStateForNewMember: function(member) {
        var newState = this._calculateOpsPermissions(member);
        newState.devicesLoading = true;
        newState.devices = null;
        this.setState(newState);

        if (this._cancelDeviceList) {
            this._cancelDeviceList();
            this._cancelDeviceList = null;
        }

        this._downloadDeviceList(member);
    },

    _downloadDeviceList: function(member) {
        if (!this._enableDevices) {
            return;
        }

        var cancelled = false;
        this._cancelDeviceList = function() { cancelled = true; };

        var client = this.props.matrixClient;
        var self = this;
        client.downloadKeys([member.userId], true).finally(function() {
            self._cancelDeviceList = null;
        }).done(function() {
            if (cancelled) {
                // we got cancelled - presumably a different user now
                return;
            }
            var devices = client.getStoredDevicesForUser(member.userId);
            self._disambiguateDevices(devices);
            self.setState({devicesLoading: false, devices: devices});
        }, function(err) {
            console.log("Error downloading devices", err);
            self.setState({devicesLoading: false});
        });
    },

    onKick: function() {
        var ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
        var roomId = this.props.member.roomId;
        var target = this.props.member.userId;
        this.setState({ updating: this.state.updating + 1 });
        this.props.matrixClient.kick(roomId, target).then(function() {
                // NO-OP; rely on the m.room.member event coming down else we could
                // get out of sync if we force setState here!
                console.log("Kick success");
            }, function(err) {
                Modal.createDialog(ErrorDialog, {
                    title: "Kick error",
                    description: err.message
                });
            }
        ).finally(()=>{
            this.setState({ updating: this.state.updating - 1 });
        });
        this.props.onFinished();
    },

    onBan: function() {
        var ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
        var roomId = this.props.member.roomId;
        var target = this.props.member.userId;
        this.setState({ updating: this.state.updating + 1 });
        this.props.matrixClient.ban(roomId, target).then(
            function() {
                // NO-OP; rely on the m.room.member event coming down else we could
                // get out of sync if we force setState here!
                console.log("Ban success");
            }, function(err) {
                Modal.createDialog(ErrorDialog, {
                    title: "Ban error",
                    description: err.message
                });
            }
        ).finally(()=>{
            this.setState({ updating: this.state.updating - 1 });
        });
        this.props.onFinished();
    },

    onMuteToggle: function() {
        var ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
        var roomId = this.props.member.roomId;
        var target = this.props.member.userId;
        var room = this.props.matrixClient.getRoom(roomId);
        if (!room) {
            this.props.onFinished();
            return;
        }
        var powerLevelEvent = room.currentState.getStateEvents(
            "m.room.power_levels", ""
        );
        if (!powerLevelEvent) {
            this.props.onFinished();
            return;
        }
        var isMuted = this.state.muted;
        var powerLevels = powerLevelEvent.getContent();
        var levelToSend = (
            (powerLevels.events ? powerLevels.events["m.room.message"] : null) ||
            powerLevels.events_default
        );
        var level;
        if (isMuted) { // unmute
            level = levelToSend;
        }
        else { // mute
            level = levelToSend - 1;
        }
        level = parseInt(level);

        if (level !== NaN) {
            this.setState({ updating: this.state.updating + 1 });
            this.props.matrixClient.setPowerLevel(roomId, target, level, powerLevelEvent).then(
                function() {
                    // NO-OP; rely on the m.room.member event coming down else we could
                    // get out of sync if we force setState here!
                    console.log("Mute toggle success");
                }, function(err) {
                    Modal.createDialog(ErrorDialog, {
                        title: "Mute error",
                        description: err.message
                    });
                }
            ).finally(()=>{
                this.setState({ updating: this.state.updating - 1 });
            });
        }
        this.props.onFinished();
    },

    onModToggle: function() {
        var ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
        var roomId = this.props.member.roomId;
        var target = this.props.member.userId;
        var room = this.props.matrixClient.getRoom(roomId);
        if (!room) {
            this.props.onFinished();
            return;
        }
        var powerLevelEvent = room.currentState.getStateEvents(
            "m.room.power_levels", ""
        );
        if (!powerLevelEvent) {
            this.props.onFinished();
            return;
        }
        var me = room.getMember(this.props.matrixClient.credentials.userId);
        if (!me) {
            this.props.onFinished();
            return;
        }
        var defaultLevel = powerLevelEvent.getContent().users_default;
        var modLevel = me.powerLevel - 1;
        if (modLevel > 50 && defaultLevel < 50) modLevel = 50; // try to stick with the vector level defaults
        // toggle the level
        var newLevel = this.state.isTargetMod ? defaultLevel : modLevel;
        this.setState({ updating: this.state.updating + 1 });
        this.props.matrixClient.setPowerLevel(roomId, target, parseInt(newLevel), powerLevelEvent).then(
            function() {
                // NO-OP; rely on the m.room.member event coming down else we could
                // get out of sync if we force setState here!
                console.log("Mod toggle success");
            }, function(err) {
                if (err.errcode == 'M_GUEST_ACCESS_FORBIDDEN') {
                    var NeedToRegisterDialog = sdk.getComponent("dialogs.NeedToRegisterDialog");
                    Modal.createDialog(NeedToRegisterDialog, {
                        title: "Please Register",
                        description: "This action cannot be performed by a guest user. Please register to be able to do this."
                    });
                } else {
                    Modal.createDialog(ErrorDialog, {
                        title: "Moderator toggle error",
                        description: err.message
                    });
                }
            }
        ).finally(()=>{
            this.setState({ updating: this.state.updating - 1 });
        });
        this.props.onFinished();
    },

    _applyPowerChange: function(roomId, target, powerLevel, powerLevelEvent) {
        this.setState({ updating: this.state.updating + 1 });
        this.props.matrixClient.setPowerLevel(roomId, target, parseInt(powerLevel), powerLevelEvent).then(
            function() {
                // NO-OP; rely on the m.room.member event coming down else we could
                // get out of sync if we force setState here!
                console.log("Power change success");
            }, function(err) {
                const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                Modal.createDialog(ErrorDialog, {
                    title: "Failure to change power level",
                    description: err.message
                });
            }
        ).finally(()=>{
            this.setState({ updating: this.state.updating - 1 });
        }).done();
        this.props.onFinished();
    },

    onPowerChange: function(powerLevel) {
        var ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
        var roomId = this.props.member.roomId;
        var target = this.props.member.userId;
        var room = this.props.matrixClient.getRoom(roomId);
        var self = this;
        if (!room) {
            this.props.onFinished();
            return;
        }
        var powerLevelEvent = room.currentState.getStateEvents(
            "m.room.power_levels", ""
        );
        if (!powerLevelEvent) {
            this.props.onFinished();
            return;
        }
        if (powerLevelEvent.getContent().users) {
            var myPower = powerLevelEvent.getContent().users[this.props.matrixClient.credentials.userId];
            if (parseInt(myPower) === parseInt(powerLevel)) {
                var QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");
                Modal.createDialog(QuestionDialog, {
                    title: "Warning",
                    description:
                        <div>
                            You will not be able to undo this change as you are promoting the user to have the same power level as yourself.<br/>
                            Are you sure?
                        </div>,
                    button: "Continue",
                    onFinished: function(confirmed) {
                        if (confirmed) {
                            self._applyPowerChange(roomId, target, powerLevel, powerLevelEvent);
                        }
                        else {
                            self.props.onFinished();
                        }
                    },
                });
            }
            else {
                this._applyPowerChange(roomId, target, powerLevel, powerLevelEvent);
            }
        }
        else {
            this._applyPowerChange(roomId, target, powerLevel, powerLevelEvent);
        }
    },

    onNewDMClick: function() {
        this.setState({ updating: this.state.updating + 1 });
        createRoom({dmUserId: this.props.member.userId}).finally(() => {
            this.props.onFinished();
            this.setState({ updating: this.state.updating - 1 });
        }).done();
    },

    onLeaveClick: function() {
        dis.dispatch({
            action: 'leave_room',
            room_id: this.props.member.roomId,
        });
        this.props.onFinished();
    },

    _calculateOpsPermissions: function(member) {
        var defaultPerms = {
            can: {},
            muted: false,
            modifyLevel: false
        };
        var room = this.props.matrixClient.getRoom(member.roomId);
        if (!room) {
            return defaultPerms;
        }
        var powerLevels = room.currentState.getStateEvents(
            "m.room.power_levels", ""
        );
        if (!powerLevels) {
            return defaultPerms;
        }
        var me = room.getMember(this.props.matrixClient.credentials.userId);
        if (!me) {
            return defaultPerms;
        }
        var them = member;
        return {
            can: this._calculateCanPermissions(
                me, them, powerLevels.getContent()
            ),
            muted: this._isMuted(them, powerLevels.getContent()),
            isTargetMod: them.powerLevel > powerLevels.getContent().users_default
        };
    },

    _calculateCanPermissions: function(me, them, powerLevels) {
        var can = {
            kick: false,
            ban: false,
            mute: false,
            modifyLevel: false
        };
        var canAffectUser = them.powerLevel < me.powerLevel;
        if (!canAffectUser) {
            //console.log("Cannot affect user: %s >= %s", them.powerLevel, me.powerLevel);
            return can;
        }
        var editPowerLevel = (
            (powerLevels.events ? powerLevels.events["m.room.power_levels"] : null) ||
            powerLevels.state_default
        );
        var levelToSend = (
            (powerLevels.events ? powerLevels.events["m.room.message"] : null) ||
            powerLevels.events_default
        );

        can.kick = me.powerLevel >= powerLevels.kick;
        can.ban = me.powerLevel >= powerLevels.ban;
        can.mute = me.powerLevel >= editPowerLevel;
        can.toggleMod = me.powerLevel > them.powerLevel && them.powerLevel >= levelToSend;
        can.modifyLevel = me.powerLevel > them.powerLevel;
        return can;
    },

    _isMuted: function(member, powerLevelContent) {
        if (!powerLevelContent || !member) {
            return false;
        }
        var levelToSend = (
            (powerLevelContent.events ? powerLevelContent.events["m.room.message"] : null) ||
            powerLevelContent.events_default
        );
        return member.powerLevel < levelToSend;
    },

    onCancel: function(e) {
        dis.dispatch({
            action: "view_user",
            member: null
        });
    },

    onMemberAvatarClick: function() {
        var avatarUrl = this.props.member.user ? this.props.member.user.avatarUrl : this.props.member.events.member.getContent().avatar_url;
        if(!avatarUrl) return;

        var httpUrl = this.props.matrixClient.mxcUrlToHttp(avatarUrl);
        var ImageView = sdk.getComponent("elements.ImageView");
        var params = {
            src: httpUrl,
            name: this.props.member.name
        };

        Modal.createDialog(ImageView, params, "mx_Dialog_lightbox");
    },

    _renderDevices: function() {
        if (!this._enableDevices) {
            return null;
        }

        var devices = this.state.devices;
        var MemberDeviceInfo = sdk.getComponent('rooms.MemberDeviceInfo');
        var Spinner = sdk.getComponent("elements.Spinner");

        var devComponents;
        if (this.state.devicesLoading) {
            // still loading
            devComponents = <Spinner />;
        } else if (devices === null) {
            devComponents = "Unable to load device list";
        } else if (devices.length === 0) {
            devComponents = "No registered devices";
        } else {
            devComponents = [];
            for (var i = 0; i < devices.length; i++) {
                devComponents.push(<MemberDeviceInfo key={i}
                                       userId={this.props.member.userId}
                                       device={devices[i]}/>);
            }
        }

        return (
            <div>
                <h3>Devices</h3>
                <div className="mx_MemberInfo_devices">
                    {devComponents}
                </div>
            </div>
        );
    },

    render: function() {
        var startChat, kickButton, banButton, muteButton, giveModButton, spinner;
        if (this.props.member.userId !== this.props.matrixClient.credentials.userId) {
            const dmRoomMap = new DMRoomMap(this.props.matrixClient);
            const dmRooms = dmRoomMap.getDMRoomsForUserId(this.props.member.userId);

            const RoomTile = sdk.getComponent("rooms.RoomTile");

            const tiles = [];
            for (const roomId of dmRooms) {
                const room = this.props.matrixClient.getRoom(roomId);
                if (room) {
                    const me = room.getMember(this.props.matrixClient.credentials.userId);
                    const highlight = (
                        room.getUnreadNotificationCount('highlight') > 0 ||
                        me.membership == "invite"
                    );
                    tiles.push(
                        <RoomTile key={room.roomId} room={room}
                            collapsed={false}
                            selected={false}
                            unread={Unread.doesRoomHaveUnreadMessages(room)}
                            highlight={highlight}
                            isInvite={me.membership == "invite"}
                        />
                    );
                }
            }

            const labelClasses = classNames({
                mx_MemberInfo_createRoom_label: true,
                mx_RoomTile_name: true,
            });
            const startNewChat = <div
                className="mx_MemberInfo_createRoom"
                onClick={this.onNewDMClick}
            >
                <div className="mx_RoomTile_avatar">
                    <img src="img/create-big.svg" width="26" height="26" />
                </div>
                <div className={labelClasses}><i>Start new chat</i></div>
            </div>;

            startChat = <div>
                <h3>Direct chats</h3>
                {tiles}
                {startNewChat}
            </div>;
        }

        if (this.state.updating) {
            var Loader = sdk.getComponent("elements.Spinner");
            spinner = <Loader imgClassName="mx_ContextualMenu_spinner"/>;
        }

        if (this.state.can.kick) {
            kickButton = <div className="mx_MemberInfo_field" onClick={this.onKick}>
                { this.props.member.membership === "invite" ? "Disinvite" : "Kick" }
            </div>;
        }
        if (this.state.can.ban) {
            banButton = <div className="mx_MemberInfo_field" onClick={this.onBan}>
                Ban
            </div>;
        }
        if (this.state.can.mute) {
            var muteLabel = this.state.muted ? "Unmute" : "Mute";
            muteButton = <div className="mx_MemberInfo_field" onClick={this.onMuteToggle}>
                {muteLabel}
            </div>;
        }
        if (this.state.can.toggleMod) {
            var giveOpLabel = this.state.isTargetMod ? "Revoke Moderator" : "Make Moderator";
            giveModButton = <div className="mx_MemberInfo_field" onClick={this.onModToggle}>
                {giveOpLabel}
            </div>;
        }

        // TODO: we should have an invite button if this MemberInfo is showing a user who isn't actually in the current room yet
        // e.g. clicking on a linkified userid in a room

        var adminTools;
        if (kickButton || banButton || muteButton || giveModButton) {
            adminTools =
                <div>
                    <h3>Admin tools</h3>

                    <div className="mx_MemberInfo_buttons">
                        {muteButton}
                        {kickButton}
                        {banButton}
                        {giveModButton}
                    </div>
                </div>;
        }

        const memberName = this.props.member.name;

        var MemberAvatar = sdk.getComponent('avatars.MemberAvatar');
        var PowerSelector = sdk.getComponent('elements.PowerSelector');
        const EmojiText = sdk.getComponent('elements.EmojiText');
        return (
            <div className="mx_MemberInfo">
                <img className="mx_MemberInfo_cancel" src="img/cancel.svg" width="18" height="18" onClick={this.onCancel}/>
                <div className="mx_MemberInfo_avatar">
                    <MemberAvatar onClick={this.onMemberAvatarClick} member={this.props.member} width={48} height={48} />
                </div>

                <EmojiText element="h2">{memberName}</EmojiText>

                <div className="mx_MemberInfo_profile">
                    <div className="mx_MemberInfo_profileField">
                        { this.props.member.userId }
                    </div>
                    <div className="mx_MemberInfo_profileField">
                        Level: <b><PowerSelector controlled={true} value={ parseInt(this.props.member.powerLevel) } disabled={ !this.state.can.modifyLevel } onChange={ this.onPowerChange }/></b>
                    </div>
                </div>

                { adminTools }

                { startChat }

                { this._renderDevices() }

                { spinner }
            </div>
        );
    }
}));
