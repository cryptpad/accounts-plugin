const Accounts = {};
const Express = require("express");
const Path = require("node:path");
const fs = require("fs");
const config = require('./config/config.json');

Accounts.addHttpEndpoints = (Env, app) => {
    let dir = Path.join(__dirname, 'client');
    let json = Path.join(__dirname, 'config', 'plans.json');
    app.get('/accounts/plans.json', (req, res) => {
        res.sendFile(json);
    });
    app.use('/accounts', Express.static(dir));
};

Accounts.customizeEnv = Env => {
    Env.accounts_api = config?.accountsOrigin;
    Env.myDomain = config.cryptpadDomain;
    Env.mySubdomain = config.cryptpadSubdomain;
};

module.exports = {
  name: "ACCOUNTS",
  modules: Accounts
};
