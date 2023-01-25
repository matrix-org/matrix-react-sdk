/*
Copyright 2015, 2016, 2023 The Matrix.org Foundation C.I.C.

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

import { RoomMember } from "matrix-js-sdk/src/models/room-member";
import { User } from "matrix-js-sdk/src/models/user";
import { Room } from "matrix-js-sdk/src/models/room";
import { ResizeMethod } from "matrix-js-sdk/src/@types/partials";
import { split } from "lodash";

import DMRoomMap from "./utils/DMRoomMap";
import { mediaFromMxc } from "./customisations/Media";
import { isLocalRoom } from "./utils/localRoom/isLocalRoom";

const DEFAULT_COLORS: Readonly<string[]> = ["#0DBD8B", "#368bd6", "#ac3ba8"];

// Not to be used for BaseAvatar urls as that has similar default avatar fallback already
export function avatarUrlForMember(
    member: RoomMember | null | undefined,
    width: number,
    height: number,
    resizeMethod: ResizeMethod,
): string {
    let url: string | undefined;
    const mxcUrl = member?.getMxcAvatarUrl();
    if (mxcUrl) {
        url = mediaFromMxc(mxcUrl).getThumbnailOfSourceHttp(width, height, resizeMethod);
    }
    if (!url) {
        // member can be null here currently since on invites, the JS SDK
        // does not have enough info to build a RoomMember object for
        // the inviter.
        url = defaultAvatarUrlForString(member ? member.userId : "");
    }
    return url;
}

export function avatarUrlForUser(
    user: Pick<User, "avatarUrl">,
    width: number,
    height: number,
    resizeMethod?: ResizeMethod,
): string | null {
    if (!user.avatarUrl) return null;
    return mediaFromMxc(user.avatarUrl).getThumbnailOfSourceHttp(width, height, resizeMethod);
}

function isValidHexColor(color: string): boolean {
    return (
        typeof color === "string" &&
        (color.length === 7 || color.length === 9) &&
        color.charAt(0) === "#" &&
        !color
            .slice(1)
            .split("")
            .some((c) => isNaN(parseInt(c, 16)))
    );
}

function urlForColor(color: string): string {
    const size = 40;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    // bail out when using jsdom in unit tests
    if (!ctx) {
        return "";
    }
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    return canvas.toDataURL();
}

// XXX: Ideally we'd clear this cache when the theme changes
// but since this function is at global scope, it's a bit
// hard to install a listener here, even if there were a clear event to listen to
const colorToDataURLCache = new Map<string, string>();

export function defaultAvatarUrlForString(s: string | undefined): string {
    if (!s) return ""; // XXX: should never happen but empirically does by evidence of a rageshake

    const color = getColorForString(s);
    let dataUrl = colorToDataURLCache.get(color);
    if (!dataUrl) {
        // validate color as this can come from account_data
        // with custom theming
        if (isValidHexColor(color)) {
            dataUrl = urlForColor(color);
            colorToDataURLCache.set(color, dataUrl);
        } else {
            dataUrl = "";
        }
    }
    return dataUrl;
}

export function getColorForString(input: string): string {
    const charSum = [...input].reduce((s, c) => s + c.charCodeAt(0), 0);
    const index = charSum % DEFAULT_COLORS.length;

    // overwritten color value in custom themes
    const cssVariable = `--avatar-background-colors_${index}`;
    const cssValue = document.body.style.getPropertyValue(cssVariable);
    return cssValue || DEFAULT_COLORS[index]!;
}

/**
 * returns the first (non-sigil) character of 'name',
 * converted to uppercase
 * @param {string} name
 * @return {string} the first letter
 */
export function getInitialLetter(name: string): string | undefined {
    if (!name) {
        // XXX: We should find out what causes the name to sometimes be falsy.
        console.trace("`name` argument to `getInitialLetter` not supplied");
        return undefined;
    }
    if (name.length < 1) {
        return undefined;
    }

    const initial = name[0];
    if ((initial === "@" || initial === "#" || initial === "+") && name[1]) {
        name = name.substring(1);
    }

    // rely on the grapheme cluster splitter in lodash so that we don't break apart compound emojis
    return split(name, "", 1)[0]!.toUpperCase();
}

export function avatarUrlForRoom(
    room: Room | undefined,
    width: number,
    height: number,
    resizeMethod?: ResizeMethod,
): string | null {
    if (!room) return null; // null-guard

    const mxcUrl = room.getMxcAvatarUrl();
    if (mxcUrl) {
        return mediaFromMxc(mxcUrl).getThumbnailOfSourceHttp(width, height, resizeMethod);
    }

    // space rooms cannot be DMs so skip the rest
    if (room.isSpaceRoom()) return null;

    // If the room is not a DM don't fallback to a member avatar
    if (!DMRoomMap.shared().getUserIdForRoomId(room.roomId) && !isLocalRoom(room)) {
        return null;
    }

    // If there are only two members in the DM use the avatar of the other member
    const otherMember = room.getAvatarFallbackMember();
    const otherMemberMxc = otherMember?.getMxcAvatarUrl();
    if (otherMemberMxc) {
        return mediaFromMxc(otherMemberMxc).getThumbnailOfSourceHttp(width, height, resizeMethod);
    }
    return null;
}
