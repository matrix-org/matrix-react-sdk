/*
Copyright 2021 - 2022 The Matrix.org Foundation C.I.C.

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
    ComponentProps,
    Dispatch,
    ReactNode,
    RefCallback,
    SetStateAction,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { DragDropContext, Draggable, Droppable, DroppableProvidedProps } from "react-beautiful-dnd";
import classNames from "classnames";
import { Room } from "matrix-js-sdk/src/models/room";

import { _t } from "../../../languageHandler";
import { useContextMenu } from "../../structures/ContextMenu";
import SpaceCreateMenu from "./SpaceCreateMenu";
import { SpaceButton, SpaceItem } from "./SpaceTreeLevel";
import AccessibleTooltipButton from "../elements/AccessibleTooltipButton";
import { useEventEmitter, useEventEmitterState } from "../../../hooks/useEventEmitter";
import SpaceStore from "../../../stores/spaces/SpaceStore";
import {
    getMetaSpaceName,
    MetaSpace,
    SpaceKey,
    UPDATE_HOME_BEHAVIOUR,
    UPDATE_INVITED_SPACES,
    UPDATE_SELECTED_SPACE,
    UPDATE_TOP_LEVEL_SPACES,
} from "../../../stores/spaces";
import { RovingTabIndexProvider } from "../../../accessibility/RovingTabIndex";
import {
    RoomNotificationStateStore,
    UPDATE_STATUS_INDICATOR,
} from "../../../stores/notifications/RoomNotificationStateStore";
import SpaceContextMenu from "../context_menus/SpaceContextMenu";
import IconizedContextMenu, {
    IconizedContextMenuCheckbox,
    IconizedContextMenuOptionList,
} from "../context_menus/IconizedContextMenu";
import SettingsStore from "../../../settings/SettingsStore";
import { SettingLevel } from "../../../settings/SettingLevel";
import UIStore from "../../../stores/UIStore";
import QuickSettingsButton from "./QuickSettingsButton";
import { useSettingValue } from "../../../hooks/useSettings";
import UserMenu from "../../structures/UserMenu";
import IndicatorScrollbar from "../../structures/IndicatorScrollbar";
import { IS_MAC, Key } from "../../../Keyboard";
import { useDispatcher } from "../../../hooks/useDispatcher";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { ActionPayload } from "../../../dispatcher/payloads";
import { Action } from "../../../dispatcher/actions";
import { NotificationState } from "../../../stores/notifications/NotificationState";
import { ALTERNATE_KEY_NAME } from "../../../accessibility/KeyboardShortcuts";
import { shouldShowComponent } from "../../../customisations/helpers/UIComponents";
import { UIComponent } from "../../../settings/UIFeature";

const useSpaces = (): [Room[], MetaSpace[], Room[], SpaceKey] => {
    const invites = useEventEmitterState<Room[]>(SpaceStore.instance, UPDATE_INVITED_SPACES, () => {
        return SpaceStore.instance.invitedSpaces;
    });
    const [metaSpaces, actualSpaces] = useEventEmitterState<[MetaSpace[], Room[]]>(
        SpaceStore.instance, UPDATE_TOP_LEVEL_SPACES,
        () => [
            SpaceStore.instance.enabledMetaSpaces,
            SpaceStore.instance.spacePanelSpaces,
        ],
    );
    const activeSpace = useEventEmitterState<SpaceKey>(SpaceStore.instance, UPDATE_SELECTED_SPACE, () => {
        return SpaceStore.instance.activeSpace;
    });
    return [invites, metaSpaces, actualSpaces, activeSpace];
};

export const HomeButtonContextMenu = ({
    onFinished,
    hideHeader,
    ...props
}: ComponentProps<typeof SpaceContextMenu>) => {
    const allRoomsInHome = useSettingValue<boolean>("Spaces.allRoomsInHome");

    return <IconizedContextMenu
        {...props}
        onFinished={onFinished}
        className="mx_SpacePanel_contextMenu"
        compact
    >
        { !hideHeader && <div className="mx_SpacePanel_contextMenu_header">
            { _t("Home") }
        </div> }
        <IconizedContextMenuOptionList first>
            <IconizedContextMenuCheckbox
                iconClassName="mx_SpacePanel_noIcon"
                label={_t("Show all rooms")}
                active={allRoomsInHome}
                onClick={() => {
                    SettingsStore.setValue("Spaces.allRoomsInHome", null, SettingLevel.ACCOUNT, !allRoomsInHome);
                }}
            />
        </IconizedContextMenuOptionList>
    </IconizedContextMenu>;
};

interface IMetaSpaceButtonProps extends ComponentProps<typeof SpaceButton> {
    selected: boolean;
    isPanelCollapsed: boolean;
}

type MetaSpaceButtonProps = Pick<IMetaSpaceButtonProps, "selected" | "isPanelCollapsed">;

const MetaSpaceButton = ({ selected, isPanelCollapsed, ...props }: IMetaSpaceButtonProps) => {
    return <li
        className={classNames("mx_SpaceItem", {
            "collapsed": isPanelCollapsed,
        })}
        role="treeitem"
        aria-selected={selected}
    >
        <SpaceButton {...props} selected={selected} isNarrow={isPanelCollapsed} />
    </li>;
};

const getHomeNotificationState = (): NotificationState => {
    return SpaceStore.instance.allRoomsInHome
        ? RoomNotificationStateStore.instance.globalState
        : SpaceStore.instance.getNotificationState(MetaSpace.Home);
};

const HomeButton = ({ selected, isPanelCollapsed }: MetaSpaceButtonProps) => {
    const allRoomsInHome = useEventEmitterState(SpaceStore.instance, UPDATE_HOME_BEHAVIOUR, () => {
        return SpaceStore.instance.allRoomsInHome;
    });
    const [notificationState, setNotificationState] = useState(getHomeNotificationState());
    const updateNotificationState = useCallback(() => {
        setNotificationState(getHomeNotificationState());
    }, []);
    useEffect(updateNotificationState, [updateNotificationState, allRoomsInHome]);
    useEventEmitter(RoomNotificationStateStore.instance, UPDATE_STATUS_INDICATOR, updateNotificationState);

    return <MetaSpaceButton
        spaceKey={MetaSpace.Home}
        className="mx_SpaceButton_home"
        selected={selected}
        isPanelCollapsed={isPanelCollapsed}
        label={getMetaSpaceName(MetaSpace.Home, allRoomsInHome)}
        notificationState={notificationState}
        ContextMenuComponent={HomeButtonContextMenu}
        contextMenuTooltip={_t("Options")}
    />;
};

const FavouritesButton = ({ selected, isPanelCollapsed }: MetaSpaceButtonProps) => {
    return <MetaSpaceButton
        spaceKey={MetaSpace.Favourites}
        className="mx_SpaceButton_favourites"
        selected={selected}
        isPanelCollapsed={isPanelCollapsed}
        label={getMetaSpaceName(MetaSpace.Favourites)}
        notificationState={SpaceStore.instance.getNotificationState(MetaSpace.Favourites)}
    />;
};

const PeopleButton = ({ selected, isPanelCollapsed }: MetaSpaceButtonProps) => {
    return <MetaSpaceButton
        spaceKey={MetaSpace.People}
        className="mx_SpaceButton_people"
        selected={selected}
        isPanelCollapsed={isPanelCollapsed}
        label={getMetaSpaceName(MetaSpace.People)}
        notificationState={SpaceStore.instance.getNotificationState(MetaSpace.People)}
    />;
};

const OrphansButton = ({ selected, isPanelCollapsed }: MetaSpaceButtonProps) => {
    return <MetaSpaceButton
        spaceKey={MetaSpace.Orphans}
        className="mx_SpaceButton_orphans"
        selected={selected}
        isPanelCollapsed={isPanelCollapsed}
        label={getMetaSpaceName(MetaSpace.Orphans)}
        notificationState={SpaceStore.instance.getNotificationState(MetaSpace.Orphans)}
    />;
};

const CreateSpaceButton = ({
    isPanelCollapsed,
    setPanelCollapsed,
}: Pick<IInnerSpacePanelProps, "isPanelCollapsed" | "setPanelCollapsed">) => {
    // We don't need the handle as we position the menu in a constant location
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [menuDisplayed, _handle, openMenu, closeMenu] = useContextMenu<void>();

    useEffect(() => {
        if (!isPanelCollapsed && menuDisplayed) {
            closeMenu();
        }
    }, [isPanelCollapsed]); // eslint-disable-line react-hooks/exhaustive-deps

    let contextMenu = null;
    if (menuDisplayed) {
        contextMenu = <SpaceCreateMenu onFinished={closeMenu} />;
    }

    const onNewClick = menuDisplayed ? closeMenu : () => {
        if (!isPanelCollapsed) setPanelCollapsed(true);
        openMenu();
    };

    return <li
        className={classNames("mx_SpaceItem mx_SpaceItem_new", {
            "collapsed": isPanelCollapsed,
        })}
        role="treeitem"
    >
        <SpaceButton
            data-test-id='create-space-button'
            className={classNames("mx_SpaceButton_new", {
                mx_SpaceButton_newCancel: menuDisplayed,
            })}
            label={menuDisplayed ? _t("Cancel") : _t("Create a space")}
            onClick={onNewClick}
            isNarrow={isPanelCollapsed}
        />

        { contextMenu }
    </li>;
};

const metaSpaceComponentMap: Record<MetaSpace, typeof HomeButton> = {
    [MetaSpace.Home]: HomeButton,
    [MetaSpace.Favourites]: FavouritesButton,
    [MetaSpace.People]: PeopleButton,
    [MetaSpace.Orphans]: OrphansButton,
};

interface IInnerSpacePanelProps extends DroppableProvidedProps {
    children?: ReactNode;
    isPanelCollapsed: boolean;
    setPanelCollapsed: Dispatch<SetStateAction<boolean>>;
    isDraggingOver: boolean;
    innerRef: RefCallback<HTMLElement>;
}

// Optimisation based on https://github.com/atlassian/react-beautiful-dnd/blob/master/docs/api/droppable.md#recommended-droppable--performance-optimisation
const InnerSpacePanel = React.memo<IInnerSpacePanelProps>(({
    children,
    isPanelCollapsed,
    setPanelCollapsed,
    isDraggingOver,
    innerRef,
    ...props
}) => {
    const [invites, metaSpaces, actualSpaces, activeSpace] = useSpaces();
    const activeSpaces = activeSpace ? [activeSpace] : [];

    const metaSpacesSection = metaSpaces.map(key => {
        const Component = metaSpaceComponentMap[key];
        return <Component key={key} selected={activeSpace === key} isPanelCollapsed={isPanelCollapsed} />;
    });

    return <IndicatorScrollbar
        {...props}
        wrappedRef={innerRef}
        className="mx_SpaceTreeLevel"
        style={isDraggingOver ? {
            pointerEvents: "none",
        } : undefined}
        element="ul"
        role="tree"
        aria-label={_t("Spaces")}
    >
        { metaSpacesSection }
        { invites.map(s => (
            <SpaceItem
                key={s.roomId}
                space={s}
                activeSpaces={activeSpaces}
                isPanelCollapsed={isPanelCollapsed}
                onExpand={() => setPanelCollapsed(false)}
            />
        )) }
        { actualSpaces.map((s, i) => (
            <Draggable key={s.roomId} draggableId={s.roomId} index={i}>
                { (provided, snapshot) => (
                    <SpaceItem
                        {...provided.draggableProps}
                        dragHandleProps={provided.dragHandleProps}
                        key={s.roomId}
                        innerRef={provided.innerRef}
                        className={snapshot.isDragging ? "mx_SpaceItem_dragging" : undefined}
                        space={s}
                        activeSpaces={activeSpaces}
                        isPanelCollapsed={isPanelCollapsed}
                        onExpand={() => setPanelCollapsed(false)}
                    />
                ) }
            </Draggable>
        )) }
        { children }
        {
            shouldShowComponent(UIComponent.CreateSpaces) &&
            <CreateSpaceButton isPanelCollapsed={isPanelCollapsed} setPanelCollapsed={setPanelCollapsed} />
        }

    </IndicatorScrollbar>;
});

const SpacePanel = () => {
    const [isPanelCollapsed, setPanelCollapsed] = useState(true);
    const ref = useRef<HTMLDivElement>();
    useLayoutEffect(() => {
        UIStore.instance.trackElementDimensions("SpacePanel", ref.current);
        return () => UIStore.instance.stopTrackingElementDimensions("SpacePanel");
    }, []);

    useDispatcher(defaultDispatcher, (payload: ActionPayload) => {
        if (payload.action === Action.ToggleSpacePanel) {
            setPanelCollapsed(!isPanelCollapsed);
        }
    });

    return (
        <DragDropContext onDragEnd={result => {
            if (!result.destination) return; // dropped outside the list
            SpaceStore.instance.moveRootSpace(result.source.index, result.destination.index);
        }}>
            <RovingTabIndexProvider handleHomeEnd handleUpDown>
                { ({ onKeyDownHandler }) => (
                    <div
                        className={classNames("mx_SpacePanel", { collapsed: isPanelCollapsed })}
                        onKeyDown={onKeyDownHandler}
                        ref={ref}
                    >
                        <UserMenu isPanelCollapsed={isPanelCollapsed}>
                            <AccessibleTooltipButton
                                className={classNames("mx_SpacePanel_toggleCollapse", { expanded: !isPanelCollapsed })}
                                onClick={() => setPanelCollapsed(!isPanelCollapsed)}
                                title={isPanelCollapsed ? _t("Expand") : _t("Collapse")}
                                tooltip={<div>
                                    <div className="mx_Tooltip_title">
                                        { isPanelCollapsed ? _t("Expand") : _t("Collapse") }
                                    </div>
                                    <div className="mx_Tooltip_sub">
                                        { IS_MAC
                                            ? "⌘ + ⇧ + D"
                                            : _t(ALTERNATE_KEY_NAME[Key.CONTROL]) + " + " +
                                              _t(ALTERNATE_KEY_NAME[Key.SHIFT]) + " + D"
                                        }
                                    </div>
                                </div>}
                            />
                        </UserMenu>
                        <Droppable droppableId="top-level-spaces">
                            { (provided, snapshot) => (
                                <InnerSpacePanel
                                    {...provided.droppableProps}
                                    isPanelCollapsed={isPanelCollapsed}
                                    setPanelCollapsed={setPanelCollapsed}
                                    isDraggingOver={snapshot.isDraggingOver}
                                    innerRef={provided.innerRef}
                                >
                                    { provided.placeholder }
                                </InnerSpacePanel>
                            ) }
                        </Droppable>

                        <QuickSettingsButton isPanelCollapsed={isPanelCollapsed} />
                    </div>
                ) }
            </RovingTabIndexProvider>
        </DragDropContext>
    );
};

export default SpacePanel;
