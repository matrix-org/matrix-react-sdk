import { RoomMember } from "../../../models/rooms/RoomMember";
import { ThreePIDInvite } from "../../../models/rooms/ThreePIDInvite";

export interface IMemberService { 
    load(): void
    unload(): void
    loadMembers(searchQuery: string): Promise<Record<"joined" | "invited", RoomMember[]>>;
    setOnMemberListUpdated(callback: (reload: boolean) => void): void;
    setOnPresemceUpdated(callback: (userId: string) => void): void;
    getThreePIDInvites(): ThreePIDInvite[];
    shouldShowInvite(): boolean;
    showPresence(): boolean
}