/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2018 New Vector Ltd
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

import React, { useCallback } from "react";
import classNames from "classnames";

import AccessibleButton from "../elements/AccessibleButton";
import { _t, _td, TranslationKey } from "../../../languageHandler";
import E2EIcon from "./E2EIcon";
import { E2EState } from "../../../models/rooms/E2EState";
import BaseAvatar from "../avatars/BaseAvatar";
import PresenceLabel from "./PresenceLabel";
import { PresenceState } from "../../../models/rooms/PresenceState";

export enum PowerStatus {
    Admin = "admin",
    Moderator = "moderator",
}

const PowerLabel: Record<PowerStatus, TranslationKey> = {
    [PowerStatus.Admin]: _td("power_level|admin"),
    [PowerStatus.Moderator]: _td("power_level|mod"),
};

const PRESENCE_CLASS: Record<PresenceState, string> = {
    "offline": "mx_EntityTile_offline",
    "online": "mx_EntityTile_online",
    "unavailable": "mx_EntityTile_unavailable",
    "io.element.unreachable": "mx_EntityTile_unreachable",
};

function presenceClassForMember(presenceState?: PresenceState, lastActiveAgo?: number, showPresence?: boolean): string {
    if (showPresence === false) {
        return "mx_EntityTile_online_beenactive";
    }

    // offline is split into two categories depending on whether we have
    // a last_active_ago for them.
    if (presenceState === "offline") {
        if (lastActiveAgo) {
            return PRESENCE_CLASS["offline"] + "_beenactive";
        } else {
            return PRESENCE_CLASS["offline"] + "_neveractive";
        }
    } else if (presenceState) {
        return PRESENCE_CLASS[presenceState];
    } else {
        return PRESENCE_CLASS["offline"] + "_neveractive";
    }
}

interface IProps {
    name?: string;
    nameJSX?: JSX.Element;
    title?: string;
    avatarJsx?: JSX.Element; // <BaseAvatar />
    className?: string;
    presenceState?: PresenceState;
    presenceLastActiveAgo: number;
    presenceLastTs: number;
    presenceCurrentlyActive?: boolean;
    showInviteButton?: boolean;
    onClick(): void;
    showPresence?: boolean;
    subtextLabel?: string;
    e2eStatus?: E2EState;
    powerStatus?: PowerStatus;
}

export default function EntityTileRefactored({
    onClick = () => {},
    presenceState = "offline",
    presenceLastActiveAgo = 0,
    presenceLastTs = 0,
    showInviteButton = false,
    showPresence = true,
    ...props
}: IProps): JSX.Element {
    /**
     * Creates the PresenceLabel component if needed
     * @returns The PresenceLabel component if we need to render it, undefined otherwise
     */
    const getPresenceLabel = useCallback((): JSX.Element | undefined => {
        if (!showPresence) return;
        const activeAgo = presenceLastActiveAgo ? Date.now() - (presenceLastTs - presenceLastActiveAgo) : -1;
        return (
            <PresenceLabel
                activeAgo={activeAgo}
                currentlyActive={props.presenceCurrentlyActive}
                presenceState={presenceState}
            />
        );
    }, [presenceLastTs, presenceLastActiveAgo, presenceState, props.presenceCurrentlyActive, showPresence]);

    const mainClassNames: Record<string, boolean> = {
        mx_EntityTile: true,
    };
    if (props.className) mainClassNames[props.className] = true;

    const presenceClass = presenceClassForMember(presenceState, presenceLastActiveAgo, showPresence);
    mainClassNames[presenceClass] = true;

    const name = props.nameJSX || props.name;
    const nameAndPresence = (
        <div className="mx_EntityTile_details">
            <div className="mx_EntityTile_name">{name}</div>
            {getPresenceLabel()}
        </div>
    );

    let inviteButton;
    if (showInviteButton) {
        inviteButton = (
            <div className="mx_EntityTile_invite">
                <img
                    alt={_t("action|invite")}
                    src={require("../../../../res/img/plus.svg").default}
                    width="16"
                    height="16"
                />
            </div>
        );
    }

    let powerLabel;
    const powerStatus = props.powerStatus;
    if (powerStatus) {
        const powerText = _t(PowerLabel[powerStatus]);
        powerLabel = <div className="mx_EntityTile_power">{powerText}</div>;
    }

    let e2eIcon;
    const { e2eStatus } = props;
    if (e2eStatus) {
        e2eIcon = <E2EIcon status={e2eStatus} isUser={true} bordered={true} />;
    }

    const av = props.avatarJsx || <BaseAvatar name={props.name} size="36px" aria-hidden="true" />;

    // The wrapping div is required to make the magic mouse listener work, for some reason.
    return (
        <div>
            <AccessibleButton className={classNames(mainClassNames)} title={props.title} onClick={onClick}>
                <div className="mx_EntityTile_avatar">
                    {av}
                    {e2eIcon}
                </div>
                {nameAndPresence}
                {powerLabel}
                {inviteButton}
            </AccessibleButton>
        </div>
    );
}
