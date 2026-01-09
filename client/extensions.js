define([
    '/api/config',
    'jquery',
    '/accounts/plans.js',
    '/common/common-util.js',
    '/common/common-interface.js',
    '/common/outer/local-store.js',
    '/common/hyperscript.js',
    '/common/common-icons.js',
    '/customize/messages.js'
], function (ApiConfig, $, Plans, Util, UI, LocalStore, h, Icons, Messages) {
    return function (MyMessages) {
        const extensions = {};

        Icons.add({
            "pricing": "circle-star",
            "subscribe": "ticket",
            "trophy": "trophy",
            "credit-card": "credit-card",
            "circle-left": "circle-chevron-left",
            "notebook": "notepad-text",
            "user": "user-round"
        });

        extensions.TRANSLATIONS = [{
            get: (name) => {
                if (name !== 'accounts') { return; }
                return MyMessages;
            }
        }];
        extensions.POST_REGISTER = [{
            getContent: (data) => {
                const keys = Util.clone(data?.proxy || data);
                Plans.init(MyMessages, keys, void 0);
                return Plans.getPlansRegister();
            }
        }];

        extensions.SETTINGS_CATEGORY = [{
            id: 'subscription',
            name: MyMessages.link_name,
            icon: 'pricing',
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
                const content = h('div.cp-support-subscribe.cp-sidebarlayout-element');

                common.onAccountOnline(metadataMgr => {
                    let plan = metadataMgr.getPrivateData()?.plan;
                    if (plan) { return content.remove(); }
                    var url = '/accounts';
                    var accountsLink = h('a', {
                        href: url,
                    }, Messages.support_premiumLink);
                    $(accountsLink).click(function (ev) {
                        ev.preventDefault();
                        common.openURL(url);
                    });

                    const value = h('div.alert.alert-info', [
                        Messages.support_premiumPriority,
                        ' ',
                        accountsLink,
                    ]);
                    content.appendChild(value);
                });

                return content;
            }
        }];

        extensions.HOMEPAGE_BUTTON = [{
            getButton: () => {
                if (!LocalStore.getPremium()) {
                    var sub = h('div.cp-sub-prompt', [
                        h('span', Messages.home_morestorage),
                        h('a.subscribe-btn', {href:"/accounts/"},  [
                            Icons.get('subscribe', {style: 'margin-bottom:.25rem;'}),
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
                    content: [Icons.get('pricing'), h('span', priv.plan ? MyMessages.link_name : Messages.pricing)],
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
