/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2019 The Matrix.org Foundation C.I.C.

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
import {RoomMember} from "matrix-js-sdk/src/models/room-member";

import dis from "../../../dispatcher/dispatcher";
import {Action} from "../../../dispatcher/actions";
import BaseAvatar from "./BaseAvatar";
import {replaceableComponent} from "../../../utils/replaceableComponent";
import {mediaFromMxc} from "../../../customisations/Media";
import {ResizeMethod} from "../../../Avatar";

interface IProps extends Omit<React.ComponentProps<typeof BaseAvatar>, "name" | "idName" | "url"> {
    member: RoomMember;
    fallbackUserId?: string;
    width: number;
    height: number;
    resizeMethod?: ResizeMethod;
    // The onClick to give the avatar
    onClick?: React.MouseEventHandler;
    // Whether the onClick of the avatar should be overriden to dispatch `Action.ViewUser`
    viewUserOnClick?: boolean;
    title?: string;
}

interface IState {
    name: string;
    title: string;
    imageUrl?: string;
}

@replaceableComponent("views.avatars.MemberAvatar")
export default class MemberAvatar extends React.Component<IProps, IState> {
    public static defaultProps = {
        width: 40,
        height: 40,
        resizeMethod: 'crop',
        viewUserOnClick: false,
    };

    constructor(props: IProps) {
        super(props);

        this.state = MemberAvatar.getState(props);
    }

    public static getDerivedStateFromProps(nextProps: IProps): IState {
        return MemberAvatar.getState(nextProps);
    }

    private static getState(props: IProps): IState {
        if (props.member?.name) {
            let imageUrl = null;
            if (props.member.getMxcAvatarUrl()) {
                imageUrl = mediaFromMxc(props.member.getMxcAvatarUrl()).getThumbnailOfSourceHttp(
                    props.width,
                    props.height,
                    props.resizeMethod,
                );
            }
            return {
                name: props.member.name,
                title: props.title || props.member.userId,
                imageUrl: imageUrl,
            };
        } else if (props.fallbackUserId) {
            return {
                name: props.fallbackUserId,
                title: props.fallbackUserId,
            };
        } else {
            console.error("MemberAvatar called somehow with null member or fallbackUserId");
        }
    }

    render() {
        let {member, fallbackUserId, onClick, viewUserOnClick, ...otherProps} = this.props;
        const userId = member ? member.userId : fallbackUserId;

        if (viewUserOnClick) {
            onClick = () => {
                dis.dispatch({
                    action: Action.ViewUser,
                    member: this.props.member,
                });
            };
        }

        return (
            <BaseAvatar {...otherProps} name={this.state.name} title={this.state.title}
                idName={userId} url={this.state.imageUrl} onClick={onClick} />
        );
    }
}
