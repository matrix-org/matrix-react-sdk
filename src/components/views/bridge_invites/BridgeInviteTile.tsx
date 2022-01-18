import { MatrixEvent, Room } from 'matrix-js-sdk';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import RoomAvatar from '../avatars/RoomAvatar';

interface IProps {
    room: Room;
    onSelect: (room: Room, widgetEvent: MatrixEvent) => void;
}

export interface BridgeInviteWidgetContent {
    url: string;
    'uk.half-shot.bridge_room_subscriptions': {
        // eslint-disable-next-line camelcase
        inviteWidget?: boolean;
    };
}

export default function BridgeInviteTile(props: IProps) {
    // Fetch state
    const widgetEvents = props.room.currentState.getStateEvents('im.vector.modular.widgets');
    // Find the one for integrations
    const inviteWidget = widgetEvents.find(
        (sEv) => sEv.getContent()['uk.half-shot.bridge_room_subscriptions']?.inviteWidget === true);

    const onClick = useCallback(() => {
        props.onSelect(props.room, inviteWidget);
    }, [props, inviteWidget]);

    if (!inviteWidget) {
        // No widget, no tile.
        return null;
    }

    const avatarSize = 36;
    return <div className='mx_InviteDialog_roomTile' onClick={onClick}>
        <RoomAvatar room={props.room} height={avatarSize} width={avatarSize} />
        <span className="mx_InviteDialog_roomTile_nameStack">
            <div className='mx_InviteDialog_roomTile_name'>{ props.room.name }</div>
            <div className='mx_InviteDialog_roomTile_userId'>{ props.room.roomId }</div>
        </span>
    </div>;
}
