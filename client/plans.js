define([
    'jquery',
    '/api/config',
    '/common/hyperscript.js',
    '/common/common-interface.js',
    '/common/common-util.js',
    '/common/common-icons.js',
    '/customize/application_config.js',
    '/customize/messages.js',
    '/accounts/api.js',
    'json!/accounts/plans.json'
], ($, ApiConfig, h, UI, Util, Icons,
    AppConfig, Messages, Api, PlansJSON) => {
    const Plans = {};
    let MyMessages = {};
    let sfCommon;

    // Support languages
    let lang = "EN";
    if (Array.isArray(AppConfig.supportLanguages)) {
        lang = AppConfig.supportLanguages
                .map(str => str.toUpperCase())
                .join('/');
    }

    const onYearlyChange = Util.mkEvent();

    Plans.ENABLED_STATUS = [
        'active',
        'trialing',
        'past_due'
    ];


    const makeToggle = () => {
        const monthly = h('span', MyMessages.billedMonthly);
        const yearly = h('span', MyMessages.billedYearly);
        const button = h('button.btn.btn-toolbar.cp-yearly-button', {
            'aria-pressed': true
        }, [
            h('span.cp-toggle')
        ]);

        Util.onClickEnter($(button), () => {
            let p = button.getAttribute('aria-pressed') === "true";
            button.setAttribute('aria-pressed', !p);
            onYearlyChange.fire(!p);
        });

        const content = h('div.cp-accounts-yearly-toggle', [
            h('div.cp-accounts-toggle.cp-monthly', monthly),
            h('div.cp-accounts-toggle-btn', button),
            h('div.cp-accounts-toggle.cp-yearly.cp-selected', yearly)
        ]);

        const $content = $(content);
        onYearlyChange.reg(isYearly => {
            $content.find('.cp-selected').removeClass('cp-selected');
            if (isYearly) {
                $content.find('.cp-yearly').addClass('cp-selected');
            } else {
                $content.find('.cp-monthly').addClass('cp-selected');
            }
        });

        return content;
    };

    const makeOrgTitle = () => {
        return h('div.cp-accounts-org-title',
            h('span', MyMessages.org_title)
        );
    };

    const makeHeader = () => {
        return h('div.cp-accounts-header', [
            h('div.cp-accounts-header-group', [
                h('div.cp-accounts-header-item', [
                    Icons.get('drive'),
                    h('span', MyMessages.header_drive)
                ]),
                h('div.cp-accounts-header-item', [
                    Icons.get('upload'),
                    h('span', MyMessages.header_quota)
                ])
            ]),
            h('div.cp-accounts-header-group', [
                h('div.cp-accounts-header-item', [
                    Icons.get('support'),
                    h('span', MyMessages.header_support)
                ]),
                h('div.cp-accounts-header-item', [
                    Icons.get('trophy'),
                    h('span', MyMessages.header_privacy)
                ])
            ])
        ]);
    };

    const makeYourPlan = myPlan => {
        console.error(myPlan);
        const plan = myPlan?.plan;
        if (!plan) { return; }
        const name = Plans.getPlanName(plan);
        const button = h('button.btn.cp-colored', [
            Icons.get('subscribe'),
            h('span', MyMessages._getKey('yourPlanIs', [
                name
            ]))
        ]);
        Util.onClickEnter($(button), () => {
            $('#cp-accounts-goto-mysub').click();
        });
        return h('div.cp-accounts-yourplan', {
            'data-accounts-plan': plan
        }, [
            button
        ]);
    };

    const gotoURL = url => {
        if (sfCommon) {
            return sfCommon.gotoURL(url);
        }
        window.location.href = url;
    };
    const onPlanUpdate = (plan, isGiftedPlan) => {
        if (plan === "free" && isGiftedPlan) {
            // The user wants to cancel their gifted plan
            UI.confirm(MyMessages.confirmCancel, yes => {
                if (!yes) { return; }
                Api.cancelGift(isGiftedPlan, err => {
                    if (err) {
                        console.error(err);
                        return void UI.warn(Messages.error);
                    }
                    gotoURL(''); // reload
                });
            });
            return;
        }
        if (isGiftedPlan) {
            // Free users want to switch plan
            UI.confirm(MyMessages.confirmCancel, yes => {
                if (!yes) { return; }
                Api.cancelGift(isGiftedPlan, err => {
                    if (err) {
                        console.error(err);
                        return void UI.warn(Messages.error);
                    }
                    onPlanPicked(plan, false);
                });
            });
            return;
        }
        // Update a paid plan: show "cancel" page if switching to free
        Api.stripePortal(plan !== "free", (err, val) => {
            if (err) {
                console.error(err);
                return void UI.alert(Messages.error);
            }
            gotoURL(val);
        });
    };
    const onPlanPicked = (plan, isRegister) => {
        Api.subscribe(plan, Boolean(isRegister), (err, url) => {
            if (err || !url) {
                console.error(err || 'NO_CHECKOUT_URL');
                return void UI.warn(Messages.error);
            }
            gotoURL(url?.permalink);
        });
    };
    const makeCard = (plan, isRegister, myPlanData) => {
        const data = PlansJSON[plan];
        if (!data) { return; }

        // Plan name
        const name = Plans.getPlanName(plan);

        // Price
        const priceYear = data.yearly;
        const perMonth = MyMessages.perMonthVAT;
        const perYear = MyMessages._getKey('paidYearly', [priceYear]);

        const paid = data.monthly || data.yearly;
        const price = h('div.cp-price-value.cp-colored');
        const priceY = UI.setHTML(h('div.cp-price-month'), '&nbsp;');
        const priceM = UI.setHTML(h('div.cp-price-month'),
                    paid ?  perMonth : '&nbsp;');
        const $price = $(price);
        const $priceY = $(priceY);
        const setPrice = isYearly => {
            isYearly = (isYearly && data.yearly) || (!isYearly && !data.monthly);
            if (data.cloud) {
                $price.hide();
                $priceY.hide();
            }

            let p = isYearly ? Math.round(100*priceYear / 12) / 100
                             : data.monthly;
            let cent;
            if (String(p).includes('.')) {
                const s = String(p).split('.');
                cent = s[1];
                p = s[0];
            }
            const priceStr = MyMessages._getKey('price', [p]);
            $price.text(priceStr);
            if (cent) {
                $price.append(h('span.cp-cent', cent));
            }
            if (!isYearly) {
                $priceY.html('&nbsp;');
            } else if (paid) {
                $priceY.html(perYear);
            }
        };

        let yearly = true;
        onYearlyChange.reg(isYearly => {
            yearly = isYearly;
            setPrice(isYearly);
        });
        setPrice(true);

        // Quota
        const quota = MyMessages._getKey('plan_quota', [data.quota || 0]);
        // Drives
        let drive = MyMessages.plan_drive;
        if (data.drives > 1) {
            drive = MyMessages._getKey('plan_drives', [data.drives || 0]);
        }
        // Support
        let support;
        if (paid) {
            support = MyMessages._getKey('plan_support', [lang]);
        } else {
            support = MyMessages._getKey('free_support', [lang]);
        }

        // Buttons
        /** Handle all cases:
         *    - /accounts
         *      - Guest: register buttons
         *      - Paid user: "Your plan" and "Switch plan"
         *      - Free user: "Your plan" and "Pick this plan"
         *      - Cloud button: "Test CryptPad Cloud"
         *    - /register
         *      - "Continue for free" and "Pick this plan"
         **/
        const myPlan = myPlanData?.plan;
        const isGiftedPlan = (myPlanData?.shared ||
                              myPlanData?.adminGift) ?
                            myPlanData?.id : false;
        const isMyPlan = plan === myPlan ||
                         (!myPlan && plan === "free");
        const isPremiumUser = !!myPlan;
        const loggedIn = isRegister || sfCommon?.isLoggedIn();
        let buttonTxt = MyMessages.pickPlan;
        if (isRegister) {
            // /register - free
            if (!paid) {
                buttonTxt = MyMessages.noPlan;
            }
        } else {
            // /accounts
            if (data.cloud) { // cloud offer
                buttonTxt = MyMessages.tryCloud;
            } else if (!loggedIn) { // guests
                buttonTxt = Messages.register_header;
            } else if (isMyPlan && paid) { // your plan
                buttonTxt = MyMessages.goto_mysub;
            } else if (isMyPlan) { // your plan
                buttonTxt = MyMessages.yourPlan;
            } else if (!isPremiumUser) { // free user, paid plan
            } else {
                buttonTxt = MyMessages.stripe_switch;
            }
        }

        const mainBtn = h('button.btn.btn-default.cp-colored', {}, [
            buttonTxt
        ]);
        const altBtn = (plan === "free" && !isRegister && loggedIn)
                ? h('button.btn.btn-secondary', MyMessages.buttons_donate)
                : undefined;

        Util.onClickEnter($(mainBtn), () => {
            if (isMyPlan && !isRegister) {
                return $('#cp-accounts-goto-mysub').click();
            }

            if (data.cloud) { // Contact
                return gotoURL(data.url);
            }
            if (isPremiumUser) { // Update your sub
                return onPlanUpdate(plan, isGiftedPlan);
            }
            if (!paid || !loggedIn) { // Free plan
                return gotoURL(isRegister || loggedIn ? '/drive' : '/register');
            }

            const yearlyTxt = yearly ? '12' : '';
            const subPlan = `${plan}${yearlyTxt}`;
            onPlanPicked(subPlan, isRegister);
        });

        const desc = data.cloud ? [
            h('div.cp-accounts-desc-entry',MyMessages.cloud_feature1),
            h('div.cp-accounts-desc-entry',MyMessages.cloud_feature2),
            h('div.cp-accounts-desc-entry',MyMessages.cloud_feature3),
            h('div.cp-accounts-desc-entry',MyMessages.cloud_feature4)
        ] : [
            UI.setHTML(h('div.cp-accounts-desc-entry'), quota),
            UI.setHTML(h('div.cp-accounts-desc-entry'), drive),
            UI.setHTML(h('div.cp-accounts-desc-entry'), support)
        ];

        return h('div.cp-accounts-card', {
            'data-org': String(!!data.org),
            'data-accounts-plan': plan
        }, [
            h('div.cp-accounts-card-name.cp-colored', name),
            h('div.cp-accounts-card-price', [
                price,
                priceM,
                priceY
            ]),
            h('div.cp-accounts-card-desc', desc),
            h('div.cp-accounts-card-button', [
                mainBtn,
                altBtn
            ]),
        ]);
    };

    const listPlans = (org, isRegister, myPlan) => {
        const all = Object.keys(PlansJSON)
        .filter(k => (!!PlansJSON[k].org === org))
        .map(k => {
            const card = makeCard(k, isRegister, myPlan);
            return card;
        });
        const list = [];
        while (all.length) {
            list.push(h('div.cp-accounts-list-group', [
                all.shift(),
                all.shift()
            ]));
        }
        return h('div.cp-accounts-list', [
            org ? makeOrgTitle() : makeToggle(),
            list
        ]);
    };

    Plans.isYearly = plan => {
        return /12$/.test(plan);
    };
    Plans.getPlanData = _plan => {
        const plan = _plan.replace(/12$/, '');
        return PlansJSON[plan];
    };

    Plans.getPlanName = plan => {
        const data = Plans.getPlanData(plan);
        let nameKey = data.name || MyMessages.freetitle;
        return nameKey;
    };
    Plans.getPlanPrice = (plan, _yearly) => {
        const data = Plans.getPlanData(plan);
        const yearly = _yearly || Plans.isYearly(plan);
        const price = (yearly && data.yearly) || data.monthly;
        return price;
    };
    Plans.getAllPlans = () => {
        return Object.keys(PlansJSON).filter(plan => {
            const data = PlansJSON[plan];
            return data.monthly || data.yearly;
        });
    };


    Plans.init = (_MyMessages, keys, common) => {
        sfCommon = common;
        if (keys) { Api._setKeys(keys); }
        MyMessages = _MyMessages;
    };

    Plans.getPlansRegister = () => {
        return listPlans(false, true);
    };
    Plans.getPlansAccounts = (myPlan) => {
        return h('div', [
            makeHeader(),
            makeYourPlan(myPlan),
            listPlans(false, false, myPlan),
            listPlans(true, false, myPlan),
        ]);
    };


    return Plans;
});
