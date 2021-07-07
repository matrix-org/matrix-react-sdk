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
import { RoomMember } from 'matrix-js-sdk/src/models/room-member';
import { getUserNameColorClass } from '../../../utils/FormattingUtils';
import classNames from 'classnames';

interface IProps {
    member?: RoomMember;
    fallbackName: string;
    flair?: JSX.Element;
    onClick?(): void;
    colored?: boolean;
    emphasizeDisplayName?: boolean;
}

export default class DisambiguatedProfile extends React.Component<IProps> {
    render() {
        const { fallbackName, member, flair, colored, emphasizeDisplayName, onClick } = this.props;
        const rawDisplayName = member?.rawDisplayName || fallbackName;
        const mxid = member?.userId;

        let colorClass;
        if (colored) {
            colorClass = getUserNameColorClass(fallbackName);
        }

        let mxidElement;
        if (member?.disambiguate && mxid) {
            mxidElement = (
                <span className="mx_DisambiguatedProfile_mxid">
                    { mxid }
                </span>
            );
        }

        const displayNameClasses = classNames({
            "mx_DisambiguatedProfile_displayName": emphasizeDisplayName,
            [colorClass]: true,
        });

        return (
            <div className="mx_DisambiguatedProfile" dir="auto" onClick={onClick}>
                <span className={displayNameClasses}>
                    { rawDisplayName }
                </span>
                { mxidElement }
                { flair }
            </div>
        );
    }
}
