const Accounts = {};
const Express = require("express");
const Path = require("node:path");
const Https = require("node:https");
const Http = require("node:http");
const config = require('./config/config');

const Nacl = require("tweetnacl/nacl-fast");
const NaclUtil = require("tweetnacl-util");

const loadJSON = _cb => {
    let cb = (err, value) => {
        _cb(err, value);
        cb = () => {};
    };

    const accountsURL = config?.accountsOrigin;
    if (!accountsURL) { return void cb('INVALID_CONFIG'); }

    // Configure options for local and prod setups
    const options = {
        host: undefined,
        path: '/api/plans',
        method: 'GET',
        headers: {
            "Accept": "application/json",
        }
    };
    let H = Https;
    let url = new URL(accountsURL);
    if (!['https:', 'http:'].includes(url.protocol)) {
        return void cb('INVALID_PROTOCOL');
    }
    if (url.protocol === 'http:') { H = Http; }
    let port = Number(url.port);
    if (port && typeof(port) === 'number') { options.port = port; }
    options.host = url.hostname;

    // Create and send request
    const req = H.request(options, res => {
        if (!('' + res.statusCode).match(/^2\d\d$/)) {
            return void cb('SERVER ERROR ' + res.statusCode);
        }
        let str = '';

        res.on('data', chunk => { str += chunk; });
        res.on('end', () => {
            try {
                let json = JSON.parse(str);
                cb(void 0, json);
            } catch (e) { cb(e); }
        });
    });
    req.on('error', function (e) {
        cb(e);
        cb = () => {};
    });
    req.end();
};

let json;
let refreshTime = 0;
//const cacheDuration = 24*3600*1000; // 1DAY
const cacheDuration = 10*1000;
const retryDelay = 5*1000;
const getJSON = cb => {
    // JSON exists and is recent: serve it
    if (refreshTime && refreshTime > +new Date()) {
        if (!json) { return void cb('NO_JSON'); }
        return void cb(void 0, json);
    }
    // We neet to load or refresh our json
    loadJSON((err, value) => {
        if (err || !value) {
            refreshTime = +new Date() + retryDelay;
            json = undefined;
            return void cb('NO_JSON');
        }
        json = value;
        refreshTime = +new Date() + cacheDuration;
        cb(void 0, value);
    });

};

const checkProof = (Env, proof) => {
    if (!config.accountsSecret && !proof) { return true; }
    if (!config.accountsSecret) { return false; }
    if (!proof) { return false; }

    const secretKey = NaclUtil.decodeBase64(config.accountsSecret);
    const [ nonce64, message64 ] = proof.split('|');
    if (!nonce64 || !message64) { return false; }

    const encryptedMessage = NaclUtil.decodeBase64(message64);
    const nonce = NaclUtil.decodeBase64(nonce64);

    const message = Nacl.secretbox.open(encryptedMessage, nonce, secretKey);
    if (!message) { return false; }

    const str = NaclUtil.encodeUTF8(message);
    try {
        let json = JSON.parse(str);
        let time = json.time;
        const diff = Math.abs(+new Date() - time);
        return diff < 10000; // Allow 10s offset
    } catch (e) {
        return false;
    }
};

Accounts.addHttpEndpoints = (Env, app) => {
    let dir = Path.join(__dirname, 'client');
    app.get('/accounts/plans.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        getJSON((err, json) => {
            if (err || !json) {
                return void res.status(404).send();
            }
            res.send(json);
        });
    });
    app.use('/accounts', Express.static(dir));

    app.post('/api/updatequota', function (req, res) {
        if (!Env.accounts_api) {
            return res.status(404).send();
        }

        let body = req.body;
        const proof = body?.auth;
        const check = checkProof(Env, proof);
        if (!check) { return res.status(200).send(); }

        Env.sendMessage({
            command: 'UPDATE_QUOTA',
        }, (err) => {
            if (err) {
                return res.status(500).send();
            }
            res.status(200).send();
        });
    });

    getJSON((err, value) => {
        if (err) {}
        json = value;
    });
};

Accounts.customizeEnv = Env => {
    Env.accounts_api = config?.accountsOrigin;
    let url = new URL(Env.httpUnsafeOrigin);
    Env.accounts_domain = url.host;
    Env.accounts_subdomain = config.cryptpadAPISubdomain;
};

module.exports = {
  name: "ACCOUNTS",
  modules: Accounts
};
