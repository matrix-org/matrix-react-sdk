import SdkConfig from "./SdkConfig";

const TCHAP_API_URL = '/_matrix/identity/api/v1/info?medium=email&address=';
const TCHAP_HOSTS_BASE = 'https://matrix.';

/**
 * Tchap utils.
 */
class Tchap {

    /**
     * Given an email, return the homeserver associated with this email.
     * @param {string} email The email from which we are looking for the server.
     * @returns {Promise}
     */
    static discoverPlatform(email) {
        return new Promise((resolve, reject) => {
            const tchapHostsList = SdkConfig.get()['hs_url_list'];
            if (tchapHostsList) {
                const promises = tchapHostsList.map(url => this._httpRequest(TCHAP_HOSTS_BASE + url + TCHAP_API_URL + email));
                Promise.all(promises).then(data => {
                    let hs = null;
                    let err = null;
                    for (let i = 0; i <= data.length; i++) {
                        if (data[i] && data[i].hs && data[i].hs !== "" && data[i].hs !== null) {
                            hs = data[i].hs;
                        } else if (data[i] && (data[i].hs === "" || data[i].hs === null)) {
                            err = ("ERR_UNAUTHORIZED_EMAIL");
                        } else {
                            err = ("ERR_UNREACHABLE_HOMESERVER");
                        }
                        console.error(err);
                    }
                    if (hs !== null) {
                        resolve(TCHAP_HOSTS_BASE + hs);
                    } else {
                        reject(err);
                    }
                });
            }
        });
    }

    /**
     * A fetch with a timeout option and an always resolver.
     * @param {string} url The url to fetch.
     * @param {object} opts init object from fetch() api plus a timeout option.
     * @returns {Promise}
     * @private
     */
    static _httpRequest(url, opts) {
        const options = opts || {};
        const timeoutValue = options.timeout || 2000;
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                resolve(new Error("timeout"));
            }, timeoutValue);
            fetch(url, options).then(
                (res) => {
                    clearTimeout(timeoutId);
                    resolve(res.json());
                },
                (err) => {
                    clearTimeout(timeoutId);
                    resolve({err});
                });
        });
    }
}

module.exports = Tchap;
