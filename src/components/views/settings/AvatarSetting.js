/*
Copyright 2019 The Matrix.org Foundation C.I.C.

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
import PropTypes from "prop-types";
import classNames from "classnames";

import {ContextMenu, ContextMenuButton, toRightOf, useContextMenu} from "../../structures/ContextMenu";
import sdk from "../../../index";

// TODO: Why is rendering a box with an overlay so complicated? Can the DOM be reduced?
const AvatarSetting = (props) => {
    const {
        avatarUrl,
        avatarImgAlt,
        avatarButtonText,
        changeAvatarText,
        uploadAvatarText,
        noAvatarText,
        uploadAvatar,
        removeAvatar,
    } = props;

    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu();

    const canSet = uploadAvatar && removeAvatar;

    let showOverlayAnyways = true;
    let avatarElement;
    if (avatarUrl) {
        showOverlayAnyways = false;
        avatarElement = <img src={avatarUrl} alt={avatarImgAlt} />;

        if (canSet) { // wrap it in a button to catch interactions
            avatarElement = <ContextMenuButton
                onClick={openMenu}
                isExpanded={menuDisplayed}
                inputRef={button}
                label={avatarButtonText}
            >
                { avatarElement }
            </ContextMenuButton>;
        }
    } else if (canSet) {
        const AccessibleButton = sdk.getComponent('elements.AccessibleButton');
        avatarElement = <AccessibleButton className="mx_AvatarSetting_avatarPlaceholder" onClick={uploadAvatar} />;
    } else {
        avatarElement = <div className="mx_AvatarSetting_avatarPlaceholder" />;
    }

    const avatarOverlayClasses = classNames({
        "mx_AvatarSetting_avatarOverlay": true,
        "mx_AvatarSetting_avatarOverlay_show": showOverlayAnyways,
        "mx_AvatarSetting_avatarOverlay_disabled": !canSet,
    });

    let avatarOverlay;
    if (canSet) {
        avatarOverlay = (
            <div className={avatarOverlayClasses}>
            <span className="mx_AvatarSetting_avatarOverlayText">
                { avatarUrl ? changeAvatarText : uploadAvatarText }
            </span>
                <div className="mx_AvatarSetting_avatarOverlayImgContainer">
                    <div className="mx_AvatarSetting_avatarOverlayImg" />
                </div>
            </div>
        );
    } else {
        avatarOverlay = (
            <div className={avatarOverlayClasses}>
                <span className="mx_AvatarSetting_noAvatarText">
                    { noAvatarText }
                </span>
            </div>
        );
    }

    let contextMenu;
    if (menuDisplayed) {
        const elementRect = button.current.getBoundingClientRect();
        const AvatarContextMenu = sdk.getComponent('context_menus.AvatarContextMenu');
        contextMenu = <ContextMenu {...toRightOf(elementRect)} onFinished={closeMenu}>
            <AvatarContextMenu
                uploadAvatar={uploadAvatar}
                removeAvatar={removeAvatar}
                onFinished={closeMenu} />
        </ContextMenu>;
    }

    return <div className="mx_AvatarSetting_avatar">
        { avatarElement }
        { avatarOverlay }

        { contextMenu }
    </div>;
};

AvatarSetting.propTypes = {
    avatarUrl: PropTypes.string,
    avatarImgAlt: PropTypes.string.isRequired,
    avatarButtonText: PropTypes.string.isRequired,
    changeAvatarText: PropTypes.string.isRequired,
    uploadAvatarText: PropTypes.string.isRequired,
    noAvatarText: PropTypes.string,
    uploadAvatar: PropTypes.func,
    removeAvatar: PropTypes.func,
};

export default AvatarSetting;

