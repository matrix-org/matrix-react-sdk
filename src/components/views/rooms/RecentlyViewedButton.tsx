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

import React, { useContext } from "react";

import { BreadcrumbsStore } from "../../../stores/BreadcrumbsStore";
import { UPDATE_EVENT } from "../../../stores/AsyncStore";
import { ChevronFace, ContextMenu, ContextMenuTooltipButton, MenuItem, useContextMenu } from "../../structures/ContextMenu";
import { useEventEmitterState } from "../../../hooks/useEventEmitter";
import { _t } from "../../../languageHandler";
import RoomAvatar from "../avatars/RoomAvatar";
import dis from "../../../dispatcher/dispatcher";
import SpaceStore from "../../../stores/SpaceStore";
import MatrixClientContext from "../../../contexts/MatrixClientContext";

const contextMenuBelow = (elementRect: DOMRect) => {
    // align the context menu's icons with the icon which opened the context menu
    const left = elementRect.left + window.pageXOffset;
    const top = elementRect.bottom + window.pageYOffset + 17;
    const chevronFace = ChevronFace.None;
    return { left, top, chevronFace };
};

const RecentlyViewedButton = () => {
    const cli = useContext(MatrixClientContext);
    const [menuDisplayed, handle, openMenu, closeMenu] = useContextMenu<HTMLDivElement>();
    const crumbs = useEventEmitterState(BreadcrumbsStore.instance, UPDATE_EVENT, () => BreadcrumbsStore.instance.rooms);

    let contextMenu: JSX.Element;
    if (menuDisplayed) {
        contextMenu = <ContextMenu
            {...contextMenuBelow(handle.current.getBoundingClientRect())}
            onFinished={closeMenu}
            wrapperClassName="mx_RecentlyViewedButton_ContextMenu"
        >
            <h4>{ _t("Recently viewed") }</h4>

            { crumbs.map(crumb => {
                let parentsSection: JSX.Element;
                if (!crumb.isSpaceRoom()) {
                    const [parent, ...otherParents] = SpaceStore.instance.getKnownParents(crumb.roomId);
                    if (parent) {
                        parentsSection = <div className="mx_RecentlyViewedButton_entry_spaces">
                            { _t("%(spaceName)s and %(count)s others", {
                                spaceName: cli.getRoom(parent).name,
                                count: otherParents.length,
                            }) }
                        </div>;
                    }
                }

                return <MenuItem
                    key={crumb.roomId}
                    onClick={() => {
                        dis.dispatch({
                            action: "view_room",
                            room_id: crumb.roomId,
                        });
                        closeMenu();
                    }}
                >
                    <RoomAvatar
                        room={crumb}
                        width={24}
                        height={24}
                    />
                    <span className="mx_RecentlyViewedButton_entry_label">
                        <div>{ crumb.name }</div>
                        { parentsSection }
                    </span>
                </MenuItem>;
            }) }
        </ContextMenu>;
    }

    return <>
        <ContextMenuTooltipButton
            className="mx_LeftPanel_recentsButton"
            onClick={openMenu}
            title={_t("Recently viewed")}
            isExpanded={menuDisplayed}
            inputRef={handle}
        />

        { contextMenu }
    </>;
};

export default RecentlyViewedButton;
