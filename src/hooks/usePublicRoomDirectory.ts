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

import { RoomType } from "matrix-js-sdk/src/@types/event";
import { IRoomDirectoryOptions } from "matrix-js-sdk/src/@types/requests";
import { IProtocol, IPublicRoomsChunkRoom } from "matrix-js-sdk/src/client";
import { useCallback, useEffect, useState } from "react";

import { IPublicRoomDirectoryConfig } from "../components/views/directory/NetworkDropdown";
import { MatrixClientPeg } from "../MatrixClientPeg";
import SdkConfig from "../SdkConfig";
import SettingsStore from "../settings/SettingsStore";
import { Protocols } from "../utils/DirectoryUtils";
import { useLatestResult } from "./useLatestResult";

export const ALL_ROOMS = "ALL_ROOMS";
const LAST_SERVER_KEY = "mx_last_room_directory_server";
const LAST_INSTANCE_KEY = "mx_last_room_directory_instance";

export interface IPublicRoomsOpts {
    limit: number;
    query?: string;
    roomTypes?: Set<RoomType | null>;
}

let thirdParty: Protocols;

export const usePublicRoomDirectory = () => {
    const [publicRooms, setPublicRooms] = useState<IPublicRoomsChunkRoom[]>([]);

    const [config, setConfigInternal] = useState<IPublicRoomDirectoryConfig | null | undefined>(undefined);

    const [protocols, setProtocols] = useState<Protocols | null>(null);

    const [ready, setReady] = useState(false);
    const [loading, setLoading] = useState(false);

    const [updateQuery, updateResult] = useLatestResult<IRoomDirectoryOptions, IPublicRoomsChunkRoom[]>(setPublicRooms);

    async function initProtocols() {
        if (!MatrixClientPeg.get()) {
            // We may not have a client yet when invoked from welcome page
            setReady(true);
        } else if (thirdParty) {
            setProtocols(thirdParty);
        } else {
            const response = await MatrixClientPeg.get().getThirdpartyProtocols();
            thirdParty = response;
            setProtocols(response);
        }
    }

    function setConfig(config: IPublicRoomDirectoryConfig) {
        if (!ready) {
            throw new Error("public room configuration not initialised yet");
        } else {
            setConfigInternal(config);
        }
    }

    const search = useCallback(async ({
        limit = 20,
        query,
        roomTypes,
    }: IPublicRoomsOpts): Promise<boolean> => {
        const opts: IRoomDirectoryOptions = { limit };

        if (config?.roomServer != MatrixClientPeg.getHomeserverName()) {
            opts.server = config?.roomServer;
        }

        if (config?.instanceId === ALL_ROOMS) {
            opts.include_all_networks = true;
        } else if (config?.instanceId) {
            opts.third_party_instance_id = config.instanceId;
        }

        if (query || roomTypes) {
            opts.filter = {
                generic_search_term: query,
                room_types: await MatrixClientPeg.get().doesServerSupportUnstableFeature(
                    "org.matrix.msc3827.stable",
                ) ? Array.from<RoomType | null>(roomTypes) : null,
            };
        }

        updateQuery(opts);
        try {
            setLoading(true);
            const { chunk } = await MatrixClientPeg.get().publicRooms(opts);
            updateResult(opts, chunk);
            return true;
        } catch (e) {
            console.error("Could not fetch public rooms for params", opts, e);
            updateResult(opts, []);
            return false;
        } finally {
            setLoading(false);
        }
    }, [config, updateQuery, updateResult]);

    useEffect(() => {
        initProtocols();
    }, []);

    useEffect(() => {
        if (protocols === null) {
            return;
        }

        const myHomeserver = MatrixClientPeg.getHomeserverName();
        const lsRoomServer = localStorage.getItem(LAST_SERVER_KEY);
        const lsInstanceId: string | undefined = localStorage.getItem(LAST_INSTANCE_KEY) ?? undefined;

        let roomServer: string = myHomeserver;
        if (
            SdkConfig.getObject("room_directory")?.get("servers")?.includes(lsRoomServer) ||
                    SettingsStore.getValue("room_directory_servers")?.includes(lsRoomServer)
        ) {
            roomServer = lsRoomServer;
        }

        let instanceId: string | undefined = undefined;
        if (roomServer === myHomeserver && (
            lsInstanceId === ALL_ROOMS ||
                    Object.values(protocols).some((p: IProtocol) => {
                        p.instances.some(i => i.instance_id === lsInstanceId);
                    })
        )) {
            instanceId = lsInstanceId;
        }

        setReady(true);
        setConfigInternal({ roomServer, instanceId });
    }, [protocols]);

    useEffect(() => {
        localStorage.setItem(LAST_SERVER_KEY, config?.roomServer);
        if (config?.instanceId) {
            localStorage.setItem(LAST_INSTANCE_KEY, config?.instanceId);
        } else {
            localStorage.removeItem(LAST_INSTANCE_KEY);
        }
    }, [config]);

    return {
        ready,
        loading,
        publicRooms,
        protocols,
        config,
        search,
        setConfig,
    } as const;
};
