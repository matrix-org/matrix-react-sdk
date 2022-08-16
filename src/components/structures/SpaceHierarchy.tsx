/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import React, {
    Dispatch,
    KeyboardEvent,
    KeyboardEventHandler,
    ReactElement,
    ReactNode,
    SetStateAction,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Room, RoomEvent } from "matrix-js-sdk/src/models/room";
import { RoomHierarchy } from "matrix-js-sdk/src/room-hierarchy";
import { EventType, RoomType } from "matrix-js-sdk/src/@types/event";
import { IHierarchyRelation, IHierarchyRoom } from "matrix-js-sdk/src/@types/spaces";
import { MatrixClient } from "matrix-js-sdk/src/matrix";
import classNames from "classnames";
import { sortBy, uniqBy } from "lodash";
import { GuestAccess, HistoryVisibility } from "matrix-js-sdk/src/@types/partials";

import defaultDispatcher from "../../dispatcher/dispatcher";
import { _t } from "../../languageHandler";
import AccessibleButton, { ButtonEvent } from "../views/elements/AccessibleButton";
import Spinner from "../views/elements/Spinner";
import SearchBox from "./SearchBox";
import RoomAvatar from "../views/avatars/RoomAvatar";
import StyledCheckbox from "../views/elements/StyledCheckbox";
import BaseAvatar from "../views/avatars/BaseAvatar";
import { mediaFromMxc } from "../../customisations/Media";
import InfoTooltip from "../views/elements/InfoTooltip";
import TextWithTooltip from "../views/elements/TextWithTooltip";
import { useStateToggle } from "../../hooks/useStateToggle";
import { getChildOrder } from "../../stores/spaces/SpaceStore";
import AccessibleTooltipButton from "../views/elements/AccessibleTooltipButton";
import { linkifyElement, topicToHtml } from "../../HtmlUtils";
import { useDispatcher } from "../../hooks/useDispatcher";
import { Action } from "../../dispatcher/actions";
import { IState, RovingTabIndexProvider, useRovingTabIndex } from "../../accessibility/RovingTabIndex";
import { getDisplayAliasForRoom } from "./RoomDirectory";
import MatrixClientContext from "../../contexts/MatrixClientContext";
import { useTypedEventEmitterState } from "../../hooks/useEventEmitter";
import { IOOBData } from "../../stores/ThreepidInviteStore";
import { awaitRoomDownSync } from "../../utils/RoomUpgrade";
import { RoomViewStore } from "../../stores/RoomViewStore";
import { ViewRoomPayload } from "../../dispatcher/payloads/ViewRoomPayload";
import { JoinRoomReadyPayload } from "../../dispatcher/payloads/JoinRoomReadyPayload";
import { KeyBindingAction } from "../../accessibility/KeyboardShortcuts";
import { getKeyBindingsManager } from "../../KeyBindingsManager";
import { Alignment } from "../views/elements/Tooltip";
import { getTopic } from "../../hooks/room/useTopic";

interface IProps {
    space: Room;
    initialText?: string;
    additionalButtons?: ReactNode;
    showRoom(cli: MatrixClient, hierarchy: RoomHierarchy, roomId: string, roomType?: RoomType): void;
}

interface ITileProps {
    room: IHierarchyRoom;
    suggested?: boolean;
    selected?: boolean;
    numChildRooms?: number;
    hasPermissions?: boolean;
    onViewRoomClick(): void;
    onJoinRoomClick(): Promise<unknown>;
    onToggleClick?(): void;
}

const Tile: React.FC<ITileProps> = ({
    room,
    suggested,
    selected,
    hasPermissions,
    onToggleClick,
    onViewRoomClick,
    onJoinRoomClick,
    numChildRooms,
    children,
}) => {
    const cli = useContext(MatrixClientContext);
    const [joinedRoom, setJoinedRoom] = useState<Room>(() => {
        const cliRoom = cli.getRoom(room.room_id);
        return cliRoom?.getMyMembership() === "join" ? cliRoom : null;
    });
    const joinedRoomName = useTypedEventEmitterState(joinedRoom, RoomEvent.Name, room => room?.name);
    const name = joinedRoomName || room.name || room.canonical_alias || room.aliases?.[0]
        || (room.room_type === RoomType.Space ? _t("Unnamed Space") : _t("Unnamed Room"));

    const [showChildren, toggleShowChildren] = useStateToggle(true);
    const [onFocus, isActive, ref] = useRovingTabIndex();
    const [busy, setBusy] = useState(false);

    const onPreviewClick = (ev: ButtonEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        onViewRoomClick();
    };
    const onJoinClick = async (ev: ButtonEvent) => {
        setBusy(true);
        ev.preventDefault();
        ev.stopPropagation();
        onJoinRoomClick().then(() => awaitRoomDownSync(cli, room.room_id)).then(setJoinedRoom).finally(() => {
            setBusy(false);
        });
    };

    let button: ReactElement;
    if (busy) {
        button = <AccessibleTooltipButton
            disabled={true}
            onClick={onJoinClick}
            kind="primary_outline"
            onFocus={onFocus}
            tabIndex={isActive ? 0 : -1}
            title={_t("Joining")}
        >
            <Spinner w={24} h={24} />
        </AccessibleTooltipButton>;
    } else if (joinedRoom) {
        button = <AccessibleButton
            onClick={onPreviewClick}
            kind="primary_outline"
            onFocus={onFocus}
            tabIndex={isActive ? 0 : -1}
        >
            { _t("View") }
        </AccessibleButton>;
    } else {
        button = <AccessibleButton
            onClick={onJoinClick}
            kind="primary"
            onFocus={onFocus}
            tabIndex={isActive ? 0 : -1}
        >
            { _t("Join") }
        </AccessibleButton>;
    }

    let checkbox: ReactElement | undefined;
    if (onToggleClick) {
        if (hasPermissions) {
            checkbox = <StyledCheckbox checked={!!selected} onChange={onToggleClick} tabIndex={isActive ? 0 : -1} />;
        } else {
            checkbox = <TextWithTooltip
                tooltip={_t("You don't have permission")}
                onClick={ev => { ev.stopPropagation(); }}
            >
                <StyledCheckbox disabled={true} tabIndex={isActive ? 0 : -1} />
            </TextWithTooltip>;
        }
    }

    let avatar: ReactElement;
    if (joinedRoom) {
        avatar = <RoomAvatar room={joinedRoom} width={20} height={20} />;
    } else {
        avatar = <BaseAvatar
            name={name}
            idName={room.room_id}
            url={room.avatar_url ? mediaFromMxc(room.avatar_url).getSquareThumbnailHttp(20) : null}
            width={20}
            height={20}
        />;
    }

    let description = _t("%(count)s members", { count: room.num_joined_members });
    if (numChildRooms !== undefined) {
        description += " · " + _t("%(count)s rooms", { count: numChildRooms });
    }

    let topic: ReactNode | string | null;
    if (joinedRoom) {
        const topicObj = getTopic(joinedRoom);
        topic = topicToHtml(topicObj?.text, topicObj?.html);
    } else {
        topic = room.topic;
    }

    let joinedSection: ReactElement | undefined;
    if (joinedRoom) {
        joinedSection = <div className="mx_SpaceHierarchy_roomTile_joined">
            { _t("Joined") }
        </div>;
    }

    let suggestedSection: ReactElement | undefined;
    if (suggested && (!joinedRoom || hasPermissions)) {
        suggestedSection = <InfoTooltip tooltip={_t("This room is suggested as a good one to join")}>
            { _t("Suggested") }
        </InfoTooltip>;
    }

    const content = <React.Fragment>
        <div className="mx_SpaceHierarchy_roomTile_item">
            <div className="mx_SpaceHierarchy_roomTile_avatar">
                { avatar }
            </div>
            <div className="mx_SpaceHierarchy_roomTile_name">
                { name }
                { joinedSection }
                { suggestedSection }
            </div>
            <div
                className="mx_SpaceHierarchy_roomTile_info"
                ref={e => e && linkifyElement(e)}
                onClick={ev => {
                    // prevent clicks on links from bubbling up to the room tile
                    if ((ev.target as HTMLElement).tagName === "A") {
                        ev.stopPropagation();
                    }
                }}
            >
                { description }
                { topic && " · " }
                { topic }
            </div>
        </div>
        <div className="mx_SpaceHierarchy_actions">
            { button }
            { checkbox }
        </div>
    </React.Fragment>;

    let childToggle: JSX.Element;
    let childSection: JSX.Element;
    let onKeyDown: KeyboardEventHandler;
    if (children) {
        // the chevron is purposefully a div rather than a button as it should be ignored for a11y
        childToggle = <div
            className={classNames("mx_SpaceHierarchy_subspace_toggle", {
                mx_SpaceHierarchy_subspace_toggle_shown: showChildren,
            })}
            onClick={ev => {
                ev.stopPropagation();
                toggleShowChildren();
            }}
        />;

        if (showChildren) {
            const onChildrenKeyDown = (e) => {
                const action = getKeyBindingsManager().getAccessibilityAction(e);
                switch (action) {
                    case KeyBindingAction.ArrowLeft:
                        e.preventDefault();
                        e.stopPropagation();
                        ref.current?.focus();
                        break;
                }
            };

            childSection = <div
                className="mx_SpaceHierarchy_subspace_children"
                onKeyDown={onChildrenKeyDown}
                role="group"
            >
                { children }
            </div>;
        }

        onKeyDown = (e) => {
            let handled = false;

            const action = getKeyBindingsManager().getAccessibilityAction(e);
            switch (action) {
                case KeyBindingAction.ArrowLeft:
                    if (showChildren) {
                        handled = true;
                        toggleShowChildren();
                    }
                    break;

                case KeyBindingAction.ArrowRight:
                    handled = true;
                    if (showChildren) {
                        const childSection = ref.current?.nextElementSibling;
                        childSection?.querySelector<HTMLDivElement>(".mx_SpaceHierarchy_roomTile")?.focus();
                    } else {
                        toggleShowChildren();
                    }
                    break;
            }

            if (handled) {
                e.preventDefault();
                e.stopPropagation();
            }
        };
    }

    return <li
        className="mx_SpaceHierarchy_roomTileWrapper"
        role="treeitem"
        aria-expanded={children ? showChildren : undefined}
    >
        <AccessibleButton
            className={classNames("mx_SpaceHierarchy_roomTile", {
                mx_SpaceHierarchy_subspace: room.room_type === RoomType.Space,
                mx_SpaceHierarchy_joining: busy,
            })}
            onClick={(hasPermissions && onToggleClick) ? onToggleClick : onPreviewClick}
            onKeyDown={onKeyDown}
            inputRef={ref}
            onFocus={onFocus}
            tabIndex={isActive ? 0 : -1}
        >
            { content }
            { childToggle }
        </AccessibleButton>
        { childSection }
    </li>;
};

export const showRoom = (cli: MatrixClient, hierarchy: RoomHierarchy, roomId: string, roomType?: RoomType): void => {
    const room = hierarchy.roomMap.get(roomId);

    // Don't let the user view a room they won't be able to either peek or join:
    // fail earlier so they don't have to click back to the directory.
    if (cli.isGuest()) {
        if (!room.world_readable && !room.guest_can_join) {
            defaultDispatcher.dispatch({ action: "require_registration" });
            return;
        }
    }

    const roomAlias = getDisplayAliasForRoom(room) || undefined;
    defaultDispatcher.dispatch<ViewRoomPayload>({
        action: Action.ViewRoom,
        should_peek: true,
        room_alias: roomAlias,
        room_id: room.room_id,
        via_servers: Array.from(hierarchy.viaMap.get(roomId) || []),
        oob_data: {
            avatarUrl: room.avatar_url,
            // XXX: This logic is duplicated from the JS SDK which would normally decide what the name is.
            name: room.name || roomAlias || _t("Unnamed room"),
            roomType,
        } as IOOBData,
        metricsTrigger: "RoomDirectory",
    });
};

export const joinRoom = (cli: MatrixClient, hierarchy: RoomHierarchy, roomId: string): Promise<unknown> => {
    // Don't let the user view a room they won't be able to either peek or join:
    // fail earlier so they don't have to click back to the directory.
    if (cli.isGuest()) {
        defaultDispatcher.dispatch({ action: "require_registration" });
        return;
    }

    const prom = cli.joinRoom(roomId, {
        viaServers: Array.from(hierarchy.viaMap.get(roomId) || []),
    });

    prom.then(() => {
        defaultDispatcher.dispatch<JoinRoomReadyPayload>({
            action: Action.JoinRoomReady,
            roomId,
            metricsTrigger: "SpaceHierarchy",
        });
    }, err => {
        RoomViewStore.instance.showJoinRoomError(err, roomId);
    });

    return prom;
};

interface IHierarchyLevelProps {
    root: IHierarchyRoom;
    roomSet: Set<IHierarchyRoom>;
    hierarchy: RoomHierarchy;
    parents: Set<string>;
    selectedMap?: Map<string, Set<string>>;
    onViewRoomClick(roomId: string, roomType?: RoomType): void;
    onJoinRoomClick(roomId: string): Promise<unknown>;
    onToggleClick?(parentId: string, childId: string): void;
}

const toLocalRoom = (cli: MatrixClient, room: IHierarchyRoom): IHierarchyRoom => {
    const history = cli.getRoomUpgradeHistory(room.room_id, true);
    const cliRoom = history[history.length - 1];
    if (cliRoom) {
        return {
            ...room,
            room_id: cliRoom.roomId,
            room_type: cliRoom.getType(),
            name: cliRoom.name,
            topic: cliRoom.currentState.getStateEvents(EventType.RoomTopic, "")?.getContent().topic,
            avatar_url: cliRoom.getMxcAvatarUrl(),
            canonical_alias: cliRoom.getCanonicalAlias(),
            aliases: cliRoom.getAltAliases(),
            world_readable: cliRoom.currentState.getStateEvents(EventType.RoomHistoryVisibility, "")?.getContent()
                .history_visibility === HistoryVisibility.WorldReadable,
            guest_can_join: cliRoom.currentState.getStateEvents(EventType.RoomGuestAccess, "")?.getContent()
                .guest_access === GuestAccess.CanJoin,
            num_joined_members: cliRoom.getJoinedMemberCount(),
        };
    }

    return room;
};

export const HierarchyLevel = ({
    root,
    roomSet,
    hierarchy,
    parents,
    selectedMap,
    onViewRoomClick,
    onJoinRoomClick,
    onToggleClick,
}: IHierarchyLevelProps) => {
    const cli = useContext(MatrixClientContext);
    const space = cli.getRoom(root.room_id);
    const hasPermissions = space?.currentState.maySendStateEvent(EventType.SpaceChild, cli.getUserId());

    const sortedChildren = sortBy(root.children_state, ev => {
        return getChildOrder(ev.content.order, ev.origin_server_ts, ev.state_key);
    });

    const [subspaces, childRooms] = sortedChildren.reduce((result, ev: IHierarchyRelation) => {
        const room = hierarchy.roomMap.get(ev.state_key);
        if (room && roomSet.has(room)) {
            result[room.room_type === RoomType.Space ? 0 : 1].push(toLocalRoom(cli, room));
        }
        return result;
    }, [[] as IHierarchyRoom[], [] as IHierarchyRoom[]]);

    const newParents = new Set(parents).add(root.room_id);
    return <React.Fragment>
        {
            uniqBy(childRooms, "room_id").map(room => (
                <Tile
                    key={room.room_id}
                    room={room}
                    suggested={hierarchy.isSuggested(root.room_id, room.room_id)}
                    selected={selectedMap?.get(root.room_id)?.has(room.room_id)}
                    onViewRoomClick={() => onViewRoomClick(room.room_id, room.room_type as RoomType)}
                    onJoinRoomClick={() => onJoinRoomClick(room.room_id)}
                    hasPermissions={hasPermissions}
                    onToggleClick={onToggleClick ? () => onToggleClick(root.room_id, room.room_id) : undefined}
                />
            ))
        }

        {
            subspaces.filter(room => !newParents.has(room.room_id)).map(space => (
                <Tile
                    key={space.room_id}
                    room={space}
                    numChildRooms={space.children_state.filter(ev => {
                        const room = hierarchy.roomMap.get(ev.state_key);
                        return room && roomSet.has(room) && !room.room_type;
                    }).length}
                    suggested={hierarchy.isSuggested(root.room_id, space.room_id)}
                    selected={selectedMap?.get(root.room_id)?.has(space.room_id)}
                    onViewRoomClick={() => onViewRoomClick(space.room_id, RoomType.Space)}
                    onJoinRoomClick={() => onJoinRoomClick(space.room_id)}
                    hasPermissions={hasPermissions}
                    onToggleClick={onToggleClick ? () => onToggleClick(root.room_id, space.room_id) : undefined}
                >
                    <HierarchyLevel
                        root={space}
                        roomSet={roomSet}
                        hierarchy={hierarchy}
                        parents={newParents}
                        selectedMap={selectedMap}
                        onViewRoomClick={onViewRoomClick}
                        onJoinRoomClick={onJoinRoomClick}
                        onToggleClick={onToggleClick}
                    />
                </Tile>
            ))
        }
    </React.Fragment>;
};

const INITIAL_PAGE_SIZE = 20;

export const useRoomHierarchy = (space: Room): {
    loading: boolean;
    rooms?: IHierarchyRoom[];
    hierarchy: RoomHierarchy;
    error: Error;
    loadMore(pageSize?: number): Promise<void>;
} => {
    const [rooms, setRooms] = useState<IHierarchyRoom[]>([]);
    const [roomHierarchy, setHierarchy] = useState<RoomHierarchy>();
    const [error, setError] = useState<Error | undefined>();

    const resetHierarchy = useCallback(() => {
        setError(undefined);
        const hierarchy = new RoomHierarchy(space, INITIAL_PAGE_SIZE);
        hierarchy.load().then(() => {
            if (space !== hierarchy.root) return; // discard stale results
            setRooms(hierarchy.rooms);
        }, setError);
        setHierarchy(hierarchy);
    }, [space]);
    useEffect(resetHierarchy, [resetHierarchy]);

    useDispatcher(defaultDispatcher, (payload => {
        if (payload.action === Action.UpdateSpaceHierarchy) {
            setRooms([]); // TODO
            resetHierarchy();
        }
    }));

    const loadMore = useCallback(async (pageSize?: number) => {
        if (roomHierarchy.loading || !roomHierarchy.canLoadMore || roomHierarchy.noSupport || error) return;
        await roomHierarchy.load(pageSize).catch(setError);
        setRooms(roomHierarchy.rooms);
    }, [error, roomHierarchy]);

    // Only return the hierarchy if it is for the space requested
    let hierarchy = roomHierarchy;
    if (hierarchy?.root !== space) {
        hierarchy = undefined;
    }

    return {
        loading: hierarchy?.loading ?? true,
        rooms,
        hierarchy,
        loadMore,
        error,
    };
};

const useIntersectionObserver = (callback: () => void) => {
    const handleObserver = (entries: IntersectionObserverEntry[]) => {
        const target = entries[0];
        if (target.isIntersecting) {
            callback();
        }
    };

    const observerRef = useRef<IntersectionObserver>();
    return (element: HTMLDivElement) => {
        if (observerRef.current) {
            observerRef.current.disconnect();
        } else if (element) {
            observerRef.current = new IntersectionObserver(handleObserver, {
                root: element.parentElement,
                rootMargin: "0px 0px 600px 0px",
            });
        }

        if (observerRef.current && element) {
            observerRef.current.observe(element);
        }
    };
};

interface IManageButtonsProps {
    hierarchy: RoomHierarchy;
    selected: Map<string, Set<string>>;
    setSelected: Dispatch<SetStateAction<Map<string, Set<string>>>>;
    setError: Dispatch<SetStateAction<string>>;
}

const ManageButtons = ({ hierarchy, selected, setSelected, setError }: IManageButtonsProps) => {
    const cli = useContext(MatrixClientContext);

    const [removing, setRemoving] = useState(false);
    const [saving, setSaving] = useState(false);

    const selectedRelations = Array.from(selected.keys()).flatMap(parentId => {
        return [
            ...selected.get(parentId).values(),
        ].map(childId => [parentId, childId]);
    });

    const selectionAllSuggested = selectedRelations.every(([parentId, childId]) => {
        return hierarchy.isSuggested(parentId, childId);
    });

    const disabled = !selectedRelations.length || removing || saving;

    let Button: React.ComponentType<React.ComponentProps<typeof AccessibleButton>> = AccessibleButton;
    let props = {};
    if (!selectedRelations.length) {
        Button = AccessibleTooltipButton;
        props = {
            tooltip: _t("Select a room below first"),
            alignment: Alignment.Top,
        };
    }

    return <>
        <Button
            {...props}
            onClick={async () => {
                setRemoving(true);
                try {
                    const userId = cli.getUserId();
                    for (const [parentId, childId] of selectedRelations) {
                        await cli.sendStateEvent(parentId, EventType.SpaceChild, {}, childId);

                        // remove the child->parent relation too, if we have permission to.
                        const childRoom = cli.getRoom(childId);
                        const parentRelation = childRoom?.currentState.getStateEvents(EventType.SpaceParent, parentId);
                        if (childRoom?.currentState.maySendStateEvent(EventType.SpaceParent, userId) &&
                            Array.isArray(parentRelation?.getContent().via)
                        ) {
                            await cli.sendStateEvent(childId, EventType.SpaceParent, {}, parentId);
                        }

                        hierarchy.removeRelation(parentId, childId);
                    }
                } catch (e) {
                    setError(_t("Failed to remove some rooms. Try again later"));
                }
                setRemoving(false);
                setSelected(new Map());
            }}
            kind="danger_outline"
            disabled={disabled}
        >
            { removing ? _t("Removing...") : _t("Remove") }
        </Button>
        <Button
            {...props}
            onClick={async () => {
                setSaving(true);
                try {
                    for (const [parentId, childId] of selectedRelations) {
                        const suggested = !selectionAllSuggested;
                        const existingContent = hierarchy.getRelation(parentId, childId)?.content;
                        if (!existingContent || existingContent.suggested === suggested) continue;

                        const content = {
                            ...existingContent,
                            suggested: !selectionAllSuggested,
                        };

                        await cli.sendStateEvent(parentId, EventType.SpaceChild, content, childId);

                        // mutate the local state to save us having to refetch the world
                        existingContent.suggested = content.suggested;
                    }
                } catch (e) {
                    setError("Failed to update some suggestions. Try again later");
                }
                setSaving(false);
                setSelected(new Map());
            }}
            kind="primary_outline"
            disabled={disabled}
        >
            { saving
                ? _t("Saving...")
                : (selectionAllSuggested ? _t("Mark as not suggested") : _t("Mark as suggested"))
            }
        </Button>
    </>;
};

const SpaceHierarchy = ({
    space,
    initialText = "",
    showRoom,
    additionalButtons,
}: IProps) => {
    const cli = useContext(MatrixClientContext);
    const [query, setQuery] = useState(initialText);

    const [selected, setSelected] = useState(new Map<string, Set<string>>()); // Map<parentId, Set<childId>>

    const { loading, rooms, hierarchy, loadMore, error: hierarchyError } = useRoomHierarchy(space);

    const filteredRoomSet = useMemo<Set<IHierarchyRoom>>(() => {
        if (!rooms?.length) return new Set();
        const lcQuery = query.toLowerCase().trim();
        if (!lcQuery) return new Set(rooms);

        const directMatches = rooms.filter(r => {
            return r.name?.toLowerCase().includes(lcQuery) || r.topic?.toLowerCase().includes(lcQuery);
        });

        // Walk back up the tree to find all parents of the direct matches to show their place in the hierarchy
        const visited = new Set<string>();
        const queue = [...directMatches.map(r => r.room_id)];
        while (queue.length) {
            const roomId = queue.pop();
            visited.add(roomId);
            hierarchy.backRefs.get(roomId)?.forEach(parentId => {
                if (!visited.has(parentId)) {
                    queue.push(parentId);
                }
            });
        }

        return new Set(rooms.filter(r => visited.has(r.room_id)));
    }, [rooms, hierarchy, query]);

    const [error, setError] = useState("");
    let errorText = error;
    if (!error && hierarchyError) {
        errorText = _t("Failed to load list of rooms.");
    }

    const loaderRef = useIntersectionObserver(loadMore);

    if (!loading && hierarchy.noSupport) {
        return <p>{ _t("Your server does not support showing space hierarchies.") }</p>;
    }

    const onKeyDown = (ev: KeyboardEvent, state: IState): void => {
        const action = getKeyBindingsManager().getAccessibilityAction(ev);
        if (
            action === KeyBindingAction.ArrowDown &&
            ev.currentTarget.classList.contains("mx_SpaceHierarchy_search")
        ) {
            state.refs[0]?.current?.focus();
        }
    };

    const onToggleClick = (parentId: string, childId: string): void => {
        setError("");
        if (!selected.has(parentId)) {
            setSelected(new Map(selected.set(parentId, new Set([childId]))));
            return;
        }

        const parentSet = selected.get(parentId);
        if (!parentSet.has(childId)) {
            setSelected(new Map(selected.set(parentId, new Set([...parentSet, childId]))));
            return;
        }

        parentSet.delete(childId);
        setSelected(new Map(selected.set(parentId, new Set(parentSet))));
    };

    return <RovingTabIndexProvider onKeyDown={onKeyDown} handleHomeEnd handleUpDown>
        { ({ onKeyDownHandler }) => {
            let content: JSX.Element;
            if (loading && !rooms?.length) {
                content = <Spinner />;
            } else {
                const hasPermissions = space?.getMyMembership() === "join" &&
                    space.currentState.maySendStateEvent(EventType.SpaceChild, cli.getUserId());

                let results: JSX.Element;
                if (filteredRoomSet.size) {
                    results = <>
                        <HierarchyLevel
                            root={hierarchy.roomMap.get(space.roomId)}
                            roomSet={filteredRoomSet}
                            hierarchy={hierarchy}
                            parents={new Set()}
                            selectedMap={selected}
                            onToggleClick={hasPermissions ? onToggleClick : undefined}
                            onViewRoomClick={(roomId, roomType) => showRoom(cli, hierarchy, roomId, roomType)}
                            onJoinRoomClick={(roomId) => joinRoom(cli, hierarchy, roomId)}
                        />
                    </>;
                } else if (!hierarchy.canLoadMore) {
                    results = <div className="mx_SpaceHierarchy_noResults">
                        <h3>{ _t("No results found") }</h3>
                        <div>{ _t("You may want to try a different search or check for typos.") }</div>
                    </div>;
                }

                let loader: JSX.Element;
                if (hierarchy.canLoadMore) {
                    loader = <div ref={loaderRef}>
                        <Spinner />
                    </div>;
                }

                content = <>
                    <div className="mx_SpaceHierarchy_listHeader">
                        <h4 className="mx_SpaceHierarchy_listHeader_header">
                            { query.trim() ? _t("Results") : _t("Rooms and spaces") }
                        </h4>
                        <div className="mx_SpaceHierarchy_listHeader_buttons">
                            { additionalButtons }
                            { hasPermissions && (
                                <ManageButtons
                                    hierarchy={hierarchy}
                                    selected={selected}
                                    setSelected={setSelected}
                                    setError={setError}
                                />
                            ) }
                        </div>
                    </div>
                    { errorText && <div className="mx_SpaceHierarchy_error">
                        { errorText }
                    </div> }
                    <ul
                        className="mx_SpaceHierarchy_list"
                        onKeyDown={onKeyDownHandler}
                        role="tree"
                        aria-label={_t("Space")}
                    >
                        { results }
                    </ul>
                    { loader }
                </>;
            }

            return <>
                <SearchBox
                    className="mx_SpaceHierarchy_search mx_textinput_icon mx_textinput_search"
                    placeholder={_t("Search names and descriptions")}
                    onSearch={setQuery}
                    autoFocus={true}
                    initialValue={initialText}
                    onKeyDown={onKeyDownHandler}
                />

                { content }
            </>;
        } }
    </RovingTabIndexProvider>;
};

export default SpaceHierarchy;
