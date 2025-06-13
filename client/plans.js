define([
    'jquery',
    '/api/config',
    '/common/hyperscript.js',
    '/common/common-interface.js',
    '/common/common-util.js',
    '/customize/application_config.js',
    '/customize/messages.js',
    '/accounts/api.js',
    'json!/accounts/plans.json'
], ($, ApiConfig, h, UI, Util,
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

    const makeBackLink = (myPlan, myPlanCb) => {
        if (!myPlan) { return; }
        if (typeof (myPlanCb) !== "function") { return; }

        const back = h('a', {
            href: '/accounts'
        }, [
            h('i.fa.fa-arrow-circle-left'),
            h('span', MyMessages.back_to_mysub)
        ]);
        $(back).click(e => {
            e.preventDefault();
            myPlanCb();
        });
        return h('div.cp-accounts-plans-back', [
            back
        ]);
    };
    const makeHeader = () => {
        return h('div.cp-accounts-header', [
            h('div.cp-accounts-header-item', [
                h('i.fa.fa-hdd-o'),
                h('span', MyMessages.header_drive)
            ]),
            h('div.cp-accounts-header-item', [
                h('i.fa.fa-upload'),
                h('span', MyMessages.header_quota)
            ]),
            h('div.cp-accounts-header-item', [
                h('i.fa.fa-life-ring'),
                h('span', MyMessages.header_support)
            ]),
            h('div.cp-accounts-header-item', [
                h('i.fa.fa-trophy'),
                h('span', MyMessages.header_privacy)
            ]),
        ]);
    };

    const gotoURL = url => {
        if (sfCommon) {
            return sfCommon.gotoURL(url);
        }
        window.location.href = url;
    };
    const onPlanPicked = (plan, isRegister) => {
        Api.subscribe(plan, Boolean(isRegister), (err, url) => {
            if (err || !url) {
                console.error(err || 'NO_CHECKOUT_URL');
                return void UI.warn(Messages.error);
            }
            console.error(err, url);
            gotoURL(url?.permalink);
        });
    };
    const makeCard = (plan, isRegister, isMyPlan) => {
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
                             : data.monthly
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
        const loggedIn = isRegister || sfCommon?.isLoggedIn();
        const freeTxt = loggedIn ? MyMessages.noPlan
                                    : Messages.register_header;
        const mainTxt = isMyPlan ? MyMessages.yourPlan
                            : (loggedIn ? MyMessages.pickPlan
                                    : Messages.register_header);
        const attr = isMyPlan ? { disabled: 'disabled' } : {};
        const mainBtn = h('button.btn.btn-default.cp-colored', attr, [
            paid ? mainTxt : (
                data.cloud ? MyMessages.tryCloud : freeTxt
            )
        ]);
        const altBtn = (plan === "free" && !isRegister)
                ? h('button.btn.btn-secondary', MyMessages.buttons_donate)
                : undefined;

        Util.onClickEnter($(mainBtn), () => {
            if (data.cloud) { // Contact
                // TODO XXX redirect
            }
            if (!paid || !loggedIn) { // Free plan
                return gotoURL(isRegister ? '/drive' : '/register');
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
        return h('div.cp-accounts-list', [
            org ? makeOrgTitle() : makeToggle(),
            Object.keys(PlansJSON)
            .filter(k => (!!PlansJSON[k].org === org))
            .map(k => {
                const card = makeCard(k, isRegister, k === myPlan);
                return card;
            })
        ]);
    };

    Plans.getPlanData = plan => {
        return PlansJSON[plan];
    };

    const prettyName = str => {
        return String(str).charAt(0).toUpperCase() +
               String(str).slice(1).toLowerCase();
    };
    Plans.getPlanName = plan => {
        const data = Plans.getPlanData(plan);
        let nameKey = (data.org && !data.cloud)
            ? MyMessages._getKey('orgtitle', [data.drives])
            : MyMessages[`${plan}title`] || plan;
        return data.cloud ? nameKey : prettyName(nameKey);
    };
    Plans.getPlanPrice = (plan, yearly) => {
        const data = Plans.getPlanData(plan);
        const price = (yearly && data.yearly) || data.monthly;
        return price;
    };


    Plans.init = (_MyMessages, keys, common) => {
        sfCommon = common;
        if (keys) { Api._setKeys(keys); }
        MyMessages = _MyMessages;
    };

    Plans.checkSession = Api.checkSession;
    Plans.getMySub = Api.getMySub;
    Plans.stripePortal = Api.stripePortal;
    Plans.addToPlan = Api.addToPlan;
    Plans.cancelGift = Api.cancelGift;

    Plans.getPlansRegister = () => {
        return listPlans(false, true);
    };
    Plans.getPlansAccounts = (myPlan, myPlanCb) => {
        return h('div', [
            makeBackLink(myPlan, myPlanCb),
            makeHeader(),
            listPlans(false, false, myPlan),
            listPlans(true, false, myPlan),
        ]);
    };


    return Plans;
});
