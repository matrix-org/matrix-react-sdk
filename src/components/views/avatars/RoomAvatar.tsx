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
import React, { ComponentProps } from 'react';
import { Room } from 'matrix-js-sdk/src/models/room';
import { ResizeMethod } from 'matrix-js-sdk/src/@types/partials';

import BaseAvatar from './BaseAvatar';
import ImageView from '../elements/ImageView';
import { MatrixClientPeg } from '../../../MatrixClientPeg';
import Modal from '../../../Modal';
import * as Avatar from '../../../Avatar';
import { replaceableComponent } from "../../../utils/replaceableComponent";
import { mediaFromMxc } from "../../../customisations/Media";

interface IProps extends Omit<ComponentProps<typeof BaseAvatar>, "name" | "idName" | "url" | "onClick"> {
    // Room may be left unset here, but if it is,
    // oobData.avatarUrl should be set (else there
    // would be nowhere to get the avatar from)
    room?: Room;
    // TODO: type when js-sdk has types
    oobData?: any;
    width?: number;
    height?: number;
    resizeMethod?: ResizeMethod;
    viewAvatarOnClick?: boolean;
    onClick?(): void;
}

interface IState {
    urls: string[];
}

@replaceableComponent("views.avatars.RoomAvatar")
export default class RoomAvatar extends React.Component<IProps, IState> {
    public static defaultProps = {
        width: 36,
        height: 36,
        resizeMethod: 'crop',
        oobData: {},
    };

    constructor(props: IProps) {
        super(props);

        this.state = {
            urls: RoomAvatar.getImageUrls(this.props),
        };
    }

    public componentDidMount() {
        MatrixClientPeg.get().on("RoomState.events", this.onRoomStateEvents);
    }

    public componentWillUnmount() {
        const cli = MatrixClientPeg.get();
        if (cli) {
            cli.removeListener("RoomState.events", this.onRoomStateEvents);
        }
    }

    public static getDerivedStateFromProps(nextProps: IProps): IState {
        return {
            urls: RoomAvatar.getImageUrls(nextProps),
        };
    }

    // TODO: type when js-sdk has types
    private onRoomStateEvents = (ev: any) => {
        if (!this.props.room ||
            ev.getRoomId() !== this.props.room.roomId ||
            ev.getType() !== 'm.room.avatar'
        ) return;

        this.setState({
            urls: RoomAvatar.getImageUrls(this.props),
        });
    };

    private static getImageUrls(props: IProps): string[] {
        let oobAvatar = null;
        if (props.oobData.avatarUrl) {
            oobAvatar = mediaFromMxc(props.oobData.avatarUrl).getThumbnailOfSourceHttp(
                props.width,
                props.height,
                props.resizeMethod,
            );
        }
        return [
            oobAvatar, // highest priority
            RoomAvatar.getRoomAvatarUrl(props),
        ].filter(function(url) {
            return (url !== null && url !== "");
        });
    }

    private static getRoomAvatarUrl(props: IProps): string {
        if (!props.room) return null;

        return Avatar.avatarUrlForRoom(props.room, props.width, props.height, props.resizeMethod);
    }

    private onRoomAvatarClick = () => {
        const avatarUrl = Avatar.avatarUrlForRoom(
            this.props.room,
            null,
            null,
            null,
        );
        const params = {
            src: avatarUrl,
            name: this.props.room.name,
        };

        Modal.createDialog(ImageView, params, "mx_Dialog_lightbox", null, true);
    };

    public render() {
        const {room, oobData, viewAvatarOnClick, onClick, ...otherProps} = this.props;

        const roomName = room ? room.name : oobData.name;

        return (
            <BaseAvatar {...otherProps}
                name={roomName}
                idName={room ? room.roomId : null}
                urls={this.state.urls}
                onClick={viewAvatarOnClick && this.state.urls[0] ? this.onRoomAvatarClick : onClick}
            />
        );
    }
}
