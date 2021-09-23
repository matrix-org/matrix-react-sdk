import { useState, useEffect } from "react";
import { GroupCallParticipant, GroupCallParticipantEvent } from "matrix-js-sdk/src/webrtc/groupCallParticipant";
import { CallFeed } from "matrix-js-sdk/src/webrtc/callFeed";

interface IGroupCallParticipantState {
    displayName: string;
    usermediaFeed?: CallFeed;
}

export function useGroupCallParticipant(participant: GroupCallParticipant) {
    const [{
        displayName,
        usermediaFeed,
    }, setState] = useState<IGroupCallParticipantState>(() => ({
        displayName: participant.member.rawDisplayName, // TODO: Add useRoomMember hook and just return participant.member
        usermediaFeed: participant.usermediaFeed,
    }));

    useEffect(() => {
        function onUpdateParticipant() {
            setState({
                displayName: participant.member.rawDisplayName,
                usermediaFeed: participant.usermediaFeed,
            });
        }

        participant.on(GroupCallParticipantEvent.CallReplaced, onUpdateParticipant);
        participant.on(GroupCallParticipantEvent.CallFeedsChanged, onUpdateParticipant);
        onUpdateParticipant();

        return () => {
            participant.removeListener(GroupCallParticipantEvent.CallReplaced, onUpdateParticipant);
            participant.removeListener(GroupCallParticipantEvent.CallFeedsChanged, onUpdateParticipant);
        };
    }, [participant]);

    return {
        displayName,
        usermediaFeed,
    };
}
