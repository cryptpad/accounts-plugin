module.exports = {
    // Origin of your CryptPad accounts server
    accountsOrigin: "https://example.tld",

    /**
     * IF you use a complex CryptPad setup with a different backend/API server,
     * you must specify a subdomain or your main CryptPad domain for this API server.
     * LEAVE EMPTY if you use a classic CryptPad installation

     * When your backend server will reach the accounts server to get the quota
     * of each user, the accounts server will
     *   1. check that this cryptpadAPISubdomain is a subdomain of your main CryptPad domain
     *   2. make sure the IP of the server sending the request matches the IP of the subdomain provided
     **/
    cryptpadAPISubdomain: ""
}
