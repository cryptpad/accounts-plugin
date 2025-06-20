// Load #1, load as little as possible because we are in a race to get the loading screen up.
define([
    '/components/nthen/index.js',
    '/api/config',
    '/common/dom-ready.js',
    '/customize/messages.js',
    '/common/sframe-common-outer.js',
], function (nThen, ApiConfig, DomReady, Messages, SFCommonO) {

    // Loaded in load #2
    nThen(function (waitFor) {
        DomReady.onReady(waitFor());
    }).nThen(function (waitFor) {
        SFCommonO.initIframe(waitFor, null, '/accounts/app/');
    }).nThen(function (/*waitFor*/) {
        var addRpc = function (sframeChan, Cryptpad/*, Utils*/) {
            sframeChan.on('ACCOUNTS_GET_KEYS', function (data, cb) {
                Cryptpad.getAccessKeys(function (obj) {
                    if (!Array.isArray(obj) || !obj.length) { return void cb(); }
                    const keys = obj.find(data => { return !data.id; });
                    keys.userName = localStorage.User_name;
                    cb(keys);
                });
            });
            sframeChan.on('Q_UPDATE_LIMIT', function (data, cb) {
                Cryptpad.updatePinLimit(function (e) {
                    cb({error: e});
                });
            });
        };
        var category;
        if (window.location.hash) {
            category = window.location.hash.slice(1);
            window.location.hash = '';
        }
        var addData = function (obj) {
            if (category) { obj.category = category; }
        };
        SFCommonO.start({
            requires: 'drive',
            noRealtime: true,
            addRpc: addRpc,
            addData: addData
        });
    });
});
