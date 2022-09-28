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
import { IMyDevice, IPusher, MatrixClient, PUSHER_DEVICE_ID, PUSHER_ENABLED } from "matrix-js-sdk/src/matrix";
import { CrossSigningInfo } from "matrix-js-sdk/src/crypto/CrossSigning";
import { VerificationRequest } from "matrix-js-sdk/src/crypto/verification/request/VerificationRequest";
import { MatrixError } from "matrix-js-sdk/src/http-api";
import { logger } from "matrix-js-sdk/src/logger";

import MatrixClientContext from "../../../../contexts/MatrixClientContext";
import { _t } from "../../../../languageHandler";
import { DevicesDictionary, DeviceWithVerification } from "./types";

const isDeviceVerified = (
    matrixClient: MatrixClient,
    crossSigningInfo: CrossSigningInfo,
    device: IMyDevice,
): boolean | null => {
    try {
        const userId = matrixClient.getUserId();
        if (!userId) {
            throw new Error('No user id');
        }
        const deviceInfo = matrixClient.getStoredDevice(userId, device.device_id);
        if (!deviceInfo) {
            throw new Error('No device info available');
        }
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

const fetchDevicesWithVerification = async (
    matrixClient: MatrixClient,
    userId: string,
): Promise<DevicesState['devices']> => {
    const { devices } = await matrixClient.getDevices();

    const crossSigningInfo = matrixClient.getStoredCrossSigningForUser(userId);

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
export type DevicesState = {
    devices: DevicesDictionary;
    pushers: IPusher[];
    currentDeviceId: string;
    isLoadingDeviceList: boolean;
    // not provided when current session cannot request verification
    requestDeviceVerification?: (deviceId: DeviceWithVerification['device_id']) => Promise<VerificationRequest>;
    refreshDevices: () => Promise<void>;
    saveDeviceName: (deviceId: DeviceWithVerification['device_id'], deviceName: string) => Promise<void>;
    setPushNotifications: (deviceId: DeviceWithVerification['device_id'], enabled: boolean) => Promise<void>;
    error?: OwnDevicesError;
    supportsMSC3881?: boolean | undefined;
};
export const useOwnDevices = (): DevicesState => {
    const matrixClient = useContext(MatrixClientContext);

    const currentDeviceId = matrixClient.getDeviceId();
    const userId = matrixClient.getUserId();

    const [devices, setDevices] = useState<DevicesState['devices']>({});
    const [pushers, setPushers] = useState<DevicesState['pushers']>([]);
    const [isLoadingDeviceList, setIsLoadingDeviceList] = useState(true);
    const [supportsMSC3881, setSupportsMSC3881] = useState(true); // optimisticly saying yes!

    const [error, setError] = useState<OwnDevicesError>();

    useEffect(() => {
        matrixClient.doesServerSupportUnstableFeature("org.matrix.msc3881").then(hasSupport => {
            setSupportsMSC3881(hasSupport);
        });
    }, [matrixClient]);

    const refreshDevices = useCallback(async () => {
        setIsLoadingDeviceList(true);
        try {
            // realistically we should never hit this
            // but it satisfies types
            if (!userId) {
                throw new Error('Cannot fetch devices without user id');
            }
            const devices = await fetchDevicesWithVerification(matrixClient, userId);
            setDevices(devices);

            const { pushers } = await matrixClient.getPushers();
            setPushers(pushers);

            setIsLoadingDeviceList(false);
        } catch (error) {
            if ((error as MatrixError).httpStatus == 404) {
                // 404 probably means the HS doesn't yet support the API.
                setError(OwnDevicesError.Unsupported);
            } else {
                logger.error("Error loading sessions:", error);
                setError(OwnDevicesError.Default);
            }
            setIsLoadingDeviceList(false);
        }
    }, [matrixClient, userId]);

    useEffect(() => {
        refreshDevices();
    }, [refreshDevices]);

    const isCurrentDeviceVerified = !!devices[currentDeviceId]?.isVerified;

    const requestDeviceVerification = isCurrentDeviceVerified && userId
        ? async (deviceId: DeviceWithVerification['device_id']) => {
            return await matrixClient.requestVerification(
                userId,
                [deviceId],
            );
        }
        : undefined;

    const saveDeviceName = useCallback(
        async (deviceId: DeviceWithVerification['device_id'], deviceName: string): Promise<void> => {
            const device = devices[deviceId];

            // no change
            if (deviceName === device?.display_name) {
                return;
            }

            try {
                await matrixClient.setDeviceDetails(
                    deviceId,
                    { display_name: deviceName },
                );
                await refreshDevices();
            } catch (error) {
                logger.error("Error setting session display name", error);
                throw new Error(_t("Failed to set display name"));
            }
        }, [matrixClient, devices, refreshDevices]);

    const setPushNotifications = useCallback(
        async (deviceId: DeviceWithVerification['device_id'], enabled: boolean): Promise<void> => {
            try {
                const pusher = pushers.find(pusher => pusher[PUSHER_DEVICE_ID.name] === deviceId);
                if (pusher) {
                    await matrixClient.setPusher({
                        ...pusher,
                        [PUSHER_ENABLED.name]: enabled,
                    });
                }
            } catch (error) {
                logger.error("Error setting pusher state", error);
                throw new Error(_t("Failed to set pusher state"));
            } finally {
                await refreshDevices();
            }
        }, [matrixClient, pushers, refreshDevices],
    );

    return {
        devices,
        pushers,
        currentDeviceId,
        isLoadingDeviceList,
        error,
        requestDeviceVerification,
        refreshDevices,
        saveDeviceName,
        setPushNotifications,
        supportsMSC3881,
    };
};
