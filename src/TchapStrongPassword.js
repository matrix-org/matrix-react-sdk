import TchapApi from './TchapApi';

/**
 * Strong Password utils.
 */
class TchapStrongPassword {
    static async _getRules(hsUrl) {
        let res = await fetch(`${hsUrl}${TchapApi.passwordRulesUrl}`);
        return await res.json();
    }

    static validatePassword(hsUrl, pwd) {
        return this._getRules(hsUrl).then(data => {
            let isPwdValid = true;
            let newConditions = this._rewriteKeys(data);
            Object.keys(newConditions).forEach(c => {
                if (!this[`_${c}`](pwd, newConditions[c])) {
                    isPwdValid = false;
                }
            });
            return isPwdValid;
        });
    }

    static _minimum_length(pwd, len) {
        return pwd.length >= len;
    }

    static _require_uppercase(pwd, c) {
        if (c) {
            return (/[A-Z]/.test(pwd));
        }
        return true;
    }

    static _require_symbol(pwd, c) {
        if (c) {
            return (/[^a-zA-Z0-9]/.test(pwd));
        }
        return true;
    }

    static _require_digit(pwd, c) {
        if (c) {
            return (/[0-9]/.test(pwd));
        }
        return true;
    }

    static _require_lowercase(pwd, c) {
        if (c) {
            return (/[a-z]/.test(pwd));
        }
        return true;
    }

    static _getRewritedKey() {
        return {
            "m.require_uppercase": "require_uppercase",
            "m.require_symbol": "require_symbol",
            "m.require_digit": "require_digit",
            "m.minimum_length": "minimum_length",
            "m.require_lowercase": "require_lowercase"
        }
    }

    static _rewriteKeys(obj) {
        let rwk = this._getRewritedKey();
        const keyValues = Object.keys(obj).map(key => {
            const newKey = rwk[key] || key;
            return { [newKey]: obj[key] };
        });
        return Object.assign({}, ...keyValues);
    }

}

module.exports = TchapStrongPassword;
