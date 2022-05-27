/*
Copyright 2021-2022 The Matrix.org Foundation C.I.C.

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

import { WebSearch as WebSearchEvent } from "matrix-analytics-events/types/typescript/WebSearch";
import { IHierarchyRoom } from "matrix-js-sdk/src/@types/spaces";
import { Room } from "matrix-js-sdk/src/models/room";
import { normalize } from "matrix-js-sdk/src/utils";
import React, { ChangeEvent, KeyboardEvent, RefObject, useContext, useEffect, useMemo, useState } from "react";

import { KeyBindingAction } from "../../../../accessibility/KeyboardShortcuts";
import {
    findSiblingElement,
    RovingTabIndexContext,
    RovingTabIndexProvider,
    Type,
} from "../../../../accessibility/RovingTabIndex";
import { mediaFromMxc } from "../../../../customisations/Media";
import { Action } from "../../../../dispatcher/actions";
import defaultDispatcher from "../../../../dispatcher/dispatcher";
import { ViewRoomPayload } from "../../../../dispatcher/payloads/ViewRoomPayload";
import { getKeyBindingsManager } from "../../../../KeyBindingsManager";
import { _t } from "../../../../languageHandler";
import { MatrixClientPeg } from "../../../../MatrixClientPeg";
import Modal from "../../../../Modal";
import { PosthogAnalytics } from "../../../../PosthogAnalytics";
import { getCachedRoomIDForAlias } from "../../../../RoomAliasCache";
import { showStartChatInviteDialog } from "../../../../RoomInvite";
import SdkConfig from "../../../../SdkConfig";
import { SettingLevel } from "../../../../settings/SettingLevel";
import SettingsStore from "../../../../settings/SettingsStore";
import { BreadcrumbsStore } from "../../../../stores/BreadcrumbsStore";
import { RoomNotificationStateStore } from "../../../../stores/notifications/RoomNotificationStateStore";
import { RecentAlgorithm } from "../../../../stores/room-list/algorithms/tag-sorting/RecentAlgorithm";
import { RoomViewStore } from "../../../../stores/RoomViewStore";
import { getMetaSpaceName } from "../../../../stores/spaces";
import SpaceStore from "../../../../stores/spaces/SpaceStore";
import DMRoomMap from "../../../../utils/DMRoomMap";
import BaseAvatar from "../../avatars/BaseAvatar";
import DecoratedRoomAvatar from "../../avatars/DecoratedRoomAvatar";
import { BetaPill } from "../../beta/BetaCard";
import AccessibleButton from "../../elements/AccessibleButton";
import Spinner from "../../elements/Spinner";
import NotificationBadge from "../../rooms/NotificationBadge";
import BaseDialog from ".././BaseDialog";
import BetaFeedbackDialog from ".././BetaFeedbackDialog";
import { IDialogProps } from "../IDialogProps";
import { UserTab } from "../UserTab";
import { Option } from "./Option";
import { RoomResultDetails } from "./RoomResultDetails";
import { TooltipOption } from "./TooltipOption";
import { useRecentSearches } from "./useRecentSearches";
import { useSpaceResults } from "./useSpaceResults";

const MAX_RECENT_SEARCHES = 10;
const SECTION_LIMIT = 50; // only show 50 results per section for performance reasons
const AVATAR_SIZE = 24;

interface IProps extends IDialogProps {
    initialText?: string;
}

function refIsForRecentlyViewed(ref: RefObject<HTMLElement>): boolean {
    return ref.current?.id.startsWith("mx_SpotlightDialog_button_recentlyViewed_");
}

enum Section {
    People,
    Rooms,
    Spaces,
}

interface IBaseResult {
    section: Section;
    query?: string[]; // extra fields to query match, stored as lowercase
}

interface IRoomResult extends IBaseResult {
    room: Room;
}

interface IResult extends IBaseResult {
    avatar: JSX.Element;
    name: string;
    description?: string;
    onClick?(): void;
}

type Result = IRoomResult | IResult;

const isRoomResult = (result: any): result is IRoomResult => !!result?.room;

const recentAlgorithm = new RecentAlgorithm();

export const useWebSearchMetrics = (numResults: number, queryLength: number, viaSpotlight: boolean): void => {
    useEffect(() => {
        if (!queryLength) return;

        // send metrics after a 1s debounce
        const timeoutId = setTimeout(() => {
            PosthogAnalytics.instance.trackEvent<WebSearchEvent>({
                eventName: "WebSearch",
                viaSpotlight,
                numResults,
                queryLength,
            });
        }, 1000);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [numResults, queryLength, viaSpotlight]);
};

const SpotlightDialog: React.FC<IProps> = ({ initialText = "", onFinished }) => {
    const cli = MatrixClientPeg.get();
    const rovingContext = useContext(RovingTabIndexContext);
    const [query, _setQuery] = useState(initialText);
    const [recentSearches, clearRecentSearches] = useRecentSearches();

    const possibleResults = useMemo<Result[]>(() => [
        ...SpaceStore.instance.enabledMetaSpaces.map(spaceKey => ({
            section: Section.Spaces,
            avatar: (
                <div className={`mx_SpotlightDialog_metaspaceResult mx_SpotlightDialog_metaspaceResult_${spaceKey}`} />
            ),
            name: getMetaSpaceName(spaceKey, SpaceStore.instance.allRoomsInHome),
            onClick() {
                SpaceStore.instance.setActiveSpace(spaceKey);
            },
        })),
        ...cli.getVisibleRooms().filter(room => {
            // TODO we may want to put invites in their own list
            return room.getMyMembership() === "join" || room.getMyMembership() == "invite";
        }).map(room => {
            let section: Section;
            let query: string[];

            const otherUserId = DMRoomMap.shared().getUserIdForRoomId(room.roomId);
            if (otherUserId) {
                section = Section.People;
                query = [
                    otherUserId.toLowerCase(),
                    room.getMember(otherUserId)?.name.toLowerCase(),
                ].filter(Boolean);
            } else if (room.isSpaceRoom()) {
                section = Section.Spaces;
            } else {
                section = Section.Rooms;
            }

            return { room, section, query };
        }),
    ], [cli]);

    const trimmedQuery = query.trim();
    const [people, rooms, spaces] = useMemo<[Result[], Result[], Result[]] | []>(() => {
        if (!trimmedQuery) return [];

        const lcQuery = trimmedQuery.toLowerCase();
        const normalizedQuery = normalize(trimmedQuery);

        const results: [Result[], Result[], Result[]] = [[], [], []];

        // Group results in their respective sections
        possibleResults.forEach(entry => {
            if (isRoomResult(entry)) {
                if (!entry.room.normalizedName.includes(normalizedQuery) &&
                    !entry.room.getCanonicalAlias()?.toLowerCase().includes(lcQuery) &&
                    !entry.query?.some(q => q.includes(lcQuery))
                ) return; // bail, does not match query
            } else {
                if (!entry.name.toLowerCase().includes(lcQuery) &&
                    !entry.query?.some(q => q.includes(lcQuery))
                ) return; // bail, does not match query
            }

            results[entry.section].push(entry);
        });

        // Sort results by most recent activity

        const myUserId = cli.getUserId();
        for (const resultArray of results) {
            resultArray.sort((a: Result, b: Result) => {
                // This is not a room result, it should appear at the bottom of
                // the list
                if (!(b as IRoomResult).room) return -1;
                if (!(a as IRoomResult).room) return 1;

                const roomA = (a as IRoomResult).room;
                const roomB = (b as IRoomResult).room;

                return recentAlgorithm.getLastTs(roomB, myUserId) - recentAlgorithm.getLastTs(roomA, myUserId);
            });
        }

        return results;
    }, [possibleResults, trimmedQuery, cli]);

    const numResults = trimmedQuery ? people.length + rooms.length + spaces.length : 0;
    useWebSearchMetrics(numResults, query.length, true);

    const activeSpace = SpaceStore.instance.activeSpaceRoom;
    const [spaceResults, spaceResultsLoading] = useSpaceResults(activeSpace, query);

    const setQuery = (e: ChangeEvent<HTMLInputElement>): void => {
        const newQuery = e.currentTarget.value;
        _setQuery(newQuery);

        setImmediate(() => {
            // reset the activeRef when we change query for best usability
            const ref = rovingContext.state.refs[0];
            if (ref) {
                rovingContext.dispatch({
                    type: Type.SetFocus,
                    payload: { ref },
                });
                ref.current?.scrollIntoView({
                    block: "nearest",
                });
            }
        });
    };

    const viewRoom = (roomId: string, persist = false, viaKeyboard = false) => {
        if (persist) {
            const recents = new Set(SettingsStore.getValue("SpotlightSearch.recentSearches", null).reverse());
            // remove & add the room to put it at the end
            recents.delete(roomId);
            recents.add(roomId);

            SettingsStore.setValue(
                "SpotlightSearch.recentSearches",
                null,
                SettingLevel.ACCOUNT,
                Array.from(recents).reverse().slice(0, MAX_RECENT_SEARCHES),
            );
        }

        defaultDispatcher.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            room_id: roomId,
            metricsTrigger: "WebUnifiedSearch",
            metricsViaKeyboard: viaKeyboard,
        });
        onFinished();
    };

    let content: JSX.Element;
    if (trimmedQuery) {
        const resultMapper = (result: Result): JSX.Element => {
            if (isRoomResult(result)) {
                return (
                    <Option
                        id={`mx_SpotlightDialog_button_result_${result.room.roomId}`}
                        key={result.room.roomId}
                        onClick={(ev) => {
                            viewRoom(result.room.roomId, true, ev.type !== "click");
                        }}
                    >
                        <DecoratedRoomAvatar room={result.room} avatarSize={AVATAR_SIZE} tooltipProps={{ tabIndex: -1 }} />
                        { result.room.name }
                        <NotificationBadge notification={RoomNotificationStateStore.instance.getRoomState(result.room)} />
                        <RoomResultDetails room={result.room} />
                    </Option>
                );
            }

            // IResult case
            return (
                <Option
                    id={`mx_SpotlightDialog_button_result_${result.name}`}
                    key={result.name}
                    onClick={result.onClick}
                >
                    { result.avatar }
                    { result.name }
                    { result.description }
                </Option>
            );
        };

        let peopleSection: JSX.Element;
        if (people.length) {
            peopleSection = <div className="mx_SpotlightDialog_section mx_SpotlightDialog_results" role="group">
                <h4>{ _t("People") }</h4>
                <div>
                    { people.slice(0, SECTION_LIMIT).map(resultMapper) }
                </div>
            </div>;
        }

        let roomsSection: JSX.Element;
        if (rooms.length) {
            roomsSection = <div className="mx_SpotlightDialog_section mx_SpotlightDialog_results" role="group">
                <h4>{ _t("Rooms") }</h4>
                <div>
                    { rooms.slice(0, SECTION_LIMIT).map(resultMapper) }
                </div>
            </div>;
        }

        let spacesSection: JSX.Element;
        if (spaces.length) {
            spacesSection = <div className="mx_SpotlightDialog_section mx_SpotlightDialog_results" role="group">
                <h4>{ _t("Spaces you're in") }</h4>
                <div>
                    { spaces.slice(0, SECTION_LIMIT).map(resultMapper) }
                </div>
            </div>;
        }

        let spaceRoomsSection: JSX.Element;
        if (spaceResults.length) {
            spaceRoomsSection = <div className="mx_SpotlightDialog_section mx_SpotlightDialog_results" role="group">
                <h4>{ _t("Other rooms in %(spaceName)s", { spaceName: activeSpace.name }) }</h4>
                <div>
                    { spaceResults.slice(0, SECTION_LIMIT).map((room: IHierarchyRoom): JSX.Element => (
                        <Option
                            id={`mx_SpotlightDialog_button_result_${room.room_id}`}
                            key={room.room_id}
                            onClick={(ev) => {
                                viewRoom(room.room_id, true, ev.type !== "click");
                            }}
                        >
                            <BaseAvatar
                                name={room.name}
                                idName={room.room_id}
                                url={room.avatar_url
                                    ? mediaFromMxc(room.avatar_url).getSquareThumbnailHttp(AVATAR_SIZE)
                                    : null
                                }
                                width={AVATAR_SIZE}
                                height={AVATAR_SIZE}
                            />
                            { room.name || room.canonical_alias }
                            { room.name && room.canonical_alias && <div className="mx_SpotlightDialog_result_details">
                                { room.canonical_alias }
                            </div> }
                        </Option>
                    )) }
                    { spaceResultsLoading && <Spinner /> }
                </div>
            </div>;
        }

        let joinRoomSection: JSX.Element;
        if (trimmedQuery.startsWith("#") &&
            trimmedQuery.includes(":") &&
            (!getCachedRoomIDForAlias(trimmedQuery) || !cli.getRoom(getCachedRoomIDForAlias(trimmedQuery)))
        ) {
            joinRoomSection = <div className="mx_SpotlightDialog_section mx_SpotlightDialog_otherSearches" role="group">
                <div>
                    <Option
                        id="mx_SpotlightDialog_button_joinRoomAlias"
                        className="mx_SpotlightDialog_joinRoomAlias"
                        onClick={(ev) => {
                            defaultDispatcher.dispatch<ViewRoomPayload>({
                                action: Action.ViewRoom,
                                room_alias: trimmedQuery,
                                auto_join: true,
                                metricsTrigger: "WebUnifiedSearch",
                                metricsViaKeyboard: ev.type !== "click",
                            });
                            onFinished();
                        }}
                    >
                        { _t("Join %(roomAddress)s", {
                            roomAddress: trimmedQuery,
                        }) }
                    </Option>
                </div>
            </div>;
        }

        content = <>
            { peopleSection }
            { roomsSection }
            { spacesSection }
            { spaceRoomsSection }
            { joinRoomSection }
            <div className="mx_SpotlightDialog_section mx_SpotlightDialog_otherSearches" role="group">
                <h4>{ _t('Use "%(query)s" to search', { query }) }</h4>
                <div>
                    <Option
                        id="mx_SpotlightDialog_button_explorePublicRooms"
                        className="mx_SpotlightDialog_explorePublicRooms"
                        onClick={() => {
                            defaultDispatcher.dispatch({
                                action: Action.ViewRoomDirectory,
                                initialText: query,
                            });
                            onFinished();
                        }}
                    >
                        { _t("Public rooms") }
                    </Option>
                    <Option
                        id="mx_SpotlightDialog_button_startChat"
                        className="mx_SpotlightDialog_startChat"
                        onClick={() => {
                            showStartChatInviteDialog(query);
                            onFinished();
                        }}
                    >
                        { _t("People") }
                    </Option>
                </div>
            </div>
            <div className="mx_SpotlightDialog_section mx_SpotlightDialog_otherSearches" role="group">
                <h4>{ _t("Other searches") }</h4>
                <div className="mx_SpotlightDialog_otherSearches_messageSearchText">
                    { _t("To search messages, look for this icon at the top of a room <icon/>", {}, {
                        icon: () => <div className="mx_SpotlightDialog_otherSearches_messageSearchIcon" />,
                    }) }
                </div>
            </div>
        </>;
    } else {
        let recentSearchesSection: JSX.Element;
        if (recentSearches.length) {
            recentSearchesSection = (
                <div
                    className="mx_SpotlightDialog_section mx_SpotlightDialog_recentSearches"
                    role="group"
                    // Firefox sometimes makes this element focusable due to overflow,
                    // so force it out of tab order by default.
                    tabIndex={-1}
                >
                    <h4>
                        { _t("Recent searches") }
                        <AccessibleButton kind="link" onClick={clearRecentSearches}>
                            { _t("Clear") }
                        </AccessibleButton>
                    </h4>
                    <div>
                        { recentSearches.map(room => (
                            <Option
                                id={`mx_SpotlightDialog_button_recentSearch_${room.roomId}`}
                                key={room.roomId}
                                onClick={(ev) => {
                                    viewRoom(room.roomId, true, ev.type !== "click");
                                }}
                            >
                                <DecoratedRoomAvatar room={room} avatarSize={AVATAR_SIZE} tooltipProps={{ tabIndex: -1 }} />
                                { room.name }
                                <NotificationBadge notification={RoomNotificationStateStore.instance.getRoomState(room)} />
                                <RoomResultDetails room={room} />
                            </Option>
                        )) }
                    </div>
                </div>
            );
        }

        content = <>
            <div className="mx_SpotlightDialog_section mx_SpotlightDialog_recentlyViewed" role="group">
                <h4>{ _t("Recently viewed") }</h4>
                <div>
                    { BreadcrumbsStore.instance.rooms
                        .filter(r => r.roomId !== RoomViewStore.instance.getRoomId())
                        .map(room => (
                            <TooltipOption
                                id={`mx_SpotlightDialog_button_recentlyViewed_${room.roomId}`}
                                title={room.name}
                                key={room.roomId}
                                onClick={(ev) => {
                                    viewRoom(room.roomId, false, ev.type !== "click");
                                }}
                            >
                                <DecoratedRoomAvatar room={room} avatarSize={32} tooltipProps={{ tabIndex: -1 }} />
                                { room.name }
                            </TooltipOption>
                        ))
                    }
                </div>
            </div>

            { recentSearchesSection }

            <div className="mx_SpotlightDialog_section mx_SpotlightDialog_otherSearches" role="group">
                <h4>{ _t("Other searches") }</h4>
                <div>
                    <Option
                        id="mx_SpotlightDialog_button_explorePublicRooms"
                        className="mx_SpotlightDialog_explorePublicRooms"
                        onClick={() => {
                            defaultDispatcher.fire(Action.ViewRoomDirectory);
                            onFinished();
                        }}
                    >
                        { _t("Explore public rooms") }
                    </Option>
                </div>
            </div>
        </>;
    }

    const onDialogKeyDown = (ev: KeyboardEvent) => {
        const navigationAction = getKeyBindingsManager().getNavigationAction(ev);
        switch (navigationAction) {
            case KeyBindingAction.FilterRooms:
                ev.stopPropagation();
                ev.preventDefault();
                onFinished();
                break;
        }

        const accessibilityAction = getKeyBindingsManager().getAccessibilityAction(ev);
        switch (accessibilityAction) {
            case KeyBindingAction.Escape:
                ev.stopPropagation();
                ev.preventDefault();
                onFinished();
                break;
        }
    };

    const onKeyDown = (ev: KeyboardEvent) => {
        let ref: RefObject<HTMLElement>;

        const action = getKeyBindingsManager().getAccessibilityAction(ev);

        switch (action) {
            case KeyBindingAction.ArrowUp:
            case KeyBindingAction.ArrowDown:
                ev.stopPropagation();
                ev.preventDefault();

                if (rovingContext.state.refs.length > 0) {
                    let refs = rovingContext.state.refs;
                    if (!query) {
                        // If the current selection is not in the recently viewed row then only include the
                        // first recently viewed so that is the target when the user is switching into recently viewed.
                        const keptRecentlyViewedRef = refIsForRecentlyViewed(rovingContext.state.activeRef)
                            ? rovingContext.state.activeRef
                            : refs.find(refIsForRecentlyViewed);
                        // exclude all other recently viewed items from the list so up/down arrows skip them
                        refs = refs.filter(ref => ref === keptRecentlyViewedRef || !refIsForRecentlyViewed(ref));
                    }

                    const idx = refs.indexOf(rovingContext.state.activeRef);
                    ref = findSiblingElement(refs, idx + (action === KeyBindingAction.ArrowUp ? -1 : 1));
                }
                break;

            case KeyBindingAction.ArrowLeft:
            case KeyBindingAction.ArrowRight:
                // only handle these keys when we are in the recently viewed row of options
                if (!query &&
                    rovingContext.state.refs.length > 0 &&
                    refIsForRecentlyViewed(rovingContext.state.activeRef)
                ) {
                    // we only intercept left/right arrows when the field is empty, and they'd do nothing anyway
                    ev.stopPropagation();
                    ev.preventDefault();

                    const refs = rovingContext.state.refs.filter(refIsForRecentlyViewed);
                    const idx = refs.indexOf(rovingContext.state.activeRef);
                    ref = findSiblingElement(refs, idx + (action === KeyBindingAction.ArrowLeft ? -1 : 1));
                }
                break;
            case KeyBindingAction.Enter:
                ev.stopPropagation();
                ev.preventDefault();
                rovingContext.state.activeRef?.current?.click();
                break;
        }

        if (ref) {
            rovingContext.dispatch({
                type: Type.SetFocus,
                payload: { ref },
            });
            ref.current?.scrollIntoView({
                block: "nearest",
            });
        }
    };

    const openFeedback = SdkConfig.get().bug_report_endpoint_url ? () => {
        Modal.createTrackedDialog("Spotlight Feedback", "feature_spotlight", BetaFeedbackDialog, {
            featureId: "feature_spotlight",
        });
    } : null;

    const activeDescendant = rovingContext.state.activeRef?.current?.id;

    return <>
        <div id="mx_SpotlightDialog_keyboardPrompt">
            { _t("Use <arrows/> to scroll", {}, {
                arrows: () => <>
                    <div>↓</div>
                    <div>↑</div>
                    { !query && <div>←</div> }
                    { !query && <div>→</div> }
                </>,
            }) }
        </div>

        <BaseDialog
            className="mx_SpotlightDialog"
            onFinished={onFinished}
            hasCancel={false}
            onKeyDown={onDialogKeyDown}
            screenName="UnifiedSearch"
            aria-label={_t("Search Dialog")}
        >
            <div className="mx_SpotlightDialog_searchBox mx_textinput">
                <input
                    autoFocus
                    type="text"
                    autoComplete="off"
                    placeholder={_t("Search")}
                    value={query}
                    onChange={setQuery}
                    onKeyDown={onKeyDown}
                    aria-owns="mx_SpotlightDialog_content"
                    aria-activedescendant={activeDescendant}
                    aria-label={_t("Search")}
                    aria-describedby="mx_SpotlightDialog_keyboardPrompt"
                />
            </div>

            <div
                id="mx_SpotlightDialog_content"
                role="listbox"
                aria-activedescendant={activeDescendant}
                aria-describedby="mx_SpotlightDialog_keyboardPrompt"
            >
                { content }
            </div>

            <div className="mx_SpotlightDialog_footer">
                <BetaPill onClick={() => {
                    defaultDispatcher.dispatch({
                        action: Action.ViewUserSettings,
                        initialTabId: UserTab.Labs,
                    });
                    onFinished();
                }} />
                { openFeedback && _t("Results not as expected? Please <a>give feedback</a>.", {}, {
                    a: sub => <AccessibleButton kind="link_inline" onClick={openFeedback}>
                        { sub }
                    </AccessibleButton>,
                }) }
                { openFeedback && <AccessibleButton
                    kind="primary_outline"
                    onClick={openFeedback}
                >
                    { _t("Feedback") }
                </AccessibleButton> }
            </div>
        </BaseDialog>
    </>;
};

const RovingSpotlightDialog: React.FC<IProps> = (props) => {
    return <RovingTabIndexProvider>
        { () => <SpotlightDialog {...props} /> }
    </RovingTabIndexProvider>;
};

export default RovingSpotlightDialog;
