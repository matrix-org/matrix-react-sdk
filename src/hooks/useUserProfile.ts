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

import { useCallback, useState } from "react";

import { MatrixClientPeg } from "../MatrixClientPeg";

export interface IProfileInfoOpts {
    query?: string;
}

export interface IProfileInfo {
    avatar_url?: string;
    displayname?: string;
}

export const useProfileInfo = () => {
    const [profile, setProfile] = useState<IProfileInfo | null>(null);

    const [loading, setLoading] = useState(false);

    const search = useCallback(async ({ query: term }: IProfileInfoOpts): Promise<boolean> => {
        if (!term?.length || !term.startsWith('@') || !term.includes(':')) {
            setProfile(null);
            return true;
        }

        try {
            setLoading(true);
            setProfile(await MatrixClientPeg.get().getProfileInfo(term));
            return true;
        } catch (e) {
            console.error("Could not fetch profile info for params", { term }, e);
            setProfile(null);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        ready: true,
        loading,
        profile,
        search,
    } as const;
};
