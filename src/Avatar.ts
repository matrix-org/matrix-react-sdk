/*
Copyright 2015, 2016 OpenMarket Ltd

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

import DMRoomMap from './utils/DMRoomMap';
import { mediaFromMxc } from "./customisations/Media";
import SettingsStore from "./settings/SettingsStore";

// Not to be used for BaseAvatar urls as that has similar default avatar fallback already
export function avatarUrlForMember(
    member: RoomMember,
    width: number,
    height: number,
    resizeMethod: ResizeMethod,
): string {
    let url: string;
    if (member?.getMxcAvatarUrl()) {
        url = mediaFromMxc(member.getMxcAvatarUrl()).getThumbnailOfSourceHttp(width, height, resizeMethod);
    }
    if (!url) {
        // member can be null here currently since on invites, the JS SDK
        // does not have enough info to build a RoomMember object for
        // the inviter.
        url = defaultAvatarUrlForString(member ? member.userId : '');
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
    return typeof color === "string" &&
        (color.length === 7 || color.length === 9) &&
        color.charAt(0) === "#" &&
        !color.substr(1).split("").some(c => isNaN(parseInt(c, 16)));
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

export function defaultAvatarUrlForString(s: string): string {
    if (!s) return ""; // XXX: should never happen but empirically does by evidence of a rageshake
    const defaultColors = ['#0DBD8B', '#368bd6', '#ac3ba8'];
    let total = 0;
    for (let i = 0; i < s.length; ++i) {
        total += s.charCodeAt(i);
    }
    const colorIndex = total % defaultColors.length;
    // overwritten color value in custom themes
    const cssVariable = `--avatar-background-colors_${colorIndex}`;
    const cssValue = document.body.style.getPropertyValue(cssVariable);
    const color = cssValue || defaultColors[colorIndex];
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

/**
 * returns the first (non-sigil) character of 'name',
 * converted to uppercase
 * @param {string} name
 * @return {string} the first letter
 */
export function getInitialLetter(name: string): string {
    if (!name) {
        // XXX: We should find out what causes the name to sometimes be falsy.
        console.trace("`name` argument to `getInitialLetter` not supplied");
        return undefined;
    }
    if (name.length < 1) {
        return undefined;
    }

    let idx = 0;
    const initial = name[0];
    if ((initial === '@' || initial === '#' || initial === '+') && name[1]) {
        idx++;
    }

    // string.codePointAt(0) would do this, but that isn't supported by
    // some browsers (notably PhantomJS).
    let chars = 1;
    const first = name.charCodeAt(idx);

    // check if it’s the start of a surrogate pair
    if (first >= 0xD800 && first <= 0xDBFF && name[idx+1]) {
        const second = name.charCodeAt(idx+1);
        if (second >= 0xDC00 && second <= 0xDFFF) {
            chars++;
        }
    }

    const firstChar = name.substring(idx, idx+chars);
    return firstChar.toUpperCase();
}

export function avatarUrlForRoom(room: Room, width: number, height: number, resizeMethod?: ResizeMethod) {
    if (!room) return null; // null-guard

    if (room.getMxcAvatarUrl()) {
        return mediaFromMxc(room.getMxcAvatarUrl()).getThumbnailOfSourceHttp(width, height, resizeMethod);
    }

    // space rooms cannot be DMs so skip the rest
    if (SettingsStore.getValue("feature_spaces") && room.isSpaceRoom()) return null;

    let otherMember = null;
    const otherUserId = DMRoomMap.shared().getUserIdForRoomId(room.roomId);
    if (otherUserId) {
        otherMember = room.getMember(otherUserId);
    } else {
        // if the room is not marked as a 1:1, but only has max 2 members
        // then still try to show any avatar (pref. other member)
        otherMember = room.getAvatarFallbackMember();
    }
    if (otherMember?.getMxcAvatarUrl()) {
        return mediaFromMxc(otherMember.getMxcAvatarUrl()).getThumbnailOfSourceHttp(width, height, resizeMethod);
    }
    return null;
}
