import MatrixClientPeg from "../MatrixClientPeg";
import 'isomorphic-fetch';
import {PkEncryption} from "olm";
import Promise from "bluebird";
import {decryptFile} from "./DecryptFile";
import TchapApi from '../TchapApi';

class ContentScanner {

    /**
     * Generating a generic error.
     * @param {boolean} state The state of the file (clean or not).
     * @param {string} message The error message.
     * @returns {{clean: *, error: *}}
     */
    static generateError(state, message) {
        return {
            clean: state,
            error: message,
        };
    }

    /**
     * Scan a Matrix Event content.
     * If the content is a file or an encrypted file, a promise containing the scan result is returned.
     * Thumbnails for image files are not processed because a scan is ran every time a download is called.
     * @param content A Mtrix Event content.
     * @returns {Promise<*>}
     */
    static async scanContent(content) {
        const baseUrl = MatrixClientPeg.get()['baseUrl'];

        if (content.file !== undefined) {
            // Getting the public key if the server answer
            let publicKey;
            try {
                const publicKeyData = await fetch(baseUrl + TchapApi.publicKeyUrl);
                const publicKeyObject = await publicKeyData.json();
                publicKey = publicKeyObject.public_key;
            } catch (err) {
                console.warn(`Unable to retrieve the publicKey : ${err}`);
            }

            let body;
            if (publicKey) {
                // Setting up the encryption
                const encryption = new PkEncryption();
                encryption.set_recipient_key(publicKey);
                body = {encrypted_body: encryption.encrypt(JSON.stringify({file: content.file}))};
            } else {
                body = {file: content.file};
            }

            return Promise.resolve(fetch(baseUrl + TchapApi.scanEncryptedUrl, {
                headers: {
                    'Content-Type': 'application/json',
                },
                method: "POST",
                body: JSON.stringify(body),
            })
                .then(res => { return res.json(); })
                .then(data => {
                    return data;
                }).catch(err => {
                    console.error(err);
                    return this.generateError(false, 'Error: Unable to join the MCS server');
                }));
        } else if (content.url !== undefined) {
            const fileUrl = content.url.split('//')[1];

            return Promise.resolve(fetch(`${baseUrl + TchapApi.scanUnencryptedUrl}${fileUrl}`)
                .then(res => { return res.json(); })
                .then(data => {
                    return data;
                }).catch(err => {
                    console.error(err);
                    return this.generateError(false, "Error: Cannot fetch the file");
                }));
        } else {
            return this.generateError(false, 'Error: This is not a matrix content');
        }
    }

    /**
     * Download an unencrypted content.
     * @param content A Mtrix Event content.
     * @param isThumb If the requested data will be a thumbnail.
     * @returns {*} A string or an error object.
     */
    static downloadContent(content, isThumb = false) {
        const baseUrl = MatrixClientPeg.get()['baseUrl'];

        if (content.url !== undefined) {
            const fileUrl = content.url.split('//')[1];
            let url;
            if (isThumb) {
                url = `${baseUrl + TchapApi.downloadUnencryptedThumnailUrl}${fileUrl}${TchapApi.thumbnailParams}`;
            } else {
                url = `${baseUrl + TchapApi.downloadUnencryptedUrl}${fileUrl}`;
            }
            return url;
        } else {
            return this.generateError(false, 'Error: This is not a matrix content');
        }
    }

    /**
     * Download an encrypted content.
     * @param content A Mtrix Event content.
     * @param isThumb If the requested data will be a thumbnail.
     * @returns {Promise<*>} A Promise or an error object.
     */
    static async downloadContentEncrypted(content, isThumb = false) {
        if (content.file !== undefined || content.info.thumbnail_file !== undefined) {
            let file = isThumb ? content.info.thumbnail_file : content.file;
            let blob = await decryptFile(file);

            if (blob) {
                return blob;
            } else {
                return new Blob([], {type: 'application/octet-stream'});
            }

        } else {
            return this.generateError(false, 'Error: This is not a matrix content');
        }
    }
}

module.exports = ContentScanner;
