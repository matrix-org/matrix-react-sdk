const q = require('q');
const request = q.nfbind(require('browser-request'));

export default class RtsClient {
    constructor(url) {
        this._url = url;
    }

    getTeamsConfig() {
        return request({
            url: this._url + '/teams',
            json: true,
        });
    }

    trackReferral(referrer, user_id, user_email) {
        return request({
            url: this._url + '/register',
            json: true,
            body: {referrer, user_id, user_email},
            method: 'POST',
        });
    }

    getTeam(team_token) {
        return request({
            url: this._url + '/teamConfiguration',
            json: true,
            qs: {team_token},
        });
    }
}
