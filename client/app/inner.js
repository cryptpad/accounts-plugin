define([
    'jquery',
    '/api/config',
    '/common/toolbar.js',
    '/components/nthen/index.js',
    '/common/sframe-common.js',
    '/common/hyperscript.js',
    '/common/common-interface.js',
    '/common/common-ui-elements.js',
    '/common/common-signing-keys.js',
    '/common/common-util.js',
    '/common/common-hash.js',
    '/common/common-icons.js',
    '/customize/messages.js',
    '/customize/fonts/lucide.js',
    '/common/extensions.js',
    '/accounts/app/admin.js',
    '/accounts/app/dpa.js',
    '/accounts/plans.js',
    '/accounts/api.js',

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
    Keys,
    Util,
    Hash,
    Icons,
    MessagesCP,
    Lucide,
    Extensions,
    Admin,
    Dpa,
    Plans,
    Api
    )
{

    const APP = {};
    const evOnRefresh = Util.mkEvent();

    let common;

    let Messages = {};
    // Get translations from plugin
    Extensions.getExtensionsSync('TRANSLATIONS').forEach(ext => {
        try {
            let m = ext.get('accounts');
            if (m) { Messages = m; }
        } catch (e) {}
    });

    const findUserTeam = key => {
        const metadataMgr = common.getMetadataMgr();
        const privData = metadataMgr.getPrivateData();
        const friends = common.getFriends(true);
        const teams = privData.teams;
        return Object.values(friends).find(obj => {
            return obj.edPublic === key;
        }) || Object.values(teams).find(obj => {
            return obj.edPublic === key;
        }) || undefined;
    };

    const getHeader = () => {
        const subs = APP.myPlan ? h('button.btn#cp-accounts-goto-mysub', {
            href: '/accounts'
        }, [
            Icons.get('circle-left'),
            h('span', Messages.goto_mysub)
        ]) : undefined;
        if (APP.myPlan) {
            $(subs).click(e => {
                e.preventDefault();
                evOnRefresh.fire();
            });
            // Hidden link for plans: use card button
            if (APP.cat === 'plans') { $(subs).hide(); }
        }

        const admin = APP.isAdmin ? h('button.btn', {
            href: '/accounts'
        }, [
            Icons.get('administration'),
            h('span', Messages.goto_admin)
        ]) : undefined;
        if (APP.isAdmin) {
            $(admin).click(e => {
                e.preventDefault();
                evOnRefresh.fire(false, 'admin');
            });
        }

        return h('div.cp-accounts-mysub-header', [
            h('div.cp-accounts-links', [
                APP.cat !== 'admin' ? admin : undefined,
                APP.cat !== 'subs' ? subs : undefined
            ])
        ]);
    };
    const getPlansLink = () => {
        const plans = h('a', {
            href: '/accounts'
        }, [
            Icons.get('credit-card'),
            h('span', Messages.goto_plans)
        ]);
        $(plans).click(e => {
            e.preventDefault();
            evOnRefresh.fire(false, 'plans');
        });

        return h('div.cp-accounts-mysub-allplans', [
            h('div.cp-accounts-links', [
                APP.cat !== 'plans' ? plans : undefined
            ])
        ]);

    };

    const getPlans = () => {
        return h('div', [
            getHeader(),
            Plans.getPlansAccounts(APP.myPlan)
        ]);
    };

    const getDpa = () => {
        return Dpa.getDpaUser(Api, APP);
    };

    const getSubData = () => {
        const metadataMgr = common.getMetadataMgr();
        const userData = metadataMgr.getUserData();
        const planId = APP.myPlan.plan;
        const yearly = APP.myPlan.yearly;
        const canceled = APP.myPlan.canceled;

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

        // Gifted sub: don't show stripe buttons and price
        const gifted = APP.myPlan?.shared || APP.myPlan?.adminGift;
        if (gifted && APP.myPlan?.owner) {
            const owner = APP.myPlan.owner;
            const ownerData = findUserTeam(owner);
            const ownerName = ownerData?.displayName
                                || ownerData?.name
                                || Messages.unknown;

            const ownerAvatar = h('div.cp-avatar');
            common.displayAvatar($(ownerAvatar),
                                ownerData?.avatar, '?');

            const byTxt = APP.myPlan?.shared ?
                            Messages.shared_by :
                            Messages.gifted_by;
            const user = h('div.cp-accounts-user', [
                h('span.cp-accounts-username', userData.name),
            ]);

            const cancel = h('button.btn.btn-danger', [
                Icons.get('close'),
                Messages.cancel
            ]);
            Util.onClickEnter($(cancel), () => {
                UI.confirm(Messages.confirmCancel, yes => {
                    if (!yes) { return; }
                    Api.cancelGift(APP.myPlan?.id, err => {
                        if (err) {
                            console.error(err);
                            return void UI.warn(Messages.error);
                        }
                        evOnRefresh.fire();
                    });
                });
            });

            const plan = h('div.cp-accounts-plan', {
                'data-accounts-plan': planId
            }, [
                h('span.cp-accounts-planname.cp-colored', Plans.getPlanName(planId)),
                h('div.cp-accounts-usershared', [
                    h('label', byTxt),
                    h('div.cp-accounts-sharedby', [
                        ownerAvatar,
                        h('span', ownerName || Messages.unknown)
                    ])
                ]),
                h('span.cp-accounts-planswitch', cancel)
            ]);

            return h('div.cp-accounts-mysub.cp-gifted', [
                avatar,
                user,
                plan
            ]);
        }


        const manageButton = h('button.btn.btn-case.btn-primary-alt', [
            Icons.get('user-directory'),
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
            Icons.get('subscribe'),
            h('span', canceled ? Messages.stripe_renew
                               : Messages.stripe_switch)
        ]);

        const canceledBox = UI.setHTML(h('div.alert.alert-danger'),
            Messages._getKey('canceled', [renewDate]));
        if (canceled) {
            canceledBox.appendChild(h('br'));
            canceledBox.appendChild(switchButton);
        }

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

        $(manageButton).click(() => {
            Api.stripePortal(false, (err, val) => {
                if (err) {
                    console.error(err);
                    return void UI.alert(Messages.error);
                }
                common.gotoURL(val);
            });
        });
        $(switchButton).click(() => {
            Api.stripePortal(!canceled, (err, val) => {
                if (err) {
                    console.error(err);
                    return void UI.alert(Messages.error);
                }
                common.gotoURL(val);
            });
        });

        return h('div.cp-accounts-mysub', [
            avatar,
            user,
            plan
        ]);
    };
    const getStorage = () => {
        const planId = APP.myPlan.plan;
        const planData = Plans.getPlanData(planId);

        const quota = planData.quota;

        const quotaGB = MessagesCP._getKey('formattedGB', [quota]);
        const limit = h('div.cp-accounts-storage-limit', [
            Messages._getKey('mysub_quota', [quotaGB])
        ]);

        const bar = h('div.cp-accounts-storage-bar', [
            h('div.cp-usage-bar')
        ]);
        const used = h('div.cp-accounts-storage-used');
        const $usage = $(bar).find('.cp-usage-bar');
        const showUsage = data => {
            const usedGB = UIElements.prettySize(data.usage);
            const percent = Math.round(1000*data.usage/data.limit)/10;
            $(bar).css('display', 'flex');
            $usage.css('width', `${percent}%`);
            used.innerText = Messages._getKey('mysub_used', [
                usedGB,
                percent
            ]);
        };
        const updateBar = () => {
            if (APP.usage) {
                return void showUsage(APP.usage);
            }
            common.getPinUsage(void 0, (err, data) => {
                if (err) {
                    console.error(err);
                    return;
                }
                if (data.plan !== planId) {
                    const error = h('div.alert.alert-danger', Messages.quota_error);
                    fetch(`${APP.origin}/api/updatequota`).then(r => {
                        if (r.status === 200) {
                            return void updateBar();
                        }
                        console.error(r.status, r);
                        used.appendChild(error);
                    }).catch(err => {
                        console.error(err);
                        used.appendChild(error);
                    });
                    return;
                }
                APP.usage = data;
                showUsage(data);
            });
        };
        updateBar();

        return h('div.cp-accounts-storage', [
            limit,
            bar,
            used
        ]);
    };

    const getDrives = () => {
        // Gifted shared plan: can't manage extra drives
        if (APP.myPlan.shared) { return; }

        const metadataMgr = common.getMetadataMgr();
        const privData = metadataMgr.getPrivateData();
        const planId = APP.myPlan.plan;
        const planData = Plans.getPlanData(planId);
        const driveData = APP.myPlan.drives || {};
        const driveKeys = Object.keys(driveData);

        // Personal plan: can't manage extra drives
        //if (planData?.drives === 1) { return; }

        const number = h('div.cp-accounts-drives-number', [
            Messages._getKey('drives', [
                Messages._getKey('drivesNumber', [
                    (driveKeys.length + 1),
                    planData.drives
                ])
            ])
        ]);
        const list = h('div.cp-accounts-drives-list');

        let addAdded = false;

        const addHandlers = (profile, remove, subId, userData) => {
            Util.onClickEnter($(profile), () => {
                const hash = userData.profile;
                const href = Hash.hashToHref(hash, 'profile');
                common.openURL(href);
            });
            Util.onClickEnter($(remove), () => {
                Api.cancelGift(subId, err => {
                    if (err) {
                        console.error(err);
                        return void UI.warn(Messages.error);
                    }
                    evOnRefresh.fire();
                });
            });
        };

        const makeEntry = (key, subId, _name) => {
            const privData = metadataMgr.getPrivateData();
            if (key) {
                const userData = findUserTeam(key) || {
                    name: _name
                };

                const avatar = h('div.cp-avatar');
                const $avatar = $(avatar);
                const name = userData.name || userData.displayName;
                common.displayAvatar($avatar, userData.avatar, name);

                const isMe = key === privData.edPublic;

                const teamIcon = Icons.get('users', {
                    title: Messages.team_drive,
                    'aria-label': Messages.team_drive
                });
                const profile = Icons.get('user', {
                    role: 'button',
                    tabindex: 0,
                    title: MessagesCP.profileButton,
                    'aria-label': MessagesCP.profileButton
                });
                const remove = Icons.get('close', {
                    role: 'button',
                    tabindex: 0,
                    title: Messages.remove_label,
                    'aria-label': Messages.remove_label
                });
                const actions = isMe ? undefined : h('div.cp-actions', [
                    userData.profile ? profile : undefined,
                    userData.roster ? teamIcon : undefined,
                    remove
                ]);
                addHandlers(profile, remove, subId, userData);

                const userClass = isMe ? '.cp-me' : '.cp-user';
                return h('div.cp-accounts-drive'+userClass, [
                    Icons.get('drive'),
                    avatar,
                    h('span.cp-drive-data', name),
                    actions
                ]);
            }
            const data = addAdded ? h('span.cp-drive-data') :
                UI.setHTML(h('span.cp-drive-data'),
                    Messages._getKey('drive_add', [
                        Icons.get('user').outerHTML,
                        Icons.get('users').outerHTML
                    ]));
            addAdded = true;
            return h('div.cp-accounts-drive.cp-add', {
                'aria-label': data.innerText,
                'role': 'button',
                tabindex: 0
            }, [
                Icons.get('drive'),
                Icons.get('add'),
                data
            ]);
        };

        const openDriveModal = cb => {
            const privData = metadataMgr.getPrivateData();
            const friendsData = common.getFriends();

            const addedKeys = Object.values(driveData).map(obj => {
                return obj.key;
            });
            Object.keys(friendsData).forEach(k => {
                const obj = friendsData[k];
                if (addedKeys.includes(obj.edPublic)) {
                    delete friendsData[k];
                }
            });

            const _teams = privData.teams;
            const teamsData = {};
            Object.values(_teams).forEach(obj => {
                if (!obj.edPublic) { return; }
                if (addedKeys.includes(obj.edPublic)) { return; }
                teamsData[obj.edPublic] = {
                    displayName: obj.name,
                    edPublic: obj.edPublic,
                    avatar: obj.avatar,
                };
            });

            const key = UI.dialog.selectable('', {
                id: 'cp-accounts-contact-key'
            });

            const onSelected = (el) => {
                if (!el) {
                    return void $(key).val('');
                }
                const name = $(el).attr('data-name');
                const ed = $(el).attr('data-ed');
                const pub = Hash.getPublicSigningKeyString(APP.origin, name, ed);
                $(key).val(pub);
            };
            const msg = Messages.add_contact;
            const contactsPicker = UIElements.getUserTeamPicker(common, {
                msg, friendsData, teamsData
            }, onSelected);
            const note = h('input#cp-accounts-contact-note', {
                placeholder: Messages.gift_note
            });
            const contactsContent = h('div', [
                contactsPicker,
                h('div', [
                    h('label', {
                        for: 'cp-accounts-contact-key'
                    }, Messages.public_key),
                    key
                ]),
                h('div', [
                    h('label', {
                        for: 'cp-accounts-contact-note'
                    }, Messages.gift_note_label),
                    note
                ])
            ]);

            const contactsModal = UI.dialog.customModal(contactsContent, {
                buttons: [{
                    name: MessagesCP.cancel,
                    className: 'btn-cancel',
                    onClick: () => {}
                }, {
                    name: Messages.add_key,
                    iconClass: 'add',
                    className: 'btn-primary',
                    onClick: () => {
                        const val = $(key).val();
                        try {
                            const parsed = Keys.parseUser(val);
                            if (!parsed.pubkey) {
                                UI.warn(MessagesCP.admin_invalKey);
                                return true;
                            }
                            const noteTxt = $(note).val();
                            cb(val, noteTxt);
                        } catch (e) {
                            UI.warn(MessagesCP.admin_invalKey);
                            return true;
                        }
                    }
                }]
            });

            const keyInput = h('input#cp-accounts-drive-key', {
                placeholder: Messages.public_key
            });
            const noteInput = h('input#cp-accounts-drive-note', {
                placeholder: Messages.gift_note
            });
            const keyContent = h('div', [
                h('div', [
                    h('label', {
                        for: 'cp-accounts-drive-key'
                    }, Messages.add_from_key),
                    keyInput
                ]),
                h('div', [
                    h('label', {
                        for: 'cp-accounts-drive-note'
                    }, Messages.gift_note_label),
                    noteInput
                ])
            ]);
            const keyModal = UI.dialog.customModal(keyContent, {
                buttons: [{
                    name: MessagesCP.cancel,
                    className: 'btn-cancel',
                    onClick: () => {}
                }, {
                    name: Messages.add_key,
                    iconClass: 'add',
                    className: 'btn-primary',
                    onClick: () => {
                        const val = $(keyInput).val();
                        try {
                            const parsed = Keys.parseUser(val);
                            if (!parsed.pubkey) {
                                UI.warn(MessagesCP.admin_invalKey);
                                return true;
                            }
                            const noteTxt = $(noteInput).val();
                            cb(val, noteTxt);
                        } catch (e) {
                            UI.warn(MessagesCP.admin_invalKey);
                            return true;
                        }
                    }
                }]
            });

            const tabs = [{
                content: contactsModal,
                title: Messages.from_contacts,
                icon: 'users',
                active: true
            }, {
                content: keyModal,
                title: Messages.from_key,
                icon: 'key',
                active: false
            }];

            UI.openCustomModal(UI.dialog.tabs(tabs), {
                wide: true
            });

        };

        // Make sure we can always manage all drives, even if we
        // somehow go over the limit
        const max = Math.max(planData.drives, driveKeys.length);
        for(let i = 0; i < max; i++) {
            const id = driveKeys[i-1];
            const data = !i ? { key: privData.edPublic }
                            : driveData[id];

            const content = makeEntry(data?.key, id, data?.name);
            list.appendChild(content);

            if (!i || data) { continue; }
            Util.onClickEnter($(content), () => {
                if (!i) { return; }
                openDriveModal((key, note) => {
                    Api.addToPlan(key, note || '', (err) => {
                        if (err) {
                            return void UI.warn(MessagesCP.error);
                        }
                        evOnRefresh.fire();
                    });
                });
            });
        }

        return h('div.cp-accounts-drives', [
            number,
            list
        ]);
    };
    const getMySub = () => {
        return h('div', [
            getHeader(),
            getSubData(),
            getPlansLink(),
            getStorage(),
            getDpa(),
            getDrives()
        ]);
    };

    const getAdmin = () => {
        return h('div', [
            getHeader(),
            APP.adminUI.create()
        ]);
    };

    const andThen = (forceCat) => {
        const $container = $('#cp-app-accounts-container');
        forceCat ||= 'subs';

        setTimeout(() => {
            $container.scrollTop(0);
        });

        if (APP.isAdmin && forceCat === "admin") {
            APP.cat = "admin";
            return $container.empty().append(getAdmin());
        }
        // Default if premium
        if (APP.myPlan && forceCat === "subs") {
            APP.cat = "subs";
            return $container.empty().append(getMySub());
        }
        // Default if not premium, can be forced if premium
        APP.cat = "plans";
        $container.empty().append(getPlans());
    };

    let firing = false;
    evOnRefresh.reg((noRefresh, forceCat) => {
        if (firing) { return; }
        if (noRefresh) {
            if (!APP.myPlan) { return; }
            $('.cp-accounts-drives').after(getDrives()).remove();
            return;
        }
        if (forceCat) {
            return void andThen(forceCat);
        }
        firing = true;
        Api.getMySub((err, val) => {
            firing = false;
            APP.myPlan = val?.plan ? val : false;
            APP.isAdmin = val?.isAdmin;
            andThen(forceCat);
        });
    });


    const onSuccess = (category, cb) => {
        const $container = $('#cp-app-accounts-container');

        const content = h('div#cp-success-page', [
            h('div.cp-spinner-div center',
                h('p.alert.alert-primary', Messages.processing_wait),
                h('div.cp-spinner-container', [
                    h('i.fa.fa-spinner.fa-pulse.fa-3x.fa-fw.loading'), // TO BE UPDATED
                    h('span.loading-message', Messages.processing)
                ])
            )
        ]);
        const $content = $(content);
        $container.append(content);

        Api.checkSession((err, val) => {
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

    let sframeChan;
    nThen(function (waitFor) {
        $(waitFor(UI.addLoadingScreen));
        SFCommon.create(waitFor(function (c) { APP.common = common = c; }));
    }).nThen(function (waitFor) {
        APP.$toolbar = $('#cp-toolbar');
        sframeChan = common.getSframeChannel();
        sframeChan.onReady(waitFor());
    }).nThen(function (/*waitFor*/) {
        createToolbar();
        var metadataMgr = APP.metadataMgr = common.getMetadataMgr();
        var privateData = metadataMgr.getPrivateData();
        common.setTabTitle(Messages.accountsPage);

        /*APP.isAdmin = privateData?.edPublic &&
                        ApiConfig?.adminKeys?.includes(privateData.edPublic);
*/
        APP.origin = privateData.origin;
        APP.loggedIn = common.isLoggedIn();
        APP.myEdPublic = privateData.edPublic;

        if (!common.isLoggedIn()) {
            Plans.init(Messages, void 0, common);
            andThen();
            return void UI.removeLoadingScreen();
        }
        setTimeout(() => Lucide.createIcons());
        nThen(waitFor => {
            sframeChan.query('ACCOUNTS_GET_KEYS', null, waitFor((err, keys) => {
                if (err) {
                    console.error(err);
                    return void UI.removeLoadingScreen();
                }
                Plans.init(Messages, keys, common);
                Api._setKeys(keys);
                APP.adminUI = Admin.init(APP, Plans, Api, Messages);
            }));
        }).nThen(waitFor => {
            if (!['subscribe-accounts', 'subscribe-drive'].includes(privateData.category)) {
                return;
            }
            UI.removeLoadingScreen();
            onSuccess(privateData.category, waitFor());
        }).nThen(() => {
            evOnRefresh.fire();
            UI.removeLoadingScreen();
            metadataMgr.onChange(() => {
                evOnRefresh.fire(true);
            });
        });
    });
});
