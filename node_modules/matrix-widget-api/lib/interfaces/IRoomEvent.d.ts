export interface IRoomEvent {
    type: string;
    sender: string;
    event_id: string;
    room_id: string;
    state_key?: string;
    origin_server_ts: number;
    content: unknown;
    unsigned: unknown;
}
