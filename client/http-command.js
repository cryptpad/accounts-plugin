// SPDX-FileCopyrightText: 2023 XWiki CryptPad Team <contact@cryptpad.org> and contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

(() => {
const factory = (nThen, Util, ApiConfig, Nacl) => {

    const API_ORIGIN = ApiConfig.accounts_api;
    const url = new URL(ApiConfig.httpUnsafeOrigin);
    const DOMAIN = url.host;


    var clone = o => JSON.parse(JSON.stringify(o));
    var randomToken = () => Util.encodeBase64(Nacl.randomBytes(24));
    var postData = function (url, data, cb, opts) {
        var CB = Util.once(Util.mkAsync(cb));
        const isUpload = opts?.upload && data instanceof FormData ;
        const headers = {};
        if (!isUpload) {
            headers['Content-Type'] = 'application/json';
        }
        fetch(url, {
            method: 'POST',
            headers,
            body: isUpload ? data : JSON.stringify(data),
        }).then(response => {
            if (opts?.download) {
                return response.blob().then(result => {
                    CB(void 0, result);
                });
            }

            if (response.ok) {
                return void response.text().then(result => { CB(void 0, Util.tryParse(result)); });
            }

            response.json().then(result => {
                CB(response.status, result);
            });
            //CB(response.status, response);
        }).catch(error => {
            CB(error);
        });
    };

    var serverCommand = function (keypair, my_data, _cb, opts) {
        const cb = Util.mkAsync(_cb);
        if (!API_ORIGIN) { return void cb("ACCOUNTS_API_NOT_SET"); }

        var obj = clone(my_data);
        obj.publicKey = Util.encodeBase64(keypair.publicKey);
        obj.nonce = randomToken();
        obj.domain = DOMAIN;
        var href = new URL(`/api/auth/`, API_ORIGIN);
        var txid, date;
        nThen(function (w) {
            // Tell the server we want to do some action
            postData(href, obj, w((err, data) => {
                if (err) {
                    w.abort();
                    console.error(err);
                    // there might be more info here
                    if (data) { console.error(data); }
                    return void cb(err);
                }

                // if the requested action is valid, it responds with a txid and a nonce
                // bundle all that up into an object, stringify it, and sign it.
                // respond with an object: {sig, txid}
                if (!data.date || !data.txid) {
                    w.abort();
                    return void cb('REQUEST_REJECTED');
                }
                txid = data.txid;
                date = data.date;
            }));
        }).nThen(function (w) {
            var copy = clone(obj);
            copy.txid = txid;
            copy.date = date;
            var toSign = Util.decodeUTF8(JSON.stringify(copy));
            var sig = Nacl.sign.detached(toSign, keypair.secretKey);
            var encoded = Util.encodeBase64(sig);
            var obj2 = {
                sig: encoded,
                txid: txid,
            };

            if (opts?.upload) {
                const data = new FormData();
                data.append('sig', encoded);
                data.append('txid', txid);
                data.append('blob', my_data.file);
                obj2 = data;
                href = new URL(`/api/authblob/`, API_ORIGIN);
            }

            postData(href, obj2, w((err, data) => {
                if (err) {
                    w.abort();
                    console.error(err);
                    // there might be more info here
                    if (data) { console.error(data); }
                    return void cb("RESPONSE_REJECTED", data);
                }
                cb(void 0, data);
            }), opts);
        });
    };

    return serverCommand;
};

define([
    '/components/nthen/index.js',
    '/common/common-util.js',
    '/api/config',
    '/components/tweetnacl/nacl-fast.min.js',
], (nThen, Util, ApiConfig) => {
    return factory(nThen, Util, ApiConfig, window.nacl);
});

})();
