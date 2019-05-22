import MatrixClientPeg from './MatrixClientPeg';
import SdkConfig from "./SdkConfig";
import TchapApi from './TchapApi';

/**
 * Tchap utils.
 */
class Tchap {

    /**
     * Return a short value for getDomain().
     * @returns {string} The shortened value of getDomain().
     */
    static getShortDomain() {
        const cli = MatrixClientPeg.get();
        const baseDomain = cli.getDomain();
        const domain = baseDomain.split('.tchap.gouv.fr')[0].split('.').reverse().filter(Boolean)[0];

        return this._capitalize(domain) || 'Tchap';
    }

    /**
     * Return a domain name from a room_id.
     * @param {string} id The room_id to analyse.
     * @returns {string} The extracted domain name.
     */
    static getDomainFromId(id) {
        const domain = id.split(':').reverse()[0].split('.tchap.gouv.fr')[0].split('.').filter(Boolean).reverse()[0];

        return this._capitalize(domain) || 'Tchap';
    }

    /**
     * Given an email, return the homeserver associated with this email.
     * @param {string} email The email from which we are looking for the server.
     * @returns {Promise}
     */
    static discoverPlatform(email) {
        const hostBase = TchapApi.hostBase;
        const infoUrl = TchapApi.info;
        return new Promise((resolve, reject) => {
            const tchapHostsList = this._shuffle(SdkConfig.get()['hs_url_list']);
            if (tchapHostsList) {
                const promises = tchapHostsList.map(url => this._httpRequest(hostBase + url + infoUrl + email, {}));
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
                        resolve(hostBase + hs);
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

    /**
     * A static function shuffeling an array.
     * @param {array} arr The array to shuffle.
     * @returns {array} The array shuffeled.
     * @private
     */
    static _shuffle(arr) {
        for (let index = 0; index < arr.length; index++) {
            const r = Math.floor(Math.random() * arr.length);
            const tmp = arr[index];
            arr[index] = arr[r];
            arr[r] = tmp;
        }
        return arr.slice(0, arr.length);
    }

    /**
     * Capitalize a string.
     * @param {string} s The sting to capitalize.
     * @returns {string} The capitalized string.
     * @private
     */
    static _capitalize(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
}

module.exports = Tchap;
