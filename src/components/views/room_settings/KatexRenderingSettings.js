/*
Copyright 2016 OpenMarket Ltd
Copyright 2017 Travis Ralston
Copyright 2018-2019 New Vector Ltd

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

const React = require('react');
import PropTypes from 'prop-types';
const sdk = require("../../../index");
import { _t, _td } from '../../../languageHandler';
import SettingsStore, {SettingLevel} from "../../../settings/SettingsStore";
import dis from "../../../dispatcher";
import MatrixClientPeg from "../../../MatrixClientPeg";


module.exports = React.createClass({
    displayName: 'KatexRenderingSettings',

    propTypes: {
        room: PropTypes.object,
    },

    _onClickUserSettings: (e) => {
        e.preventDefault();
        e.stopPropagation();
        dis.dispatch({action: 'view_user_settings'});
    },

    render: function() {
        const SettingsFlag = sdk.getComponent("elements.SettingsFlag");
        const roomId = this.props.room.roomId;
        const isEncrypted = MatrixClientPeg.get().isRoomEncrypted(roomId);

        let katexForRoomAccount = null;
        let katexForAccount = null;
        let katexForRoom = null;

        if (!isEncrypted) {
            // Only show account setting state and room state setting state in non-e2ee rooms where they apply
            const accountEnabled = SettingsStore.getValueAt(SettingLevel.ACCOUNT, "katexRendering");
            if (accountEnabled) {
                katexForAccount = (
                    _t("You have <a>enabled</a> KaTeX rendering by default.", {}, {
                        'a': (sub)=><a onClick={this._onClickUserSettings} href=''>{ sub }</a>,
                    })
                );
            } else if (!accountEnabled) {
                katexForAccount = (
                    _t("You have <a>disabled</a> KaTeX rendering by default.", {}, {
                        'a': (sub)=><a onClick={this._onClickUserSettings} href=''>{ sub }</a>,
                    })
                );
            }

            if (SettingsStore.canSetValue("katexRendering", roomId, "room")) {
                katexForRoom = (
                    <label>
                        <SettingsFlag name="katexRendering"
                                      level={SettingLevel.ROOM}
                                      roomId={roomId}
                                      isExplicit={true} />
                    </label>
                );
            } else {
                let str = _td("KaTeX rendering is enabled by default for participants in this room.");
                if (!SettingsStore.getValueAt(SettingLevel.ROOM, "katexRendering", roomId, /*explicit=*/true)) {
                    str = _td("KaTeX rendering is disabled by default for participants in this room.");
                }
                katexForRoom = (<label>{ _t(str) }</label>);
            }
        } else {
            katexForAccount = (
                _t("In encrypted rooms, like this one, KaTeX rendering is disabled by default.")
            );
        }

        katexForRoomAccount = (
            <SettingsFlag name={'katexRendering'}
                          level={SettingLevel.ROOM_ACCOUNT}
                          roomId={roomId} />
        );

        return (
            <div>
                <div className='mx_SettingsTab_subsectionText'>
                    { _t('Riot can use KaTeX to render mathematics instead of relying on image fallbacks.') }
                </div>
                <div className='mx_SettingsTab_subsectionText'>
                    { katexForAccount }
                </div>
                { katexForRoom }
                <label>{ katexForRoomAccount }</label>
            </div>
        );
    },
});
