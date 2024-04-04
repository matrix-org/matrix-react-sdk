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
import { Icon as ExternalLinkIcon } from "@vector-im/compound-design-tokens/icons/link.svg";
import { Button, IconButton, Tooltip } from "@vector-im/compound-web";
import React, { useCallback, useMemo } from "react";
import { logger } from "matrix-js-sdk/src/logger";
import {
    EventTimeline,
    EventType,
    IJoinRuleEventContent,
    JoinRule,
    Room,
    RoomStateEvent,
} from "matrix-js-sdk/src/matrix";

import Modal from "../../../../Modal";
import ShareDialog from "../../dialogs/ShareDialog";
import { _t } from "../../../../languageHandler";
import SettingsStore from "../../../../settings/SettingsStore";
import SdkConfig from "../../../../SdkConfig";
import { calculateRoomVia } from "../../../../utils/permalinks/Permalinks";
import { useEventEmitterState } from "../../../../hooks/useEventEmitter";
import BaseDialog from "../../dialogs/BaseDialog";

/**
 * Display a button to open a dialog to share a link to the call using a element call guest spa url (`element_call:guest_spa_url` in the EW config).
 * @param room
 * @returns Nothing if there is not the option to share a link (No guest_spa_url is set) or a button to open a dialog to share the link.
 */
export const CallGuestLinkButton: React.FC<{ room: Room }> = ({ room }) => {
    const guestSpaUrl = useMemo(() => {
        return SdkConfig.get("element_call").guest_spa_url;
    }, []);

    // We use the direct function only in functions triggered by user interaction to avoid computation on every render.
    const isRoomJoinable = useCallback(
        () => room.getJoinRule() === JoinRule.Public || room.getJoinRule() === JoinRule.Knock,
        [room],
    );

    const isRoomJoinableState = useEventEmitterState(room, RoomStateEvent.Events, isRoomJoinable);

    const canChangeJoinRule = useEventEmitterState(
        room,
        RoomStateEvent.Events,
        () =>
            room
                .getLiveTimeline()
                ?.getState(EventTimeline.FORWARDS)
                ?.maySendStateEvent(EventType.RoomJoinRules, room.myUserId) ?? false,
    );

    const generateCallLink = useCallback(() => {
        if (!isRoomJoinable()) throw new Error("Cannot create link for room that users can not join without invite.");
        if (!guestSpaUrl) throw new Error("No guest SPA url for external links provided.");
        const url = new URL(guestSpaUrl);
        url.pathname = "/room/";
        // Set params for the sharable url
        url.searchParams.set("roomId", room.roomId);
        if (room.hasEncryptionStateEvent()) url.searchParams.set("perParticipantE2EE", "true");
        for (const server of calculateRoomVia(room)) {
            url.searchParams.set("viaServers", server);
        }

        // Move params into hash
        url.hash = "/" + room.name + url.search;
        url.search = "";

        logger.info("Generated element call external url:", url);
        return url;
    }, [guestSpaUrl, isRoomJoinable, room]);

    const showLinkModal = useCallback(() => {
        try {
            // generateCallLink throws if the invite rules are not met
            const target = generateCallLink();
            Modal.createDialog(ShareDialog, {
                target,
                customTitle: _t("share|share_call"),
                subtitle: _t("share|share_call_subtitle"),
            });
        } catch (e) {
            logger.error("Could not generate call link.", e);
        }
    }, [generateCallLink]);

    const shareClick = useCallback(() => {
        if (isRoomJoinable()) {
            showLinkModal();
        } else {
            // the room needs to be set to public or knock to generate a link
            Modal.createDialog(JoinRuleDialog, {
                room,
            }).finished.then(() => {
                // we need to use the function here because the callback got called before the state was updated.
                if (isRoomJoinable()) showLinkModal();
            });
        }
    }, [showLinkModal, room, isRoomJoinable]);

    return (
        <>
            {(canChangeJoinRule || isRoomJoinableState) && guestSpaUrl && (
                <Tooltip label={_t("voip|get_call_link")}>
                    <IconButton onClick={shareClick} aria-label={_t("voip|get_call_link")}>
                        <ExternalLinkIcon />
                    </IconButton>
                </Tooltip>
            )}
        </>
    );
};

/**
 * A dialog to change the join rule of a room to public or knock.
 * @param room The room to change the join rule of.
 * @param onFinished Callback that is getting called if the dialog wants to close.
 */
export const JoinRuleDialog: React.FC<{
    onFinished(): void;
    room: Room;
}> = ({ room, onFinished }) => {
    const askToJoinEnabled = SettingsStore.getValue("feature_ask_to_join");
    const [isUpdating, setIsUpdating] = React.useState<undefined | JoinRule>(undefined);
    const changeJoinRule = useCallback(
        async (newRule: JoinRule) => {
            if (isUpdating !== undefined) return;
            setIsUpdating(newRule);
            await room.client.sendStateEvent(
                room.roomId,
                EventType.RoomJoinRules,
                {
                    join_rule: newRule,
                } as IJoinRuleEventContent,
                "",
            );
            // Show the dialog for a bit to give the user feedback
            setTimeout(() => onFinished(), 500);
        },
        [isUpdating, onFinished, room.client, room.roomId],
    );
    return (
        <BaseDialog title={_t("update_room_access_modal|title")} onFinished={onFinished}>
            <div>
                <p>{_t("update_room_access_modal|description")}</p>
                {askToJoinEnabled && (
                    <Button disabled={isUpdating === JoinRule.Knock} onClick={() => changeJoinRule(JoinRule.Knock)}>
                        {_t("action|ask_to_join")}
                    </Button>
                )}
                <Button
                    // manually add destructive styles because they otherwise get overwritten by .mx_Dialog
                    style={{
                        borderColor: "var(--cpd-color-border-critical-subtle)",
                        color: "var(--cpd-color-text-critical-primary)",
                    }}
                    disabled={isUpdating === JoinRule.Public}
                    onClick={() => changeJoinRule(JoinRule.Public)}
                >
                    {_t("common|public")}
                </Button>
                <br />
                <p>{_t("update_room_access_modal|dont_change_description")}</p>
                <Button
                    kind="tertiary"
                    style={{ border: "none", paddingLeft: 0, paddingRight: 0 }}
                    onClick={() => {
                        if (isUpdating === undefined) onFinished();
                    }}
                >
                    {_t("update_room_access_modal|no_change")}
                </Button>
            </div>
        </BaseDialog>
    );
};
