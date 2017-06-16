import UserSettingsStore from './UserSettingsStore';

export default class ShouldHideEvent {
    constructor() {
        this.syncedSettings = UserSettingsStore.getSyncedSettings();
    }

    _isLeaveOrJoin(ev) {
        const isMemberEvent = ev.getType() === 'm.room.member' && ev.getStateKey() !== undefined;
        if (!isMemberEvent) {
            return false; // bail early: all the checks below concern member events only
        }

        // TODO: These checks are done to make sure we're dealing with membership transitions not avatar changes / dupe joins
        //       These checks are also being done in TextForEvent and should really reside in the JS SDK as a helper function
        const membership = ev.getContent().membership;
        const prevMembership = ev.getPrevContent().membership;
        if (membership === prevMembership && membership === 'join') {
            // join -> join : This happens when display names change / avatars are set / genuine dupe joins with no changes.
            //                Find out which we're dealing with.
            if (ev.getPrevContent().displayname !== ev.getContent().displayname) {
                return false; // display name changed
            }
            if (ev.getPrevContent().avatar_url !== ev.getContent().avatar_url) {
                return false; // avatar url changed
            }
            // dupe join event, fall through to hide rules
        }

        // this only applies to joins/leaves not invites/kicks/bans
        const isJoinOrLeave = membership === 'join' || (membership === 'leave' && ev.getStateKey() === ev.getSender());
        return isJoinOrLeave;
    }

    check(ev) {
        // Hide redacted events
        if (this.syncedSettings['hideRedactions'] && ev.isRedacted()) return true;
        if (this.syncedSettings['hideJoinLeaves'] && this._isLeaveOrJoin(ev)) return true;

        return false;
    }
}
