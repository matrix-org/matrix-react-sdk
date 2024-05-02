export type RoomMember = {
    roomId: string;
    userId: string;
    displayUserId: string
    name: string;
    rawDisplayName?: string;
    disambiguate: boolean;
    avatarThumbnailUrl?: string;
    powerLevel: number;
    lastModifiedTime: number;
};
