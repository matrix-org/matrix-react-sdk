export default {
    hostBase: "https://matrix.",
    info: "/_matrix/identity/api/v1/info?medium=email&address=",
    publicKeyUrl: "/_matrix/media_proxy/unstable/public_key",
    scanEncryptedUrl: "/_matrix/media_proxy/unstable/scan_encrypted",
    scanUnencryptedUrl: "/_matrix/media_proxy/unstable/scan/",
    downloadUnencryptedUrl: "/_matrix/media_proxy/unstable/download/",
    downloadEncryptedUrl: "/_matrix/media_proxy/unstable/download_encrypted",
    downloadUnencryptedThumbnailUrl: "/_matrix/media_proxy/unstable/thumbnail/",
    thumbnailParams: "?width=800&height=600&method=scale",
    lookup: "/_matrix/client/unstable/account/3pid/lookup",
    accountValidityResendEmailUrl: "/_matrix/client/unstable/account_validity/send_mail",
    passwordRulesUrl: "/_matrix/client/r0/password_policy",
};
