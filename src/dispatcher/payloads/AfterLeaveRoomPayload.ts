import { Room } from "matrix-js-sdk";

import { Action } from "../actions";
import { ActionPayload } from "../payloads";

export interface AfterLeaveRoomPayload extends ActionPayload {
    action: Action.AfterLeaveRoom;
    // eslint-disable-next-line camelcase
    room_id?: Room["roomId"];
}
