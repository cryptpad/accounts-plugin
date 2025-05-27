const ACCOUNTS = {};
const Express = require("express");
const Path = require("node:path");
const fs = require("fs");

ACCOUNTS.addHttpEndpoints = (Env, app) => {
    let dir = Path.join(__dirname, 'client');
    app.use('/accounts', Express.static(dir));
};

module.exports = {
  name: "ACCOUNTS",
  modules: ACCOUNTS
};
