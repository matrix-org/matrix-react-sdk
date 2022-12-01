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

import { CryptoEvent } from "matrix-js-sdk/src/crypto";
import { useContext, useEffect, useState } from "react";

import MatrixClientContext from "../../../../../contexts/MatrixClientContext";
import { Device } from "../@types";

const disambiguateDevices = (devices: Device[]) => {
    const names = Object.create(null);
    for (let i = 0; i < devices.length; i++) {
        const name = devices[i].getDisplayName();
        const indexList = names[name] || [];
        indexList.push(i);
        names[name] = indexList;
    }
    for (const name in names) {
        if (names[name].length > 1) {
            names[name].forEach((j) => {
                devices[j].ambiguous = true;
            });
        }
    }
};

export const useDevices = (userId: string) => {
    const cli = useContext(MatrixClientContext);

    // undefined means yet to be loaded, null means failed to load, otherwise list of devices
    const [devices, setDevices] = useState(undefined);
    // Download device lists
    useEffect(() => {
        setDevices(undefined);

        let cancelled = false;

        async function downloadDeviceList() {
            try {
                await cli.downloadKeys([userId], true);
                const devices = cli.getStoredDevicesForUser(userId);

                if (cancelled) {
                    // we got cancelled - presumably a different user now
                    return;
                }

                disambiguateDevices(devices);
                setDevices(devices);
            } catch (err) {
                setDevices(null);
            }
        }
        downloadDeviceList();

        // Handle being unmounted
        return () => {
            cancelled = true;
        };
    }, [cli, userId]);

    // Listen to changes
    useEffect(() => {
        let cancel = false;
        const updateDevices = async () => {
            const newDevices = cli.getStoredDevicesForUser(userId);
            if (cancel) return;
            setDevices(newDevices);
        };
        const onDevicesUpdated = (users) => {
            if (!users.includes(userId)) return;
            updateDevices();
        };
        const onDeviceVerificationChanged = (_userId, device) => {
            if (_userId !== userId) return;
            updateDevices();
        };
        const onUserTrustStatusChanged = (_userId, trustStatus) => {
            if (_userId !== userId) return;
            updateDevices();
        };
        cli.on(CryptoEvent.DevicesUpdated, onDevicesUpdated);
        cli.on(CryptoEvent.DeviceVerificationChanged, onDeviceVerificationChanged);
        cli.on(CryptoEvent.UserTrustStatusChanged, onUserTrustStatusChanged);
        // Handle being unmounted
        return () => {
            cancel = true;
            cli.removeListener(CryptoEvent.DevicesUpdated, onDevicesUpdated);
            cli.removeListener(CryptoEvent.DeviceVerificationChanged, onDeviceVerificationChanged);
            cli.removeListener(CryptoEvent.UserTrustStatusChanged, onUserTrustStatusChanged);
        };
    }, [cli, userId]);

    return devices;
};
