import {MatrixClientPeg} from './MatrixClientPeg'
import WidgetUtils from './utils/WidgetUtils';

export const VoiceChannelStateKey = 'im.riot.voicechannel'
export const VoiceChannelState = {
    enabled: 'enabled', //boolean
    users: 'users' //string[] of userids
}

class VoiceChannelUtils {

    constructor() {}

    _getRoom = (roomId) => {
        return MatrixClientPeg.get().getRoom(roomId)
    }

    _getConferenceWidgetContent = (roomId) => {
        const room = this._getRoom(roomId)
        if (!room) return null;

        const widgets = WidgetUtils.getRoomWidgets(room);
        const currentJitsiVoiceWidgets = widgets.filter((ev) => {
            const content = ev.getContent()
            return ((content.type === 'jitsi' || content.type === "m.jitsi") && content.data.isAudioOnly);
        });
        if (!currentJitsiVoiceWidgets || currentJitsiVoiceWidgets.length <= 0) return false;
        return currentJitsiVoiceWidgets[0].getContent();
    }

    canBeVoiceChannel = (roomId) => {
        return Boolean(this._getConferenceWidgetContent(roomId))
    }

    isVoiceChannel = (roomId) => {
        if (this.canBeVoiceChannel(roomId)) {
            const room = this._getRoom(roomId)
            const event = room.currentState.getStateEvents(VoiceChannelStateKey, '')
            if (!event) return false
            else return Boolean(event.getContent() ? event.getContent()[VoiceChannelState.enabled] : false)
        }
         return false
    }

    getConferenceData = (roomId) => {
        return this._getConferenceWidgetContent(roomId)
    }
}

export default VoiceChannelUtils = new VoiceChannelUtils();