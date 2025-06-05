const Accounts = {};
const Express = require("express");
const Path = require("node:path");
const Https = require("node:https");
const Http = require("node:http");
const config = require('./config/config');

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
    let tries = 0;
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
