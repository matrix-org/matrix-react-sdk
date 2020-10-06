/*
Copyright 2017 Vector Creations Ltd

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
import * as sdk from '../../../index';
import PropTypes from 'prop-types';
import { _t } from '../../../languageHandler';

export interface IProps {
    size: string;
    tooltip: boolean;

    /** If selected, on mouse over, a "Start Chat" callout appears. */
    callout?: boolean;
}

export default function StartChatButton(props: IProps) {
    const ActionButton = sdk.getComponent('elements.ActionButton');

    return (
        <ActionButton action="view_create_chat"
            mouseOverAction={props.callout ? "callout_start_chat" : null}
            label={_t("Start chat")}
            iconPath={require("../../../../res/img/icons-people.svg")}
            size={props.size}
            tooltip={props.tooltip}
        />
    );
}

StartChatButton.propTypes = {
    size: PropTypes.string,
    tooltip: PropTypes.bool,
};
