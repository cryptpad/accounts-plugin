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

    const getPlans = () => {
        return Plans.getPlansAccounts();
    };
    const getMySub = () => {
        const metadataMgr = common.getMetadataMgr();
        const privData = metadataMgr.getPrivateData();
        const userData = metadataMgr.getUserData();
        const planId = APP.myPlan.plan;
        const yearly = APP.myPlan.yearly;
        const canceled = APP.myPlan.canceled;
        const planData = Plans.getPlanData(planId);
        const renewal = new Date(APP.myPlan.renewal);
        const renewDate = renewal?.toLocaleDateString(void 0, {
            day: "numeric",
            month: "long",
            year: "numeric"
        });

        // My sub

        const avatar = h('div.cp-avatar');
        const $avatar = $(avatar);
        common.displayAvatar($avatar, userData.avatar, userData.name);

        const manageButton = h('button.btn.btn-case.btn-primary-alt', [
            h('i.fa.fa-id-card-o'),
            h('span', Messages.stripe_manage)
        ]);
        const user = h('div.cp-accounts-user', [
            h('span.cp-accounts-username', userData.name),
            h('span.cp-accounts-usermanage', manageButton)
        ]);

        const priceValue = Plans.getPlanPrice(planId, yearly);
        const priceKey = yearly ? 'price_yearly' : 'price_monthly';
        const priceStr = Messages._getKey(priceKey, [priceValue]);
        const renewStr =  Messages._getKey('renews', [renewDate]);

        const switchCls = canceled ? 'btn-primary' : 'btn-default';
        const switchButton = h(`button.btn.btn-case.${switchCls}`, [
            h('i.fa.fa-ticket'),
            h('span', canceled ? Messages.stripe_renew
                               : Messages.stripe_switch)
        ]);

        const canceledBox = UI.setHTML(h('div.alert.alert-danger'),
            Messages._getKey('canceled', [renewDate]));
        if (canceled) {
            canceledBox.appendChild(h('br'));
            canceledBox.appendChild(switchButton);
        }


        // XXX renews on
        const plan = h('div.cp-accounts-plan', {
            'data-accounts-plan': planId
        }, [
            h('span.cp-accounts-planname.cp-colored', Plans.getPlanName(planId)),
            h('span.cp-accounts-planprice', priceStr),
            h('span.cp-accounts-planrenew', canceled ? canceledBox
                                                     : renewStr),
            canceled ? undefined
                     : h('span.cp-accounts-planswitch', switchButton)
        ]);

        const mySub = h('div.cp-accounts-mysub', [
            avatar,
            user,
            plan
        ]);


        $(manageButton).click(() => {
            Plans.stripePortal(false, (err, val) => {
                if (err) {
                    console.error(err);
                    return void UI.alert(Messages.error);
                }
                common.gotoURL(val);
            });
        });
        $(switchButton).click(() => {
            Plans.stripePortal(!canceled, (err, val) => {
                if (err) {
                    console.error(err);
                    return void UI.alert(Messages.error);
                }
                common.gotoURL(val);
            });
        });

        return h('div', [
            mySub
        ]);
    };

    const andThen = () => {
        const $container = $('#cp-app-accounts-container');

        if (APP.myPlan) {
            return $container.append(getMySub());
        }
        $container.append(getPlans());
    };


    const onSuccess = (category, cb) => {
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
            // XXX handle error and success
            if (err || !val) {
                const alertDiv = UI.setHTML(h('p.alert.alert-danger'),
                    Messages.processing_error);
                $(alertDiv).append([
                    h('br'),
                    Messages.processing_error_details
                ]);
                $content.empty().append(alertDiv);
                if (category === 'subscribe-drive') {
                    return setTimeout(function () {
                        common.gotoURL('/drive');
                    }, 4000);
                }
                return void cb(err);
            }
            setTimeout(function () {
                $container.empty();
                if (category === 'subscribe-drive') {
                    return void common.gotoURL('/drive');
                }
                cb();
            }, 4000);
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
            Plans.init(Messages, void 0, common);
            andThen();
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
            if (!['subscribe-accounts', 'subscribe-drive'].includes(privateData.category)) {
                return;
            }
            onSuccess(privateData.category, waitFor());
        }).nThen(waitFor => {
            Plans.getMySub(waitFor((err, val) => {
                if (!val) { return; }
                console.error(val);
                APP.myPlan = val;
            }));
        }).nThen(() => {
            andThen();
        });
    });
});
