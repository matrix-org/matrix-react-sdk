import { useContext, useMemo } from "react";
import { useMatrixClientContext } from "../../../contexts/MatrixClientContext";
import MemberListViewModel, { IMemberListViewModel } from "./MemberListViewModel";
import { SDKContext } from "../../../contexts/SDKContext";
import { useEventEmitterState } from "../../../hooks/useEventEmitter";
import { canInviteTo } from "../../../utils/room/canInviteTo";
import { RoomStateEvent } from "matrix-js-sdk/src/matrix";
import { MemberService } from "../../../services/rooms/memberlist/MemberSerice";


export function useMemberListViewModel(roomId: string): IMemberListViewModel {
    const cli = useMatrixClientContext()
    const room = cli.getRoom(roomId);
    const sdkContext = useContext(SDKContext);
    const canInviteToState = !!room ? useEventEmitterState(room, RoomStateEvent.Update, () =>  canInviteTo(room)) : false;
    const memberService = useMemo(() => new MemberService(roomId, cli, sdkContext.memberListStore), [roomId]);
    return MemberListViewModel(canInviteToState, room?.isSpaceRoom() ?? false, memberService)
}
