/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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
import classNames from "classnames";
import { MatrixEvent, Poll } from "matrix-js-sdk/src/matrix";

import { _t } from "../../../../languageHandler";
import { FilterTabGroup } from "../../elements/FilterTabGroup";
import InlineSpinner from "../../elements/InlineSpinner";
import { PollHistoryFilter } from "./types";
import { PollListItem } from "./PollListItem";
import { PollListItemEnded } from "./PollListItemEnded";
import AccessibleButton from "../../elements/AccessibleButton";

const LoadingPolls: React.FC<{ noResultsYet?: boolean }> = ({ noResultsYet }) => (
    <div
        className={classNames("mx_PollHistoryList_loading", {
            mx_PollHistoryList_noResultsYet: noResultsYet,
        })}
    >
        <InlineSpinner />
        {_t("Loading polls")}
    </div>
);

const LoadMorePolls: React.FC<{ loadMorePolls?: () => void, isLoading: boolean }> = ({ isLoading, loadMorePolls }) =>
    loadMorePolls ? (
        <AccessibleButton className="mx_PollHistoryList_loadMorePolls" kind="link_inline" onClick={() => loadMorePolls()}>
            {_t("Load more polls")}
            { isLoading && <InlineSpinner /> }
        </AccessibleButton>
    ) : null;

const NoResults: React.FC<{
    filter: PollHistoryFilter;
    oldestEventTimestamp?: number;
    loadMorePolls?: () => void;
    isLoading?: boolean;
}> = ({
    filter, isLoading, loadMorePolls
}) => {
    // we can't page the timeline anymore
    if (!loadMorePolls) {
        if (isLoading) {
            return <LoadingPolls noResultsYet />;
        }
        return <span className="mx_PollHistoryList_noResults">
                    {filter === "ACTIVE"
                        ? _t("There are no active polls in this room")
                        : _t("There are no past polls in this room")}
                </span>
    }

    return <span className="mx_PollHistoryList_noResults">
                    {filter === "ACTIVE"
                        ? _t("There are no active polls in this room")
                        : _t("There are no past polls in this room")}

                        <LoadMorePolls loadMorePolls={loadMorePolls} isLoading={isLoading} />
                </span>

// There are no past polls for the past X days. Load more polls to view polls for previous months


};



type PollHistoryListProps = {
    pollStartEvents: MatrixEvent[];
    polls: Map<string, Poll>;
    filter: PollHistoryFilter;
    onFilterChange: (filter: PollHistoryFilter) => void;
    loadMorePolls?: () => void;
    isLoading?: boolean;
};
export const PollHistoryList: React.FC<PollHistoryListProps> = ({
    pollStartEvents,
    polls,
    filter,
    isLoading,
    onFilterChange,
    loadMorePolls,
}) => {
    return (
        <div className="mx_PollHistoryList">
            <FilterTabGroup<PollHistoryFilter>
                name="PollHistoryDialog_filter"
                value={filter}
                onFilterChange={onFilterChange}
                tabs={[
                    { id: "ACTIVE", label: "Active polls" },
                    { id: "ENDED", label: "Past polls" },
                ]}
            />
            {!!pollStartEvents.length && (
                <ol className={classNames("mx_PollHistoryList_list", `mx_PollHistoryList_list_${filter}`)}>
                    {pollStartEvents.map((pollStartEvent) =>
                        filter === "ACTIVE" ? (
                            <PollListItem key={pollStartEvent.getId()!} event={pollStartEvent} />
                        ) : (
                            <PollListItemEnded
                                key={pollStartEvent.getId()!}
                                event={pollStartEvent}
                                poll={polls.get(pollStartEvent.getId()!)!}
                            />
                        ),
                    )}
                    {isLoading && !loadMorePolls && <LoadingPolls />}
                    {!!loadMorePolls && <LoadMorePolls loadMorePolls={loadMorePolls} isLoading={isLoading} />}
                </ol>
            )}
            {!pollStartEvents.length && <NoResults 
                isLoading={isLoading}
                filter={filter}
                loadMorePolls={loadMorePolls}
                />}
        </div>
    );
};
