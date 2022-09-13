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

import { useCallback, useContext, useEffect, useState } from "react";
import { IMyDevice, MatrixClient } from "matrix-js-sdk/src/matrix";
import { CrossSigningInfo } from "matrix-js-sdk/src/crypto/CrossSigning";
import { VerificationRequest } from "matrix-js-sdk/src/crypto/verification/request/VerificationRequest";
import { User } from "matrix-js-sdk/src/models/user";
import { logger } from "matrix-js-sdk/src/logger";

import MatrixClientContext from "../../../../contexts/MatrixClientContext";
import { DevicesDictionary, DeviceWithVerification } from "./types";

const isDeviceVerified = (
    matrixClient: MatrixClient,
    crossSigningInfo: CrossSigningInfo,
    device: IMyDevice,
): boolean | null => {
    try {
        const deviceInfo = matrixClient.getStoredDevice(matrixClient.getUserId(), device.device_id);
        return crossSigningInfo.checkDeviceTrust(
            crossSigningInfo,
            deviceInfo,
            false,
            true,
        ).isCrossSigningVerified();
    } catch (error) {
        logger.error("Error getting device cross-signing info", error);
        return null;
    }
};

const fetchDevicesWithVerification = async (matrixClient: MatrixClient): Promise<DevicesState['devices']> => {
    const { devices } = await matrixClient.getDevices();
    const crossSigningInfo = matrixClient.getStoredCrossSigningForUser(matrixClient.getUserId());

    const devicesDict = devices.reduce((acc, device: IMyDevice) => ({
        ...acc,
        [device.device_id]: {
            ...device,
            isVerified: isDeviceVerified(matrixClient, crossSigningInfo, device),
        },
    }), {});

    return devicesDict;
};

export enum OwnDevicesError {
    Unsupported = 'Unsupported',
    Default = 'Default',
}
type DevicesState = {
    devices: DevicesDictionary;
    currentDeviceId: string;
    currentUserMember?: User;
    isLoading: boolean;
    // not provided when current session cannot request verification
    requestDeviceVerification?: (deviceId: DeviceWithVerification['device_id']) => Promise<VerificationRequest>;
    refreshDevices: () => Promise<void>;
    error?: OwnDevicesError;
};
export const useOwnDevices = (): DevicesState => {
    const matrixClient = useContext(MatrixClientContext);

    const currentDeviceId = matrixClient.getDeviceId();

    const [devices, setDevices] = useState<DevicesState['devices']>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<OwnDevicesError>();

    const refreshDevices = useCallback(async () => {
        setIsLoading(true);
        try {
            const devices = await fetchDevicesWithVerification(matrixClient);
            setDevices(devices);
            setIsLoading(false);
        } catch (error) {
            if (error.httpStatus == 404) {
                // 404 probably means the HS doesn't yet support the API.
                setError(OwnDevicesError.Unsupported);
            } else {
                logger.error("Error loading sessions:", error);
                setError(OwnDevicesError.Default);
            }
            setIsLoading(false);
        }
    }, [matrixClient]);

    useEffect(() => {
        refreshDevices();
    }, [refreshDevices]);

    const isCurrentDeviceVerified = !!devices[currentDeviceId]?.isVerified;

    const requestDeviceVerification = isCurrentDeviceVerified ? async (deviceId) => {
        const userId = matrixClient.getUserId();
        return await matrixClient.requestVerification(
            userId,
            [deviceId],
        );
    } : undefined;

    return {
        devices,
        currentDeviceId,
        currentUserMember: matrixClient.getUser(matrixClient.getUserId()),
        requestDeviceVerification,
        refreshDevices,
        isLoading,
        error,
    };
};
