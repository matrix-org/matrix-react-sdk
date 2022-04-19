/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import React, { useContext } from 'react';
import { Beacon, RoomMember, BeaconEvent } from 'matrix-js-sdk/src/matrix';

import MatrixClientContext from '../../../contexts/MatrixClientContext';
import { useEventEmitterState } from '../../../hooks/useEventEmitter';
import { LocationAssetType } from 'matrix-js-sdk/src/@types/location';
import BeaconStatus from './BeaconStatus';
import { BeaconDisplayStatus } from './displayStatus';
import MemberAvatar from '../avatars/MemberAvatar';
import StyledLiveBeaconIcon from './StyledLiveBeaconIcon';

interface Props {
    beacon: Beacon;
}

const ListItem: React.FC<Props> = ({ beacon }) => {
    const latestLocationState = useEventEmitterState(
        beacon,
        BeaconEvent.LocationUpdate,
        () => beacon.latestLocationState,
    );
    const matrixClient = useContext(MatrixClientContext);
    const room = matrixClient.getRoom(beacon.roomId);

    if (!latestLocationState || !beacon.isLive) {
        return null;
    }

    const isSelfLocation = beacon.beaconInfo.assetType === LocationAssetType.Self;
    const beaconMember = isSelfLocation ?
        room.getMember(beacon.beaconInfoOwner) :
        undefined;
        
    return <li className='mx_BeaconListItem'>
        { isSelfLocation ?
            <MemberAvatar
                className='mx_BeaconListItem_avatar'
                member={beaconMember}
                height={32}
                width={32}
            /> :
            <StyledLiveBeaconIcon className='mx_BeaconListItem_avatarIcon'/>
        }
        <div className='mx_BeaconListItem_info'>
            <BeaconStatus
                className='mx_BeaconListItem_status'
                beacon={beacon}
                label={isSelfLocation ? beaconMember.name : beacon.beaconInfo.description}
                displayStatus={BeaconDisplayStatus.Active}
            />
            <span className='mx_BeaconListItem_lastUpdated'>Updated 99min ago</span>
        </div>
    </li>;
};

export default ListItem;
