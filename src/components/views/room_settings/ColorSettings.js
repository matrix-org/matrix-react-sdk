/*
Copyright 2016 OpenMarket Ltd

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
import Promise from 'bluebird';
const React = require('react');

const Tinter = require('../../../Tinter');
const MatrixClientPeg = require("../../../MatrixClientPeg");
const Modal = require("../../../Modal");
import dis from '../../../dispatcher';

const ROOM_COLORS = [
    // magic room default values courtesy of Ribot
    {primary_color: "#76cfa6", secondary_color: "#eaf5f0"},
    {primary_color: "#81bddb", secondary_color: "#eaf1f4"},
    {primary_color: "#bd79cb", secondary_color: "#f3eaf5"},
    {primary_color: "#c65d94", secondary_color: "#f5eaef"},
    {primary_color: "#e55e5e", secondary_color: "#f5eaea"},
    {primary_color: "#eca46f", secondary_color: "#f5eeea"},
    {primary_color: "#dad658", secondary_color: "#f5f4ea"},
    {primary_color: "#80c553", secondary_color: "#eef5ea"},
    {primary_color: "#bb814e", secondary_color: "#eee8e3"},
    {primary_color: "#595959", secondary_color: "#ececec"},
];

module.exports = React.createClass({
    displayName: 'ColorSettings',

    propTypes: {
        room: React.PropTypes.object.isRequired,
        forRoomDefaults: React.PropTypes.bool, // whether to manage the personal settings or default settings

        disabled: React.PropTypes.bool,
    },

    getInitialState: function() {
        const data = {
            index: 0,
            primary_color: ROOM_COLORS[0].primary_color,
            secondary_color: ROOM_COLORS[0].secondary_color,
            hasChanged: false,
            usingRoomDefaults: true,
        };

        const defaultEvent = this.props.room.currentState.getStateEvents('im.vector.room.color_scheme', '');
        if (defaultEvent && defaultEvent.getContent()) {
            const defaultScheme = defaultEvent.getContent();
            if (defaultScheme.primary_color) {
                data.primary_color = defaultScheme.primary_color;
                data.secondary_color = defaultScheme.secondary_color;
            }
        }

        if (!this.props.forRoomDefaults) {
            const event = this.props.room.getAccountData("org.matrix.room.color_scheme");
            if (event && event.getContent()) {
                const scheme = event.getContent();
                if (scheme.primary_color) {
                    data.primary_color = scheme.primary_color;
                    data.secondary_color = scheme.secondary_color;
                    data.usingRoomDefaults = false;
                }
            }
        }

        data.index = this._getColorIndex(data);
        if (data.index === -1) {
            // append the unrecognised colours to our palette
            data.index = ROOM_COLORS.length;
            ROOM_COLORS.push({
                primary_color: data.primary_color,
                secondary_color: data.secondary_color,
            });
        }
        return data;
    },

    componentWillMount: function() {
        this.dispatcherRef = dis.register(this.onAction);
    },

    componentWillUnmount: function() {
        dis.unregister(this.dispatcherRef);
    },

    onAction: function(payload) {
        if (payload.action !== "room_default_color_picked") return;

        this._tryUseRoomDefault(payload.chosenColorIndex);
    },

    saveSettings: function() { // : Promise
        if (!this.state.hasChanged) {
            return Promise.resolve(); // They didn't explicitly give a color to save.
        }
        const originalState = this.getInitialState();
        if (originalState.primary_color !== this.state.primary_color ||
                originalState.secondary_color !== this.state.secondary_color) {
            console.log("ColorSettings: Saving new color");
            const content = {
                primary_color: this.state.primary_color,
                secondary_color: this.state.secondary_color,
            };

            if (this.props.forRoomDefaults) {
                return MatrixClientPeg.get().sendStateEvent(this.props.room.roomId, "im.vector.room.color_scheme", content, '');
            } else return MatrixClientPeg.get().setRoomAccountData(this.props.room.roomId, "org.matrix.room.color_scheme", content);
        }
        return Promise.resolve(); // no color diff
    },

    _getColorIndex: function(scheme) {
        if (!scheme || !scheme.primary_color || !scheme.secondary_color) {
            return -1;
        }
        // XXX: we should validate these values
        for (let i = 0; i < ROOM_COLORS.length; i++) {
            const room_color = ROOM_COLORS[i];
            if (room_color.primary_color.toLowerCase() === String(scheme.primary_color).toLowerCase() &&
                    room_color.secondary_color.toLowerCase() === String(scheme.secondary_color).toLowerCase()) {
                return i;
            }
        }
        return -1;
    },

    _tryUseRoomDefault: function(index) {
        if (this.props.forRoomDefaults || this.state.hasChanged || !this.state.usingRoomDefaults) return;

        this.setState({
            index: index,
            primary_color: ROOM_COLORS[index].primary_color,
            secondary_color: ROOM_COLORS[index].secondary_color,
            //hasChanged: true, // we're just giving the user a visual indicator
        });
    },

    _onColorSchemeChanged: function(index) {
        // preview what the user just changed the scheme to.
        Tinter.tint(ROOM_COLORS[index].primary_color, ROOM_COLORS[index].secondary_color);
        this.setState({
            index: index,
            primary_color: ROOM_COLORS[index].primary_color,
            secondary_color: ROOM_COLORS[index].secondary_color,
            hasChanged: true,
        });
        if (this.props.forRoomDefaults) {
            dis.dispatch({action: "room_default_color_picked", chosenColorIndex: index});
        }
    },

    render: function() {
        return (
            <div className="mx_RoomSettings_roomColors">
                { ROOM_COLORS.map((room_color, i) => {
                    let selected;
                    if (i === this.state.index) {
                        selected = (
                            <div className="mx_RoomSettings_roomColor_selected">
                                <img src="img/tick.svg" width="17" height="14" alt="./" />
                            </div>
                        );
                    }
                    let boundClick = this._onColorSchemeChanged.bind(this, i);
                    if (this.props.disabled) boundClick = null;
                    return (
                        <div className={"mx_RoomSettings_roomColor" + (this.props.disabled ? ' mx_RoomSettings_roomColor_disabled' : '') }
                              key={"room_color_" + i}
                              style={{ backgroundColor: room_color.secondary_color }}
                              onClick={boundClick}>
                            { selected }
                            <div className="mx_RoomSettings_roomColorPrimary" style={{ backgroundColor: room_color.primary_color }}></div>
                        </div>
                    );
                }) }
            </div>
        );
    },
});
