import { PresenceState } from "./PresenceState";

export type UserPresence = {
    presence: PresenceState;
    lastModifiedTime: number;
    lastActiveAgo: number;
    lastPresenceTime: number;
    currentlyActive: boolean;
};
