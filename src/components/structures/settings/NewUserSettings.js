/*
Copyright 2017 Travis Ralston

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

import * as React from "react";
import {_td} from "../../../languageHandler";
import {TabbedView, Tab} from "../TabbedView";
import AboutAppSettingsPanel from "./user/AboutAppSettingsPanel";
import AccountSettingsPanel from "./user/AccountSettingsPanel";
import AdvancedSettingsPanel from "./user/AdvancedSettingsPanel";
import CryptoSettingsPanel from "./user/CryptoSettingsPanel";
import GeneralSettingsPanel from "./user/GeneralSettingsPanel";
import InterfaceSettingsPanel from "./user/InterfaceSettingsPanel";
import NotificationsSettingsPanel from "./user/NotificationsSettingsPanel";
import VoipSettingsPanel from "./user/VoipSettingsPanel";

module.exports = React.createClass({
    displayName: 'NewUserSettings',

    propTypes: {
        onClose: React.PropTypes.func,
        // The brand string given when creating email pushers
        brand: React.PropTypes.string,

        // The base URL to use in the referral link. Defaults to window.location.origin.
        referralBaseUrl: React.PropTypes.string,

        // Team token for the referral link. If falsy, the referral section will
        // not appear
        teamToken: React.PropTypes.string,
    },

    getDefaultProps: function () {
        return {
            onClose: function () {
            },
        };
    },

    _getTabs: function () {
        return [
            new Tab(_td("General"), (<GeneralSettingsPanel />)),
            new Tab(_td("Account"), (<AccountSettingsPanel />)),
            new Tab(_td("Notifications"), (<NotificationsSettingsPanel />)),
            new Tab(_td("Interface"), (<InterfaceSettingsPanel />)),
            new Tab(_td("Cryptography"), (<CryptoSettingsPanel />)),
            new Tab(_td("Advanced"), (<AdvancedSettingsPanel />)),
            new Tab(_td("About"), (<AboutAppSettingsPanel />)),
        ];
    },

    render: function () {
        return <TabbedView onExit={this.props.onClose} tabs={this._getTabs()} />
    },
});
