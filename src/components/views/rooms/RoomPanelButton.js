/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd
Copyright 2017 New Vector Ltd
Copyright 2018 New Vector Ltd
Copyright 2019, 2020 The Matrix.org Foundation C.I.C.

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
import { _t } from '../../../languageHandler';
import HeaderButton from '../right_panel/HeaderButton';
import HeaderButtons, {HEADER_KIND_ROOM} from '../right_panel/HeaderButtons';
import {RIGHT_PANEL_PHASES} from "../../../stores/RightPanelStorePhases";

const MEMBER_PHASES = [
    RIGHT_PANEL_PHASES.RoomMemberList,
    RIGHT_PANEL_PHASES.RoomMemberInfo,
    RIGHT_PANEL_PHASES.EncryptionPanel,
    RIGHT_PANEL_PHASES.Room3pidMemberInfo,
];

export default class RoomPanelButton extends HeaderButtons {
    constructor(props) {
        super(props, HEADER_KIND_ROOM);
        this._onTogglePanel = this._onTogglePanel.bind(this);
    }

    _onTogglePanel() {
        this.setPhase(RIGHT_PANEL_PHASES.RoomMemberList);

        if (this.state.phase === null) {
            parent.postMessage('resizeCompact', '*');
        } else {
            parent.postMessage('resizeFull', '*');
        }
    }

    renderButtons() {
        return [
            <HeaderButton key="expandPanelButton" name="expandPanelButton"
                title={_t('Members')}
                isHighlighted={this.isPhase(MEMBER_PHASES)}
                onClick={this._onTogglePanel}
                analytics={['Right Panel', 'Member List Button', 'click']}
            />,
        ];
    }
}
