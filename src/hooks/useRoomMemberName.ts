import { useState, useEffect } from "react";
import { RoomMember } from "matrix-js-sdk/src";

export function useRoomMemberName(member: RoomMember): string {
    const [name, setName] = useState(member.name);

    useEffect(() => {
        function updateName() {
            setName(member.name);
        }

        updateName();

        member.on("RoomMember.name", updateName);

        return () => {
            member.removeListener("RoomMember.name", updateName);
        };
    }, [member]);

    return name;
}
