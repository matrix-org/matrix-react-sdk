
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
    error?: Error;
}

/**
 * Wraps BeaconStatus with more listeners
 */
const OwnBeaconStatus: React.FC<Props & HTMLProps<HTMLDivElement>> = ({
    beacon, displayStatus, error, className, ...rest
}) => {
    const { onStopSharing, stoppingInProgress } = useOwnLiveBeacons([beacon?.identifier]);

    return <BeaconStatus
        className='mx_MBeaconBody_chin'
        beacon={beacon}
        displayStatus={displayStatus}
        label={_t('Live location enabled')}
        displayLiveTimeRemaining
        {...rest}
    >
        { displayStatus === BeaconDisplayStatus.Active && <AccessibleButton
            data-test-id='beacon-status-stop-beacon'
            kind='link'
            onClick={onStopSharing}
            className='mx_BeaconStatus_stopButton'
            disabled={stoppingInProgress}
        >
            { _t('Stop') }
        </AccessibleButton>
        }
    </BeaconStatus>;
};

export default OwnBeaconStatus;
