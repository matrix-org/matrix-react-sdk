/*
 * Copyright 2020 - 2021 The Matrix.org Foundation C.I.C.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Symbols } from "../Symbols";

export enum MatrixCapabilities {
    Screenshots = "m.capability.screenshot",
    StickerSending = "m.sticker",
    AlwaysOnScreen = "m.always_on_screen",
    /**
     * @deprecated It is not recommended to rely on this existing - it can be removed without notice.
     * Ask Element to not give the option to move the widget into a separate tab.
     */
    RequiresClient = "io.element.requires_client",
    /**
     * @deprecated It is not recommended to rely on this existing - it can be removed without notice.
     */
    MSC2931Navigate = "org.matrix.msc2931.navigate",
    MSC3846TurnServers = "town.robin.msc3846.turn_servers",
}

export type Capability = MatrixCapabilities | string;

export const StickerpickerCapabilities: Capability[] = [MatrixCapabilities.StickerSending];
export const VideoConferenceCapabilities: Capability[] = [MatrixCapabilities.AlwaysOnScreen];

/**
 * Determines if a capability is a capability for a timeline.
 * @param {Capability} capability The capability to test.
 * @returns {boolean} True if a timeline capability, false otherwise.
 */
export function isTimelineCapability(capability: Capability): boolean {
    // TODO: Change when MSC2762 becomes stable.
    return capability?.startsWith("org.matrix.msc2762.timeline:");
}

/**
 * Determines if a capability is a timeline capability for the given room.
 * @param {Capability} capability The capability to test.
 * @param {string | Symbols.AnyRoom} roomId The room ID, or `Symbols.AnyRoom` for that designation.
 * @returns {boolean} True if a matching capability, false otherwise.
 */
export function isTimelineCapabilityFor(capability: Capability, roomId: string | Symbols.AnyRoom): boolean {
    return capability === `org.matrix.msc2762.timeline:${roomId}`;
}

/**
 * Gets the room ID described by a timeline capability.
 * @param {string} capability The capability to parse.
 * @returns {string} The room ID.
 */
export function getTimelineRoomIDFromCapability(capability: Capability): string {
    return capability.substring(capability.indexOf(":") + 1);
}
