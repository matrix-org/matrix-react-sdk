/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import * as React from "react";
import { createRef } from "react";
import classNames from "classnames";
import { Room } from "matrix-js-sdk/src/models/room";

import GroupFilterPanel from "./GroupFilterPanel";
import CustomRoomTagPanel from "./CustomRoomTagPanel";
import dis from "../../dispatcher/dispatcher";
import { _t } from "../../languageHandler";
import RoomList from "../views/rooms/RoomList";
import { Action } from "../../dispatcher/actions";
import UserMenu from "./UserMenu";
import RoomSearch from "./RoomSearch";
import RoomBreadcrumbs from "../views/rooms/RoomBreadcrumbs";
import { BreadcrumbsStore } from "../../stores/BreadcrumbsStore";
import { UPDATE_EVENT } from "../../stores/AsyncStore";
import ResizeNotifier from "../../utils/ResizeNotifier";
import SettingsStore from "../../settings/SettingsStore";
import RoomListStore, { LISTS_UPDATE_EVENT } from "../../stores/room-list/RoomListStore";
import IndicatorScrollbar from "../structures/IndicatorScrollbar";
import AccessibleTooltipButton from "../views/elements/AccessibleTooltipButton";
import { OwnProfileStore } from "../../stores/OwnProfileStore";
import RoomListNumResults from "../views/rooms/RoomListNumResults";
import LeftPanelWidget from "./LeftPanelWidget";
import {replaceableComponent} from "../../utils/replaceableComponent";
import {mediaFromMxc} from "../../customisations/Media";
import SpaceStore, {UPDATE_SELECTED_SPACE} from "../../stores/SpaceStore";
import { getKeyBindingsManager, RoomListAction } from "../../KeyBindingsManager";

interface IProps {
    isMinimized: boolean;
    resizeNotifier: ResizeNotifier;
}

interface IState {
    showBreadcrumbs: boolean;
    showGroupFilterPanel: boolean;
    activeSpace?: Room;
}

// List of CSS classes which should be included in keyboard navigation within the room list
const cssClasses = [
    "mx_RoomSearch_input",
    "mx_RoomSearch_minimizedHandle", // minimized <RoomSearch />
    "mx_RoomSublist_headerText",
    "mx_RoomTile",
    "mx_RoomSublist_showNButton",
];

@replaceableComponent("structures.LeftPanel")
export default class LeftPanel extends React.Component<IProps, IState> {
    private listContainerRef: React.RefObject<HTMLDivElement> = createRef();
    private groupFilterPanelWatcherRef: string;
    private bgImageWatcherRef: string;
    private focusedElement = null;
    private isDoingStickyHeaders = false;

    constructor(props: IProps) {
        super(props);

        this.state = {
            showBreadcrumbs: BreadcrumbsStore.instance.visible,
            showGroupFilterPanel: SettingsStore.getValue('TagPanel.enableTagPanel'),
            activeSpace: SpaceStore.instance.activeSpace,
        };

        BreadcrumbsStore.instance.on(UPDATE_EVENT, this.onBreadcrumbsUpdate);
        RoomListStore.instance.on(LISTS_UPDATE_EVENT, this.onBreadcrumbsUpdate);
        OwnProfileStore.instance.on(UPDATE_EVENT, this.onBackgroundImageUpdate);
        SpaceStore.instance.on(UPDATE_SELECTED_SPACE, this.updateActiveSpace);
        this.bgImageWatcherRef = SettingsStore.watchSetting(
            "RoomList.backgroundImage", null, this.onBackgroundImageUpdate);
        this.groupFilterPanelWatcherRef = SettingsStore.watchSetting("TagPanel.enableTagPanel", null, () => {
            this.setState({showGroupFilterPanel: SettingsStore.getValue("TagPanel.enableTagPanel")});
        });
    }

    public componentWillUnmount() {
        SettingsStore.unwatchSetting(this.groupFilterPanelWatcherRef);
        SettingsStore.unwatchSetting(this.bgImageWatcherRef);
        BreadcrumbsStore.instance.off(UPDATE_EVENT, this.onBreadcrumbsUpdate);
        RoomListStore.instance.off(LISTS_UPDATE_EVENT, this.onBreadcrumbsUpdate);
        OwnProfileStore.instance.off(UPDATE_EVENT, this.onBackgroundImageUpdate);
        SpaceStore.instance.off(UPDATE_SELECTED_SPACE, this.updateActiveSpace);
    }

    private updateActiveSpace = (activeSpace: Room) => {
        this.setState({ activeSpace });
    };

    private onExplore = () => {
        dis.fire(Action.ViewRoomDirectory);
    };

    private onBreadcrumbsUpdate = () => {
        const newVal = BreadcrumbsStore.instance.visible;
        if (newVal !== this.state.showBreadcrumbs) {
            this.setState({showBreadcrumbs: newVal});
        }
    };

    private onBackgroundImageUpdate = () => {
        // Note: we do this in the LeftPanel as it uses this variable most prominently.
        const avatarSize = 32; // arbitrary
        let avatarUrl = OwnProfileStore.instance.getHttpAvatarUrl(avatarSize);
        const settingBgMxc = SettingsStore.getValue("RoomList.backgroundImage");
        if (settingBgMxc) {
            avatarUrl = mediaFromMxc(settingBgMxc).getSquareThumbnailHttp(avatarSize);
        }

        const avatarUrlProp = `url(${avatarUrl})`;
        if (!avatarUrl) {
            document.body.style.removeProperty("--avatar-url");
        } else if (document.body.style.getPropertyValue("--avatar-url") !== avatarUrlProp) {
            document.body.style.setProperty("--avatar-url", avatarUrlProp);
        }
    };

    private onFocus = (ev: React.FocusEvent) => {
        this.focusedElement = ev.target;
    };

    private onBlur = () => {
        this.focusedElement = null;
    };

    private onKeyDown = (ev: React.KeyboardEvent) => {
        if (!this.focusedElement) return;

        const action = getKeyBindingsManager().getRoomListAction(ev);
        switch (action) {
            case RoomListAction.NextRoom:
            case RoomListAction.PrevRoom:
                ev.stopPropagation();
                ev.preventDefault();
                this.onMoveFocus(action === RoomListAction.PrevRoom);
                break;
        }
    };

    private selectRoom = () => {
        const firstRoom = this.listContainerRef.current.querySelector<HTMLDivElement>(".mx_RoomTile");
        if (firstRoom) {
            firstRoom.click();
            return true; // to get the field to clear
        }
    };

    private onMoveFocus = (up: boolean) => {
        let element = this.focusedElement;

        let descending = false; // are we currently descending or ascending through the DOM tree?
        let classes: DOMTokenList;

        do {
            const child = up ? element.lastElementChild : element.firstElementChild;
            const sibling = up ? element.previousElementSibling : element.nextElementSibling;

            if (descending) {
                if (child) {
                    element = child;
                } else if (sibling) {
                    element = sibling;
                } else {
                    descending = false;
                    element = element.parentElement;
                }
            } else {
                if (sibling) {
                    element = sibling;
                    descending = true;
                } else {
                    element = element.parentElement;
                }
            }

            if (element) {
                classes = element.classList;
            }
        } while (element && (!cssClasses.some(c => classes.contains(c)) || element.offsetParent === null));

        if (element) {
            element.focus();
            this.focusedElement = element;
        }
    };

    private renderHeader(): React.ReactNode {
        return (
            <div className="mx_LeftPanel_userHeader">
                <UserMenu isMinimized={this.props.isMinimized} />
            </div>
        );
    }

    private renderBreadcrumbs(): React.ReactNode {
        if (this.state.showBreadcrumbs && !this.props.isMinimized) {
            return (
                <IndicatorScrollbar
                    className="mx_LeftPanel_breadcrumbsContainer mx_AutoHideScrollbar"
                    verticalScrollsHorizontally={true}
                    // Firefox sometimes makes this element focusable due to
                    // overflow:scroll;, so force it out of tab order.
                    tabIndex={-1}
                >
                    <RoomBreadcrumbs />
                </IndicatorScrollbar>
            );
        }
    }

    private renderSearchExplore(): React.ReactNode {
        return (
            <div
                className="mx_LeftPanel_filterContainer"
                onFocus={this.onFocus}
                onBlur={this.onBlur}
                onKeyDown={this.onKeyDown}
            >
                <RoomSearch
                    isMinimized={this.props.isMinimized}
                    onKeyDown={this.onKeyDown}
                    onSelectRoom={this.selectRoom}
                />
                <AccessibleTooltipButton
                    className={classNames("mx_LeftPanel_exploreButton", {
                        mx_LeftPanel_exploreButton_space: !!this.state.activeSpace,
                    })}
                    onClick={this.onExplore}
                    title={_t("Explore rooms")}
                />
            </div>
        );
    }

    public render(): React.ReactNode {
        let leftLeftPanel;
        if (this.state.showGroupFilterPanel) {
            leftLeftPanel = (
                <div className="mx_LeftPanel_GroupFilterPanelContainer">
                    <GroupFilterPanel />
                    {SettingsStore.getValue("feature_custom_tags") ? <CustomRoomTagPanel /> : null}
                </div>
            );
        }

        const roomList = <RoomList
            onKeyDown={this.onKeyDown}
            resizeNotifier={this.props.resizeNotifier}
            onFocus={this.onFocus}
            onBlur={this.onBlur}
            isMinimized={this.props.isMinimized}
            activeSpace={this.state.activeSpace}
        />;

        const containerClasses = classNames({
            "mx_LeftPanel": true,
            "mx_LeftPanel_minimized": this.props.isMinimized,
        });

        const roomListClasses = classNames(
            "mx_LeftPanel_actualRoomListContainer",
            "mx_AutoHideScrollbar",
        );

        return (
            <div className={containerClasses}>
                {leftLeftPanel}
                <aside className="mx_LeftPanel_roomListContainer">
                    {this.renderHeader()}
                    {this.renderSearchExplore()}
                    {this.renderBreadcrumbs()}
                    <RoomListNumResults />
                    <div className="mx_LeftPanel_roomListWrapper">
                        <div
                            className={roomListClasses}
                            ref={this.listContainerRef}
                            // Firefox sometimes makes this element focusable due to
                            // overflow:scroll;, so force it out of tab order.
                            tabIndex={-1}
                        >
                            {roomList}
                        </div>
                    </div>
                    { !this.props.isMinimized && <LeftPanelWidget /> }
                </aside>
            </div>
        );
    }
}
