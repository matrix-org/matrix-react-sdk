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

import { ClientEvent, MatrixClient, RoomMember, User } from "matrix-js-sdk/src/matrix";
import { useCallback, useEffect, useState } from "react";

import { useTypedEventEmitter } from "../../../../../hooks/useEventEmitter";

export function useIsIgnored(cli: MatrixClient, member: User | RoomMember): boolean {
    // Check whether the user is ignored
    const [isIgnored, setIsIgnored] = useState(cli.isUserIgnored(member.userId));
    // Recheck if the user or client changes
    useEffect(() => {
        setIsIgnored(cli.isUserIgnored(member.userId));
    }, [cli, member.userId]);
    // Recheck also if we receive new accountData m.ignored_user_list
    const accountDataHandler = useCallback(
        (ev) => {
            if (ev.getType() === "m.ignored_user_list") {
                setIsIgnored(cli.isUserIgnored(member.userId));
            }
        },
        [cli, member.userId],
    );
    useTypedEventEmitter(cli, ClientEvent.AccountData, accountDataHandler);

    return isIgnored;
}
