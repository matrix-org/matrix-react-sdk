import { IWidgetData } from "./IWidget";
/**
 * Widget data for m.jitsi widgets.
 */
export interface IJitsiWidgetData extends IWidgetData {
    /**
     * The domain where the Jitsi Meet conference is being held.
     */
    domain: string;
    /**
     * The conference ID (also known as the room name) where the conference is being held.
     */
    conferenceId: string;
    /**
     * Optional. True to indicate that the conference should be without video, false
     * otherwise (default).
     */
    isAudioOnly?: boolean;
}
