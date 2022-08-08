import { IPartialEvent } from "../../IPartialEvent";
import { Optional } from "../../types";
import { MessageEvent } from "../../events/MessageEvent";
import { M_MESSAGE_EVENT_CONTENT } from "../../events/message_types";
export declare function parseMMessage(wireEvent: IPartialEvent<M_MESSAGE_EVENT_CONTENT>): Optional<MessageEvent>;
