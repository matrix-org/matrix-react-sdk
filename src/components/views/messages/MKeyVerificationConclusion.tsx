/*
Copyright 2019, 2020 The Matrix.org Foundation C.I.C.

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

import React, { useState } from "react";
import classNames from "classnames";
import { MatrixEvent, EventType } from "matrix-js-sdk/src/matrix";
import { VerificationPhase, VerificationRequest, VerificationRequestEvent } from "matrix-js-sdk/src/crypto-api";
import { CryptoEvent } from "matrix-js-sdk/src/crypto";

import { MatrixClientPeg } from "../../../MatrixClientPeg";
import { _t } from "../../../languageHandler";
import { getNameForEventRoom, userLabelForEventRoom } from "../../../utils/KeyVerificationStateObserver";
import EventTileBubble from "./EventTileBubble";
import { useTypedEventEmitter } from "../../../hooks/useEventEmitter";
import { useAsyncMemo } from "../../../hooks/useAsyncMemo";

interface IProps {
    /* the MatrixEvent to show */
    mxEvent: MatrixEvent;
    timestamp?: JSX.Element;
}

export function MKeyVerificationConclusion({ mxEvent, timestamp }: IProps): JSX.Element | null {
    const request = mxEvent.verificationRequest;
    const client = MatrixClientPeg.safeGet();

    // key is used to trigger rerender when we received event
    const [key, setKey] = useState(0);
    useTypedEventEmitter(client, CryptoEvent.UserTrustStatusChanged, async (userId: string) => {
        const request = mxEvent.verificationRequest;

        // rerender only for the current user
        if (request?.otherUserId === userId) {
            setKey((key) => ++key);
        }
    });
    useTypedEventEmitter(request, VerificationRequestEvent.Change, () => {
        setKey((key) => ++key);
    });

    // check at every received request event if the verification is still ongoing
    const isDisplayed = useAsyncMemo(
        () => isVerificationOngoing(mxEvent, mxEvent.verificationRequest),
        [mxEvent, mxEvent.verificationRequest, key],
        false,
    );

    if (!isDisplayed || !request) return null;

    const myUserId = client.getUserId();
    let title: string | undefined;

    if (request.phase === VerificationPhase.Done) {
        title = _t("timeline|m.key.verification.done", {
            name: getNameForEventRoom(client, request.otherUserId, mxEvent.getRoomId()!),
        });
    } else if (request.phase === VerificationPhase.Cancelled) {
        const userId = request.cancellingUserId;
        if (userId === myUserId) {
            title = _t("timeline|m.key.verification.cancel|you_cancelled", {
                name: getNameForEventRoom(client, request.otherUserId, mxEvent.getRoomId()!),
            });
        } else if (userId) {
            title = _t("timeline|m.key.verification.cancel|user_cancelled", {
                name: getNameForEventRoom(client, userId, mxEvent.getRoomId()!),
            });
        }
    }

    if (title) {
        const classes = classNames("mx_cryptoEvent mx_cryptoEvent_icon", {
            mx_cryptoEvent_icon_verified: request.phase === VerificationPhase.Done,
        });
        return (
            <EventTileBubble
                key={key}
                className={classes}
                title={title}
                subtitle={userLabelForEventRoom(client, request.otherUserId, mxEvent.getRoomId()!)}
                timestamp={timestamp}
            />
        );
    }

    return null;
}

/**
 * Check the verification is not pending, the other user is verified,
 * and we didn't receive a cancel or done event after the verification ending
 * @param mxEvent matrixEvent related to the verification request
 * @param request the verification request
 */
export async function isVerificationOngoing(mxEvent: MatrixEvent, request?: VerificationRequest): Promise<boolean> {
    // normally should not happen
    if (!request) {
        return false;
    }
    // .cancel event that was sent after the verification finished, ignore
    if (mxEvent.getType() === EventType.KeyVerificationCancel && request.phase !== VerificationPhase.Cancelled) {
        return false;
    }
    // .done event that was sent after the verification cancelled, ignore
    if (mxEvent.getType() === EventType.KeyVerificationDone && request.phase !== VerificationPhase.Done) {
        return false;
    }

    // request hasn't concluded yet
    if (request.pending) {
        return false;
    }

    // User isn't actually verified
    const userVerificationStatus = await MatrixClientPeg.safeGet()
        .getCrypto()
        ?.getUserVerificationStatus(request.otherUserId);
    if (!userVerificationStatus?.isVerified()) {
        return false;
    }

    return true;
}
