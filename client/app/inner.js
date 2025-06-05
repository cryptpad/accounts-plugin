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

    const andThen = () => {
        const $container = $('#cp-app-accounts-container');

        let content = Plans.getPlansAccounts();

        $container.append(content);


    };


    const onSuccess = (cb) => {
        const $container = $('#cp-app-accounts-container');

        const content = h('div#cp-success-page', [
            h('div.cp-spinner-div center',
                h('p.alert.alert-primary', Messages.processing_wait),
                h('div.cp-spinner-container', [
                    h('i.fa.fa-spinner.fa-pulse.fa-3x.fa-fw.loading'),
                    h('span.loading-message', Messages.processing)
                ])
            )
        ]);
        const $content = $(content);
        $container.append(content);

        Plans.checkSession((err, val) => {
            if (err || !val) {
                const alertDiv = UI.setHTML(h('p.alert.alert-danger'),
                    Messages.processing_error);
                $(alertDiv).append([
                    h('br'),
                    Messages.processing_error_details
                ]);
                $content.empty().append(alertDiv);
                return void cb(err);
            }
            setTimeout(function () {
                $container.empty();
                cb();
            }, 2000);
        });

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

        nThen(waitFor => {
            sFrameChan.query('ACCOUNTS_GET_KEYS', null, waitFor((err, keys) => {
                if (err) {
                    console.error(err);
                    return void UI.removeLoadingScreen();
                }
                Plans.init(Messages, keys, common);
                UI.removeLoadingScreen();
            }));
        }).nThen(waitFor => {
            if (privateData.category !== "subscribe-success") {
                return;
            }
            onSuccess(waitFor());
        }).nThen(() => {
            andThen();
        });
    });
});
