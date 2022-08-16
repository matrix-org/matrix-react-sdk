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

import { logger } from "matrix-js-sdk/src/logger";
import { ClientEvent } from "matrix-js-sdk/src/matrix";
import { useCallback, useEffect, useRef, useState } from "react";

import { MatrixClientPeg } from "../MatrixClientPeg";
import { Notifier } from "../Notifier";
import DMRoomMap from "../utils/DMRoomMap";

export interface UserOnboardingContext {
    hasAvatar: boolean;
    hasDevices: boolean;
    hasDmRooms: boolean;
    hasNotificationsEnabled: boolean;
}

const USER_ONBOARDING_CONTEXT_INTERVAL = 5000;

function useRefOf<T extends [], R>(value: (...values: T) => R): (...values: T) => R {
    const ref = useRef(value);
    ref.current = value;
    return useCallback(
        (...values: T) => ref.current(...values),
        [],
    );
}

export function useUserOnboardingContext(): UserOnboardingContext | null {
    const [context, setContext] = useState<UserOnboardingContext | null>(null);

    const cli = MatrixClientPeg.get();
    const handler = useRefOf(
        useCallback(async () => {
            try {
                let hasAvatar = context?.hasAvatar;
                if (!hasAvatar) {
                    const profile = await cli.getProfileInfo(cli.getUserId());
                    hasAvatar = Boolean(profile?.avatar_url);
                }

                let hasDevices = context?.hasDevices;
                if (!hasDevices) {
                    const myDevice = cli.getDeviceId();
                    const devices = await cli.getDevices();
                    hasDevices = Boolean(devices.devices.find(device => device.device_id !== myDevice));
                }

                let hasDmRooms = context?.hasDmRooms;
                if (!hasDmRooms) {
                    const dmRooms = DMRoomMap.shared().getUniqueRoomsWithIndividuals() ?? {};
                    hasDmRooms = Boolean(Object.keys(dmRooms).length);
                }

                let hasNotificationsEnabled = context?.hasNotificationsEnabled;
                if (!hasNotificationsEnabled) {
                    hasNotificationsEnabled = Notifier.isPossible();
                }

                if (hasAvatar !== context?.hasAvatar
                    || hasDevices !== context?.hasDevices
                    || hasDmRooms !== context?.hasDmRooms
                    || hasNotificationsEnabled !== context?.hasNotificationsEnabled) {
                    setContext({ hasAvatar, hasDevices, hasDmRooms, hasNotificationsEnabled });
                }
            } catch (e) {
                logger.warn("Could not load context for user onboarding task list: ", e);
                setContext(null);
            }
        }, [context, cli]),
    );

    useEffect(() => {
        let handle;
        let enabled = true;
        const repeater = async () => {
            if (handle) {
                clearTimeout(handle);
                handle = null;
            }
            await handler();
            if (enabled) {
                handle = setTimeout(repeater, USER_ONBOARDING_CONTEXT_INTERVAL);
            }
        };
        repeater().catch(err => logger.warn("could not update user onboarding context", err));
        cli.on(ClientEvent.AccountData, repeater);
        return () => {
            enabled = false;
            cli.off(ClientEvent.AccountData, repeater);
            if (handle) {
                clearTimeout(handle);
                handle = null;
            }
        };
    }, [cli, handler]);

    return context;
}
