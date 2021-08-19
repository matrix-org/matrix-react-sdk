/*
Copyright 2021 Šimon Brandner <simon.bra.ag@gmail.com>

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
import IconizedContextMenu, { IconizedContextMenuCheckbox } from './IconizedContextMenu';

interface IProps {
    muted: boolean;
    onFinished: () => void;
    onMuteClicked: () => void;
}

export default class FeedContextMenu extends React.Component<IProps> {
    public render(): JSX.Element {
        return (
            <IconizedContextMenu
                {...this.props}
                className="mx_MessageContextMenu"
                compact={true}
            >
                <IconizedContextMenuCheckbox
                    label={_t("Mute")}
                    iconClassName={null}
                    active={this.props.muted}
                    onClick={this.props.onMuteClicked}
                />
            </IconizedContextMenu>
        );
    }
}
