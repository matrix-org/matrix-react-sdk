"use strict";
/*
Copyright 2021-2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeBase64 = exports.encodeBase64 = exports.decryptAttachment = exports.encryptAttachment = void 0;
var crypto_1 = __importDefault(require("crypto"));
function encryptAttachment(plaintextBuffer) {
    return __awaiter(this, void 0, void 0, function () {
        var ivArray, cryptoKey, exportedKey, cipher, ciphertextBuffer, sha256Buffer;
        return __generator(this, function (_a) {
            ivArray = crypto_1.default.randomBytes(16);
            ivArray.fill(0, 8);
            cryptoKey = crypto_1.default.randomBytes(32);
            exportedKey = {
                kty: 'oct',
                key_ops: ['encrypt', 'decrypt'],
                alg: 'A256CTR',
                // node 14+ supports base64url encoding directly, but node 12 doesn't so we implement the mapping ourselves
                k: Buffer.from(cryptoKey).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
                ext: true,
            };
            cipher = crypto_1.default.createCipheriv('aes-256-ctr', cryptoKey, ivArray);
            ciphertextBuffer = Buffer.concat([
                cipher.update(plaintextBuffer),
                cipher.final(),
            ]);
            sha256Buffer = crypto_1.default.createHash('sha256').update(ciphertextBuffer).digest();
            return [2 /*return*/, {
                    data: ciphertextBuffer,
                    info: {
                        v: 'v2',
                        key: exportedKey,
                        iv: encodeBase64(ivArray),
                        hashes: {
                            sha256: encodeBase64(sha256Buffer),
                        },
                    },
                }];
        });
    });
}
exports.encryptAttachment = encryptAttachment;
// this is based on https://github.com/matrix-org/matrix-content-scanner/blob/main/src/decrypt.js
function decryptAttachment(dataBuffer, info) {
    var _a;
    if (info === undefined || info.key === undefined || info.iv === undefined ||
        info.hashes === undefined || info.hashes.sha256 === undefined) {
        throw new Error('Invalid info. Missing info.key, info.iv or info.hashes.sha256 key');
    }
    if (info.v !== 'v2') {
        throw new Error("Unsupported protocol version: " + ((_a = info.v) !== null && _a !== void 0 ? _a : 'v0'));
    }
    var expectedSha256base64 = info.hashes.sha256;
    // Convert from JWK to openssl algorithm
    // See https://www.w3.org/2012/webcrypto/wiki/KeyWrap_Proposal#JSON_Web_Key
    var algorithms = {
        'oct': {
            'A256CTR': 'aes-256-ctr',
        },
    };
    var alg = algorithms[info.key.kty] ? algorithms[info.key.kty][info.key.alg] : undefined;
    if (!alg) {
        throw new Error("Unsupported key type/algorithm: " +
            ("key.kty = " + info.key.kty + ", kry.alg = " + info.key.alg));
    }
    var key = decodeBase64(info.key.k);
    // Calculate SHA 256 hash, encode as base64 without padding
    var hashDigestBase64 = encodeBase64(crypto_1.default.createHash('sha256').update(dataBuffer).digest());
    if (hashDigestBase64 !== expectedSha256base64) {
        throw new Error('Unexpected sha256 hash of encrypted data');
    }
    var iv = decodeBase64(info.iv);
    var decipher = crypto_1.default.createDecipheriv(alg, key, iv);
    return Buffer.concat([
        decipher.update(dataBuffer),
        decipher.final(),
    ]);
}
exports.decryptAttachment = decryptAttachment;
function encodeBase64(uint8Array) {
    var padded = Buffer.from(uint8Array).toString('base64');
    // remove padding
    var inputLength = uint8Array.length;
    var outputLength = 4 * Math.floor((inputLength + 2) / 3) + (inputLength + 2) % 3 - 2;
    // Return the unpadded base64.
    return padded.slice(0, outputLength);
}
exports.encodeBase64 = encodeBase64;
function decodeBase64(base64) {
    // add padding if needed
    var paddedBase64 = base64 + '==='.slice(0, (4 - base64.length % 4) % 4);
    return Buffer.from(paddedBase64, 'base64');
}
exports.decodeBase64 = decodeBase64;
//# sourceMappingURL=nodejs.js.map