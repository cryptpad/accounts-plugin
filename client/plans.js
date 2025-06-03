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

    const prettyName = str => {
        return String(str).charAt(0).toUpperCase() +
               String(str).slice(1).toLowerCase();
    };

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
        const url = new URL(isRegister ? '/drive' : '/accounts',
                            ApiConfig.httpUnsafeOrigin).href;
        Api.subscribe(plan, url, (err, url) => {
            if (err || !url) {
                console.error(err || 'NO_CHECKOUT_URL');
                return void UI.warn(Messages.error);
            }
            console.error(err, url);
            gotoURL(url?.permalink);
        });
    };
    const makeCard = (plan, isRegister) => {
        const data = PlansJSON[plan];
        if (!data) { return; }

        // Plan name
        let nameKey = (data.org && !data.cloud)
            ? MyMessages._getKey('orgtitle', [data.drives])
            : MyMessages[`${plan}title`] || plan;
        const name = data.cloud ? nameKey : prettyName(nameKey);

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
        if (data.price) {
            support = MyMessages._getKey('plan_support', [lang]);
        } else {
            support = MyMessages._getKey('free_support', [lang]);
        }

        // Buttons
        const freeTxt = !isRegister ? Messages.register_header
                                   : MyMessages.noPlan;
        const mainBtn = h('button.btn.btn-default.cp-colored', [
            data.price ? MyMessages.pickPlan : (
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
            if (!data.monthly && !data.yearly) { // Free plan
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
            'data-plan': plan
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

    const listPlans = (org, isRegister) => {
        return h('div.cp-accounts-list', [
            org ? makeOrgTitle() : makeToggle(),
            Object.keys(PlansJSON)
            .filter(k => (!!PlansJSON[k].org === org))
            .map(k => {
                const card = makeCard(k, isRegister);
                return card;
            })
        ]);
    };

    Plans.getPlansRegister = (_MyMessages, keys) => {
        Api._setKeys(keys);
        MyMessages = _MyMessages;
        return listPlans(false, true);
    };
    Plans.getPlansAccounts = (_MyMessages, keys, common) => {
        sfCommon = common;
        Api._setKeys(keys);
        MyMessages = _MyMessages;
        return h('div', [
            makeHeader(),
            listPlans(false, false),
            listPlans(true, false),
        ]);
    };

    return Plans;
});
