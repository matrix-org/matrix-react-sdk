import { IPartialEvent } from "../../IPartialEvent";
import { Optional } from "../../types";
import { ExtensibleEvent } from "../../events/ExtensibleEvent";
import { NamespacedValue } from "../../NamespacedValue";
export declare const LEGACY_M_ROOM_MESSAGE: NamespacedValue<"m.room.message", string>;
export interface IPartialLegacyContent {
    body: string;
    msgtype: string;
    format?: string;
    formatted_body?: string;
}
export declare function parseMRoomMessage(wireEvent: IPartialEvent<IPartialLegacyContent>): Optional<ExtensibleEvent>;
