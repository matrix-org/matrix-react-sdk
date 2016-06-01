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
var q = require("q");
var React = require('react');

var sdk = require('../../../index');
var Tinter = require('../../../Tinter');
var MatrixClientPeg = require("../../../MatrixClientPeg");
var Modal = require("../../../Modal");

const DEV_SETTINGS_MATRIX_EVENT_NAME = "org.matrix.room.dev_options"

module.exports = React.createClass({
    displayName: 'DevSettings',

    propTypes: {
        room: React.PropTypes.object.isRequired
    },

    getInitialState: function() {
    	console.log("Getting initial state")
        var data = {
            showAllEvents: false
        };
        var event = this.props.room.getAccountData(DEV_SETTINGS_MATRIX_EVENT_NAME);
        if (event) {
        	var scheme = event.getContent();
        	data = {}
        	data.showAllEvents = scheme.showAllEvents;
        }
        console.log("DevSettings result %j", data);
        return data;
    },

    saveSettings: function() { // : Promise
        console.log("Trying to save dev settings %s %j", this.state.hasChanged, this.state);
        if (!this.state.hasChanged) {
            return q(); 
        }
        var originalState = this.getInitialState();
        if (originalState.showAllEvents !== this.state.showAllEvents) {
            console.log("DevSettings have changed");
            return MatrixClientPeg.get().setRoomAccountData(this.props.room.roomId
            		, DEV_SETTINGS_MATRIX_EVENT_NAME
            		, {
                		showAllEvents: this.state.showAllEvents
                }).then(function () {
                	console.log("DevSettings saved correctly")
                }).catch(function(err) {
                	console.log("DevSettings save errored")
                	if (err.errcode == 'M_GUEST_ACCESS_FORBIDDEN') {
                		var NeedToRegisterDialog = sdk.getComponent("dialogs.NeedToRegisterDialog");
                		Modal.createDialog(NeedToRegisterDialog, {
                			title: "Please Register",
                			description: "Saving room developer settings is only available to registered users"
                		});
                	}
                });
        }
        return q(); // no color diff
    },

    _onToggle: function(keyName, checkedValue, uncheckedValue, ev) {
        console.log("Checkbox toggle: %s %s", keyName, ev.target.checked);
        var state = {};
        state[keyName] = ev.target.checked ? checkedValue : uncheckedValue;
        state.hasChanged = true
        this.setState(state);
    },

    render: function() {
        return (
            <label className="mx_RoomSettings_showEverything">
            	<input type="checkbox" onChange={this._onToggle.bind(this, "showAllEvents", true, false)} defaultChecked={this.state.showAllEvents} />
             	Show all the events on this room
             </label>
        );
    }
});
