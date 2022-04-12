
import { Beacon } from 'matrix-js-sdk/src/matrix';
import React, { HTMLProps } from 'react';

import { _t } from '../../../languageHandler';
import { useOwnLiveBeacons } from '../../../utils/beacon';
import BeaconStatus from '../beacon/BeaconStatus';
import { BeaconDisplayStatus } from '../beacon/displayStatus';
import AccessibleButton from '../elements/AccessibleButton';

interface Props {
    displayStatus: BeaconDisplayStatus;
    beacon?: Beacon;
}

/**
 * Wraps BeaconStatus with more listeners
 */
const OwnBeaconStatus: React.FC<Props & HTMLProps<HTMLDivElement>> = ({
    beacon, displayStatus, className, ...rest
}) => {
    const {
        hasWireError,
        hasStopSharingError,
        stoppingInProgress,
        onStopSharing,
        onResetWireError,
    } = useOwnLiveBeacons([beacon?.identifier]);

    // combine display status with errors that only occur for user's own beacons
    const ownDisplayStatus = hasWireError || hasStopSharingError ?
        BeaconDisplayStatus.Error :
        displayStatus;

    return <BeaconStatus
        className='mx_MBeaconBody_chin'
        beacon={beacon}
        displayStatus={ownDisplayStatus}
        label={_t('Live location enabled')}
        displayLiveTimeRemaining
        {...rest}
    >
        {ownDisplayStatus === BeaconDisplayStatus.Active && <AccessibleButton
            data-test-id='beacon-status-stop-beacon'
            kind='link'
            onClick={onStopSharing}
            className='mx_BeaconStatus_destructiveButton'
            disabled={stoppingInProgress}
        >
            { _t('Stop') }
        </AccessibleButton>
        }
        {hasWireError && <AccessibleButton
            data-test-id='beacon-status-reset-wire-error'
            kind='link'
            onClick={onResetWireError}
            className='mx_BeaconStatus_destructiveButton'
        >
            {_t('Retry')}
        </AccessibleButton>
        }
        {hasStopSharingError && <AccessibleButton
            data-test-id='beacon-status-stop-beacon-retry'
            kind='link'
            onClick={onStopSharing}
            className='mx_BeaconStatus_destructiveButton'
        >
            {_t('Retry')}
        </AccessibleButton>}
    </BeaconStatus>;
};

export default OwnBeaconStatus;
