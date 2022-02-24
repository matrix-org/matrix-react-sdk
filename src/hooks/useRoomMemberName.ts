import { useState, useEffect } from "react";
import { RoomMember } from "matrix-js-sdk/src";

export function useRoomMemberName(member: RoomMember): { name: string, rawDisplayName: string } {
    const [state, setState] = useState({ name: member.name, rawDisplayName: member.rawDisplayName });

    useEffect(() => {
        function updateName() {
            setState({ name: member.name, rawDisplayName: member.rawDisplayName });
        }

        updateName();

        member.on("RoomMember.name", updateName);

        return () => {
            member.removeListener("RoomMember.name", updateName);
        };
    }, [member]);

    return state;
}
