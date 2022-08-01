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

import { IThreepid } from "matrix-js-sdk/src/@types/threepids";
import { logger } from "matrix-js-sdk/src/logger";
import { MatrixClient } from "matrix-js-sdk/src/matrix";
import { useEffect, useState } from "react";

export const useThreePids = (cli: MatrixClient) => {
    const [threepids, setThreepids] = useState<IThreepid[]>([]);
    useEffect(() => {
        cli.getThreePids()
            .then(({ threepids }) => setThreepids(threepids))
            .catch(e => {
                const idServerUrl = cli.getIdentityServerUrl();
                logger.warn(
                    `Unable to reach identity server at ${idServerUrl} to check ` +
                    `for 3PIDs bindings in Settings`,
                );
                logger.warn(e);
            });
    }, [cli]);

    return threepids;
};
