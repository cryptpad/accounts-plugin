(() => {
const factory = (Util, Commands) => {
    const Api = {};

    let keys;
    Api._setKeys = _keys => {
        keys = _keys;
        keys.publicKey = Util.decodeBase64(keys.edPublic);
        keys.secretKey = Util.decodeBase64(keys.edPrivate);
    };

    const post = (obj, cb) => {
        if (!keys) { return void cb('MISSING_KEYS'); } 
        Commands(keys, obj, cb);
    };

    Api.subscribe = (plan, redirectURL, cb) => {
        post({
            command: 'SUBSCRIBE',
            redirectURL,
            user: keys.userName,
            plan
        }, (err, ret) => {
            if (err) { return void cb(err); }
            cb(void 0, ret);
        });
    };
    Api.stripePortal = (type, redirectURL, cb) => {
        post({
            command: 'STRIPE_PORTAL',
            redirectURL,
            type
        }, (err, ret) => {
            if (err) { return void cb(err); }
            if (ret?.error || !ret?.url) {
                console.error(ret.error || 'NO_URL');
                return void cb('INVALID_PORTAL');
            }
            cb(void 0, ret.url);
        });
    };

    Api.checkSession = (cb) => {
        post({
            command: 'CHECK_SESSION',
        }, (err, ret) => {
            if (err) { return void cb(err); }
            cb(void 0, ret);
        });
    };

    return Api;
};

define([
    '/common/common-util.js',
    '/accounts/http-command.js',
], factory);

})();
