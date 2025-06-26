define([
    '/api/config',
    'jquery',
    '/common/common-util.js',
    '/common/common-interface.js',
    '/common/outer/local-store.js',
    '/common/hyperscript.js',
    '/customize/messages.js'
], function (ApiConfig, $, Util, UI, LocalStore, h, Messages) {
    return function (MyMessages) {
        const extensions = {};

        extensions.TRANSLATIONS = [{
            get: (name) => {
                if (name !== 'accounts') { return; }
                return MyMessages;
            }
        }];

        extensions.SETTINGS_CATEGORY = [{
            id: 'subscription',
            icon: 'fa fa-star-o',
            name: MyMessages.link_name,
            getContent: (common) => {
                return {
                    onClick: () => {
                        common.gotoURL('/accounts');
                    }
                };
            }
        }];

        extensions.SUPPORT_SUBSCRIBE = [{
            getContent: (common) => {
                let plan = common.getMetadataMgr()?.getPrivateData()?.plan;
                if (plan) { return; }
                var url = '/accounts';
                var accountsLink = h('a', {
                    href: url,
                }, Messages.support_premiumLink);
                $(accountsLink).click(function (ev) {
                    ev.preventDefault();
                    common.openURL(url);
                });

                return h('div.cp-support-subscribe.cp-sidebarlayout-element', [
                    h('div.alert.alert-info', [
                        Messages.support_premiumPriority,
                        ' ',
                        accountsLink,
                    ]),
                ]);
            }
        }];

        extensions.HOMEPAGE_BUTTON = [{
            getButton: () => {
                if (!LocalStore.getPremium()) {
                    var sub = h('div.cp-sub-prompt', [
                        h('span', Messages.home_morestorage),
                        h('a.subscribe-btn', {href:"/accounts/"},  [
                            h('i.fa.fa-ticket'),
                            Messages.features_f_subscribe
                        ])
                    ]);
                    return sub;
                } else {
                    return;
                }
            }
        }];

        extensions.PRICING_NAME = [{
            name: Messages.pricing
        }];

        extensions.QUOTA_REACHED = [{
            getAlert: () => {
                var msg = UI.setHTML(h('span'), Messages.pinLimitReachedAlert);
                $(msg).find('a').attr({
                    target: '_blank',
                    href: '/accounts',
                });
                UI.alert(msg);
            }
        }];

        extensions.ACCOUNT_DELETION = [{
            checkDeletion: (common, $button, _cb) => {
                const cb = Util.mkAsync(_cb);
                const metadataMgr = common.getMetadataMgr();
                const priv = metadataMgr.getPrivateData();
                // Check if you have a premium plan
                if (!priv.plan || priv.plan === "custom") {
                    return void cb(true);
                }

                var url = '/accounts#mysubs';
                if (!url) { return; }
                var a = h('a', { href:url }, Messages.settings_deleteSubscription);
                $(a).click(function (e) {
                    e.preventDefault();
                    common.openUnsafeURL(url);
                });
                UI.confirm(h('div', [
                    Messages.settings_deleteWarning, h('p', a)
                ]), function (yes) {
                    if (!yes) {
                        $button.prop('disabled', '');
                        return void cb(false);
                    }
                    cb(true);
                }, {
                    ok: Messages.settings_deleteContinue,
                    okClass: 'btn.btn-danger',
                    cancelClass: 'btn.btn-primary'
                });
            }
        }];

        extensions.USERMENU_ITEM = [{
            getItem: (common) => {
                const priv = common.getMetadataMgr().getPrivateData();
                return {
                    tag: 'a',
                    attributes: {
                        'class': 'fa fa-star-o'
                    },
                    content: h('span', priv.plan ? MyMessages.link_name : Messages.pricing),
                    action: function () {
                        common.openURL(priv.plan ? '/accounts'
                                            :'/features.html');
                    },
                };
            }

        }];

        extensions.USAGE_BUTTON = [{
            getButton: (common, plan) => {
                if (plan && plan !== "custom") { return; }
                var $a = $('<a>', {
                    'class': 'cp-limit-upgrade btn btn-success',
                    href: '/accounts',
                    rel: "noreferrer noopener",
                    target: "_blank",
                }).text(Messages.upgradeAccount);
                return $a;
            }
        }];

        extensions.EXTRA_PRICING = [{
            getContent: groupItem => {
                return h('div.col-12.col-sm-4.cp-premium-user',[
                    h('div.card',[
                        h('div.title-card',[
                            h('h3.text-center',Messages.features_premium)
                        ]),
                        h('div.card-body.cp-pricing',[
                            h('div.text-center', h('a', {
                                href: '/accounts',
                                target: '_blank'
                            }, Messages._getKey('features_pricing', ['5', '10', '15']))),
                            h('div.text-center', Messages.features_emailRequired),
                        ]),
                        h('ul.list-group.list-group-flush', [
                            'reg', // Msg.features_f_reg, .features_f_reg_note
                            'storage2',
                            'support', // Msg.features_f_support, .features_f_support_note
                            'supporter' // Msg.features_f_supporter, .features_f_supporter_note
                        ].map(groupItem)),
                        h('div.card-body',[
                            h('div.cp-features-register#cp-features-subscribe', [
                                h('a', {
                                    href: '/accounts',
                                    target: '_blank',
                                    rel: 'noopener noreferrer',
                                    class: 'cp-features-register-button',
                                }, Messages.features_f_subscribe)
                            ]),
                            LocalStore.isLoggedIn() ? undefined : h('div.cp-note', Messages.features_f_subscribe_note)
                        ]),
                    ]),
                ]);
            }
        }];

        return extensions;
    };
});
