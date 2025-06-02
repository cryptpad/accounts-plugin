define([
    'jquery',
    '/api/config',
    '/common/toolbar.js',
    '/components/nthen/index.js',
    '/common/sframe-common.js',
    '/common/hyperscript.js',
    '/common/common-interface.js',
    '/common/common-ui-elements.js',
    '/common/common-util.js',
    '/common/common-hash.js',
    '/customize/messages.js',
    '/common/extensions.js',
    '/accounts/plans.js',

    'css!/components/bootstrap/dist/css/bootstrap.min.css',
    'css!/components/components-font-awesome/css/font-awesome.min.css',
    'less!/accounts/app/app-accounts.less',
], function (
    $,
    ApiConfig,
    Toolbar,
    nThen,
    SFCommon,
    h,
    UI,
    UIElements,
    Util,
    Hash,
    MessagesCP,
    Extensions,
    Plans
    )
{

    var APP = {};
    try {
        APP.isBrave = navigator.brave.isBrave();
    } catch (e) {}

    var common;

    let Messages = {};
    // Get translations from plugin
    Extensions.getExtensionsSync('TRANSLATIONS').forEach(ext => {
        try {
            let m = ext.get('accounts');
            if (m) { Messages = m; }
        } catch (e) {}
    });

    const andThen = (keys) => {
        const $container = $('#cp-app-accounts-container');

        let content = Plans.getPlansAccounts(Messages, keys, common);

        $container.append(content);


    };


    var createToolbar = function () {
        var displayed = ['useradmin', 'newpad', 'limit', 'pageTitle', 'notifications'];
        var configTb = {
            displayed: displayed,
            sfCommon: common,
            $container: APP.$toolbar,
            pageTitle: Messages.accountsPage,
            metadataMgr: common.getMetadataMgr(),
        };
        APP.toolbar = Toolbar.create(configTb);
        APP.toolbar.$rightside.hide();
    };

    nThen(function (waitFor) {
        $(waitFor(UI.addLoadingScreen));
        SFCommon.create(waitFor(function (c) { APP.common = common = c; }));
    }).nThen(function (waitFor) {
        APP.$toolbar = $('#cp-toolbar');
        sFrameChan = common.getSframeChannel();
        sFrameChan.onReady(waitFor());
    }).nThen(function (/*waitFor*/) {
        createToolbar();
        var metadataMgr = APP.metadataMgr = common.getMetadataMgr();
        var privateData = metadataMgr.getPrivateData();
        common.setTabTitle(Messages.accountsPage);

        APP.isAdmin = privateData?.edPublic &&
                        ApiConfig?.adminKeys?.includes(privateData.edPublic);

        APP.origin = privateData.origin;
        APP.loggedIn = common.isLoggedIn();
        APP.myEdPublic = privateData.edPublic;

        if (!common.isLoggedIn()) {
            // XXX
            return void UI.removeLoadingScreen();
        }

        sFrameChan.query('ACCOUNTS_GET_KEYS', null, function (err, keys) {
            if (err) {
                console.error(err);
                return void UI.removeLoadingScreen();
            }
            // XXX render page
            UI.removeLoadingScreen();
            andThen(keys);
            /*
            Auth.auth(res, function (err) {
                if (err) { console.error(err); }
                renderPage();
                createLeftside();
                UI.removeLoadingScreen();
            }, common);
            */
        });
    });
});
