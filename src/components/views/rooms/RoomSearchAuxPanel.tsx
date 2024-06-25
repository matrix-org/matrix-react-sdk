/*
Copyright 2024 The Matrix.org Foundation C.I.C.

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

import React from "react";
import { Icon as SearchIcon } from "@vector-im/compound-design-tokens/icons/search.svg";
import { Icon as CloseIcon } from "@vector-im/compound-design-tokens/icons/close.svg";
import { IconButton, Link } from "@vector-im/compound-web";

import { _t } from "../../../languageHandler";
import { PosthogScreenTracker } from "../../../PosthogTrackers";
import SearchWarning, { WarningKind } from "../elements/SearchWarning";
import { SearchInfo, SearchScope } from "../../../Searching";

interface Props {
    searchInfo?: SearchInfo;
    isRoomEncrypted: boolean;
    onSearchScopeChange(scope: SearchScope): void;
    onCancelClick(): void;
}

const RoomSearchAuxPanel: React.FC<Props> = ({ searchInfo, isRoomEncrypted, onSearchScopeChange, onCancelClick }) => {
    const scope = searchInfo?.scope ?? SearchScope.Room;

    return (
        <>
            <PosthogScreenTracker screenName="RoomSearch" />
            <div className="mx_RoomSearchAuxPanel">
                <div className="mx_RoomSearchAuxPanel_resultCount">
                    <SearchIcon width="24px" height="24px" />
                    {searchInfo
                        ? _t("room|search|summary", { count: searchInfo.count ?? 0, query: searchInfo.term })
                        : undefined}
                </div>
                <div className="mx_RoomSearchAuxPanel_buttons">
                    <Link
                        onClick={() =>
                            onSearchScopeChange(scope === SearchScope.Room ? SearchScope.All : SearchScope.Room)
                        }
                        kind="primary"
                    >
                        {scope === SearchScope.All
                            ? _t("room|search|this_room_button")
                            : _t("room|search|all_rooms_button")}
                    </Link>
                    <IconButton onClick={onCancelClick} destructive tooltip={_t("action|cancel")}>
                        <CloseIcon width="20px" height="20px" />
                    </IconButton>
                </div>
            </div>
            <SearchWarning isRoomEncrypted={isRoomEncrypted} kind={WarningKind.Search} />
        </>
    );
};

export default RoomSearchAuxPanel;
