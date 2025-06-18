(() => {
const factory = (Util, Commands) => {
    const Api = {};

    const saveAs = window.saveAs;

    let keys;
    Api._setKeys = _keys => {
        keys = _keys;
        keys.publicKey = Util.decodeBase64(keys.edPublic);
        keys.secretKey = Util.decodeBase64(keys.edPrivate);
    };

    const post = (obj, cb, opts) => {
        if (!keys) { return void cb('MISSING_KEYS'); } 
        Commands(keys, obj, cb, opts);
    };

    Api.subscribe = (plan, isRegister, cb) => {
        post({
            command: 'SUBSCRIBE',
            isRegister,
            user: keys.userName,
            plan
        }, (err, ret) => {
            if (err) { return void cb(err); }
            cb(void 0, ret);
        });
    };
    Api.stripePortal = (isUpdate, cb) => {
        post({
            command: 'STRIPE_PORTAL',
            updateSub: !!isUpdate
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
    Api.getMySub = (cb) => {
        post({
            command: 'GET_MY_SUB',
        }, (err, ret) => {
            if (err) { return void cb(err); }
            cb(void 0, ret);
        });
    };

    Api.addToPlan = (addKey, giftNote, cb) => {
        post({
            command: 'ADD_TO_PLAN',
            addKey,
            giftNote
        }, (err, ret) => {
            if (err) { return void cb(err); }
            cb(void 0, ret);
        });
    };
    Api.cancelGift = (id, cb) => {
        post({
            command: 'CANCEL_GIFT',
            id
        }, (err, ret) => {
            if (err) { return void cb(err); }
            cb(void 0, ret);
        });
    };

    // DPA
    Api.getDpa = (cb) => {
        post({
            command: 'DPA_GET'
        }, (err, ret) => {
            if (err) { return void cb(err); }
            cb(void 0, ret);
        });
    };
    Api.createDpa = (data, cb) => {
        post({
            command: 'DPA_CREATE',
            data
        }, (err, ret) => {
            if (err) { return void cb(err); }
            cb(void 0, ret);
        });
    };
    Api.postSignedDpa = (file, cb) => {
        post({
            command: 'DPA_SIGN',
            file
        }, (err, ret) => {
            if (err) { return void cb(err); }
            cb(void 0, ret);
        }, {
            upload: true
        });
    };
    Api.downloadDPA = (id, signed, cb) => {
        post({
            command: 'DPA_DOWNLOAD',
            id,
            signed
        }, (err, ret) => {
            if (err) { return void cb(err); }
            let name = id ? `CryptPad_DPA_${id}.pdf`
                        : `CryptPad_DPA.pdf`;
            saveAs(ret, name);
            cb();
        }, {
            download: true
        });
    };

    // ADMIN
    Api.getAll = (cb) => {
        post({
            command: 'ADMIN_GET_ALL'
        }, (err, ret) => {
            if (err) { return void cb(err); }
            cb(void 0, ret);
        });
    };
    Api.getSubAdmin = (id, email, key, cb) => {
        post({
            command: 'ADMIN_GET_SUB',
            id, email, key
        }, (err, ret) => {
            if (err) { return void cb(err); }
            cb(void 0, ret);
        });
    };
    Api.updateSubAdmin = (data, cb) => {
        post({
            command: 'ADMIN_UPDATE_SUB',
            data
        }, (err, ret) => {
            if (err) { return void cb(err); }
            cb(void 0, ret);
        });
    };
    Api.stripeSync = (id, cb) => {
        post({
            command: 'ADMIN_FORCE_SYNC',
            id
        }, (err, ret) => {
            if (err) { return void cb(err); }
            cb(void 0, ret);
        });
    };

    Api.adminGift = (plan, key, note, cb) => {
        post({
            command: 'ADMIN_GIFT',
            plan, key, note
        }, (err, ret) => {
            if (err || ret?.error) {
                return void cb(err || ret?.error);
            }
            cb(void 0, ret);
        });
    };

    Api.getDpaAdmin = cb => {
        post({
            command: 'ADMIN_GET_DPA'
        }, (err, ret) => {
            if (err) { return void cb(err); }
            cb(void 0, ret);
        });
    };
    Api.createDpaAdmin = (data, cb) => {
        post({
            command: 'ADMIN_CREATE_DPA',
            data
        }, (err, ret) => {
            if (err) { return void cb(err); }
            cb(void 0, ret);
        });
    };
    Api.unsignDpaAdmin = (id, cb) => {
        post({
            command: 'ADMIN_UNSIGN_DPA',
            id
        }, (err, ret) => {
            if (err) { return void cb(err); }
            cb(void 0, ret);
        });
    };
    Api.cancelDpaAdmin = (id, cb) => {
        post({
            command: 'ADMIN_CANCEL_DPA',
            id
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
    '/components/file-saver/FileSaver.min.js'
], factory);

})();
