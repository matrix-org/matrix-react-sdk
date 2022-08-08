/**
 * Partial types for a Matrix Event.
 */
export interface IPartialEvent<TContent> {
    type: string;
    content: TContent;
}
