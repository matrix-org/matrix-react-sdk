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

import React, { forwardRef, useContext } from "react";
import { MatrixEvent } from "matrix-js-sdk/src/matrix";
import { IRoomEncryption } from "matrix-js-sdk/src/crypto/RoomList";

import { _t } from "../../../languageHandler";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import EventTileBubble from "./EventTileBubble";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import DMRoomMap from "../../../utils/DMRoomMap";
import { CardContext } from "../right_panel/context";
import { objectHasDiff } from "../../../utils/objects";
import { isLocalRoom } from "../../../utils/localRoom/isLocalRoom";
import AccessibleButton from "../elements/AccessibleButton";
import dis from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";

interface IProps {
    mxEvent: MatrixEvent;
    timestamp?: JSX.Element;
}

const ALGORITHM = "m.megolm.v1.aes-sha2";

const EncryptionEvent = forwardRef<HTMLDivElement, IProps>(({ mxEvent, timestamp }, ref) => {
    const cli = useContext(MatrixClientContext);
    const roomId = mxEvent.getRoomId()!;
    const isRoomEncrypted = MatrixClientPeg.safeGet().isRoomEncrypted(roomId);

    const prevContent = mxEvent.getPrevContent() as IRoomEncryption;
    const content = mxEvent.getContent<IRoomEncryption>();
    const card = useContext(CardContext);

    // if no change happened then skip rendering this, a shallow check is enough as all known fields are top-level.
    if (!objectHasDiff(prevContent, content)) return null; // nop

    if (content.algorithm === ALGORITHM && isRoomEncrypted) {
        let subtitle: React.ReactNode | string;
        const dmPartner = DMRoomMap.shared().getUserIdForRoomId(roomId);
        const room = cli?.getRoom(roomId);
        if (prevContent.algorithm === ALGORITHM) {
            subtitle = _t("Some encryption parameters have been changed.");
        } else if (dmPartner) {
            console.log("dmPartner is", dmPartner);
            const dmPartnerRoomMember = room?.getMember(dmPartner);
            console.log("dmPartnerRoomMember is", dmPartnerRoomMember);
            const displayName = dmPartnerRoomMember?.rawDisplayName || dmPartner;
            const profileLinkOnClick = () => {
                if (!dmPartnerRoomMember) {
                    // We were unable to fetch membership info for the other user in this DM. Do nothing.
                    return;
                }

                // Display the other user's profile information.
                dis.dispatch({
                    action: Action.ViewUser,
                    member: dmPartnerRoomMember,
                    push: card.isCard,
                });
            };

            subtitle = _t(
                "Messages here are end-to-end encrypted. Verify %(displayName)s in <a>their profile</a>.",
                { displayName },
                {
                    a: (sub) => (
                        <AccessibleButton kind="link_inline" onClick={profileLinkOnClick}>
                            {sub}
                        </AccessibleButton>
                    )
                }
            );
        } else if (room && isLocalRoom(room)) {
            subtitle = _t("Messages in this chat will be end-to-end encrypted.");
        } else {
            subtitle = _t(
                "Messages in this room are end-to-end encrypted. When people join, you can verify them in their profile, just tap on their profile picture.",
            );
        }

        return (
            <EventTileBubble
                className="mx_cryptoEvent mx_cryptoEvent_icon"
                title={_t("common|encryption_enabled")}
                subtitle={subtitle}
                timestamp={timestamp}
            />
        );
    }

    if (isRoomEncrypted) {
        return (
            <EventTileBubble
                className="mx_cryptoEvent mx_cryptoEvent_icon"
                title={_t("common|encryption_enabled")}
                subtitle={_t("Ignored attempt to disable encryption")}
                timestamp={timestamp}
            />
        );
    }

    return (
        <EventTileBubble
            className="mx_cryptoEvent mx_cryptoEvent_icon mx_cryptoEvent_icon_warning"
            title={_t("Encryption not enabled")}
            subtitle={_t("The encryption used by this room isn't supported.")}
            ref={ref}
            timestamp={timestamp}
        />
    );
});

export default EncryptionEvent;
