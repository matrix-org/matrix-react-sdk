import {MatrixClientPeg} from './MatrixClientPeg'
import WidgetUtils from './utils/WidgetUtils';
import dis from './dispatcher'

export const VoiceChannelStateKey = 'im.riot.voicechannel'
export const VoiceChannelState = {
    enabled: 'enabled', //boolean
    users: 'users' //{(jitsi)participantId: userId}
}

class VoiceChannelUtils {

    constructor() {}

    _getRoom = (roomId) => {
        return MatrixClientPeg.get().getRoom(roomId)
    }

    _getCurrentConfig = (roomId) => {
        const room = this._getRoom(roomId)
        if (!room) return null
        const stateEvent = room.currentState.getStateEvents(VoiceChannelStateKey, '')
        if (!stateEvent) return null
        return stateEvent.getContent()
    }

    //Returns MatrixEvent of first jitsi widget it can find
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

    //Has valid jitsi widget means it can be configured to act as a voice channel
    canBeVoiceChannel = (roomId) => {
        return Boolean(this._getConferenceWidgetContent(roomId))
    }

    //Current config makes this a voice channel
    isVoiceChannel = (roomId) => {
        if (this.canBeVoiceChannel(roomId)) {
            const config = this._getCurrentConfig(roomId)
            if (!config) return false
            else return Boolean(config[VoiceChannelState.enabled])
        }
         return false
    }

    getConferenceData = (roomId) => {
        return this._getConferenceWidgetContent(roomId)
    }

    // getVoiceChannelContent = (roomId) => {
    //     const event = this._getCurrentConfig(roomId)
    //     if (!event) return null
    //     return event
    // }

    //Actions

    joinAsVoiceChannel = (roomId) => {
        const data = this._getConferenceWidgetContent(roomId).data
        if (!data) return false
        dis.dispatch({
            action: 'join_channel',
            roomId: roomId,
            confId: data.conferenceId,
            jitsiDomain: data.domain
        })
        return true
    }

    //Active functions

    updateState = async (roomId, toUpdate) => {
        const config = this._getCurrentConfig(roomId)
        //No config means that the room probably isnt a voice channel eg. The user 'joined as voice channel'
        if (!config) return null
        Object.assign(config, toUpdate)
        //Empty object wont have overwritten keys. Obviously want to clear voicechannel config
        if (Object.keys(toUpdate).length === 0) config = {}
        console.log('VCU state update', config)
        await MatrixClientPeg.get().sendStateEvent(roomId, VoiceChannelStateKey, config, '')
    }

    //Gets current room state event data listing the users in the voice channel
    //returns object{jitsiPartcipantId: matrixUserId} mapping or null
    // Note: object can be empty. eg no key value pairs
    getUsers = (roomId) => {
        const config = this._getCurrentConfig(roomId)
        if (!config) return null
        return (config[VoiceChannelState.users] ? config[VoiceChannelState.users] : null)
    }

    setUsers = (roomId, userMap = {}) => {
        const updatedConfig = {[VoiceChannelState.users]: userMap}
        this.updateState(roomId, updatedConfig)
    }

    addUser = (roomId, userData) => {
        const users = this.getUsers(roomId)
        this.setUsers(roomId, Object.assign(users, userData))
    }

    removeUser = (roomId, participantId) => {
        const users = this.getUsers(roomId)
        delete users[participantId]
        this.setUsers(roomId, users)
    }
}

export default VoiceChannelUtils = new VoiceChannelUtils();