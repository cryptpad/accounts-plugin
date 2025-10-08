define([
    'jquery',
    '/common/hyperscript.js',
    '/common/common-util.js',
    '/common/clipboard.js',
    '/common/common-interface.js',
    '/common/common-ui-elements.js',
    '/accounts/app/dpa.js',
    '/accounts/app/stats.js',
    '/customize/messages.js',
    '/common/common-icons.js',
], ($, h, Util, Clipboard, UI, UIElements,
    Dpa, Stats, MessagesCP, Icons) => {
    const onAdminTab = Util.mkEvent();


const init = (APP, Plans, Api, Messages) => {

    const isActive = s => {
        return Plans.ENABLED_STATUS.includes(s);
    };

    const getGiftTab = ($div) => {
        const plans = Plans.getAllPlans();
        let beneficiary, note, button;
        const plansOptions = plans.map(plan => {
            return {
                tag: 'a',
                attributes: {
                    'data-value': plan,
                    href: '#'
                },
                content: Util.fixHTML(Plans.getPlanName(plan))
            };
        });
        const plansConfig = {
            text: "Select plan",
            options: plansOptions,
            caretDown: true,
            isSelect: true,
            buttonCls: 'btn',
            common: APP.common
        };
        const $plan = UIElements.createDropdown(plansConfig);
        const admin = h('div.cp-accounts-admingift', [
            $plan[0],
            beneficiary = h('input', {placeholder: "Beneficiary's key [{user}@{domain}/{key}]"}),
            note = h('input', {placeholder: "Note"}),
            button = h('button.btn.btn-primary', [Icons.get('add'), "Give free subscription"]),
        ]);
        $(button).on("click", () => {
            const key = $(beneficiary).val();
            if (!key) { return void UI.alert("Need to specify beneficiary"); }
            const plan = $plan.getValue();
            if (!plan) { return void UI.alert("Need to select plan"); }
            Api.adminGift(plan, key, $(note).val(), err => {
                if (err) { return void UI.warn(err); }
                UI.log(MessagesCP.saved);
            });
        });
        $div.append(admin);
    };

    const getEditTab = ($div) => {
        // Create the "get subscription" form
        var getIdInput = h('input.cp-admin-edit-fromid', {
            type: 'text',
        });
        var getEmailInput = h('input.cp-admin-edit-fromemail', {
            type: 'text'
        });
        var getKeyInput = h('input.cp-admin-edit-fromkey', {
            type: 'text'
        });
        var getFormSubmit = h('button.btn.btn-default', [Icons.get('search'), "Find subscription(s)"]);
        var getResult = h('div.cp-admin-edit-found');
        var getForm = h('div.cp-admin-edit-getform', [
            h('h3', "Get a subscription"),
            h('label', [
                'From ID',
                getIdInput
            ]),
            h('label', [
                'or from email',
                getEmailInput
            ]),
            h('label', [
                'or from public key',
                getKeyInput
            ]),
            h('br'),
            getFormSubmit,
            getResult
        ]);
        $div.append(getForm);
        var $getResult = $(getResult);

        // Create "edit" form
        var editForm = h('div.cp-admin-edit-form');
        $div.append(editForm);

        // Display the edit form for a given subscription
        var displayEdit = function (sub) {
            console.log(sub);
            var $editForm = $(editForm).html('');

            $(h('h3', 'Edit subscription ' + sub.id)).appendTo($editForm);
            $(h('p', [
                "Some of these values may be overriden by the next Stripe sync. Make sure you know what you're doing before using the following form.",
                h('br'),
                "And be careful!"
            ])).appendTo($editForm);

            var inputs = {};
            var fields = ['email', 'plan', 'end_time', 'pubkey',
                        'benificiary_user', 'benificiary_domain', 'benificiary_pubkey',
                        'plan_added', 'admin_added', 'gift_note',
                        'status', 'customer', 'transaction',
                        'trial'];
            fields.forEach(function (f) {
                inputs[f] = h('input', {
                    type: 'text',
                    value: (sub[f] && typeof(sub[f]) !== "undefined" && sub[f] !== "null") ? sub[f] : ''
                });
            });

            var notes = {
                plan: 'Possible values: basic, basic12, pro, pro12, power, power12',
                end_time: "TIME format (timestamp * 1000). Should only be changed for gifts subscriptions",
                status: "Active status are: "+ Plans.ENABLED_STATUS.join(' '),
                customer: 'Change only if you did the corresponding modifications in Stripe!',
                transaction: 'Change only if you did the corresponding modifications in Stripe!',
                trial: 'Number of days for the trial period, starting now (overrides any existing value). Use -1 to end now.'
            };

            $(h('div.cp-admin-edit-form-content', fields.map(f => {
                return h('label', [
                    h('span.cp-edit-field', Messages[f] || f),
                    inputs[f],
                    h('span.cp-edit-note', notes[f])
                ]);
            }))).appendTo($editForm);

            var queryButton = h('button.btn', 'Force sync with Stripe');
            var saveButton = h('button.btn.btn-primary', 'Save changes');

            $(h('div.cp-admin-edit-form-actions', [
                saveButton,
                h('br'),
                queryButton
            ])).appendTo($editForm);

            $(saveButton).click(function () {
                if (window.confirm("Are you sure you want to update this subscription with these values?")) {
                    var data = {};
                    fields.forEach(function (f) {
                        data[f] = $(inputs[f]).val() || null;
                    });
                    data.id = sub.id;
                    console.log(data);
                    $editForm.html('<i class="cp-spinner" data-lucide="loader"></i>');
                    Api.updateSubAdmin(data, function (err) {
                        if (err) {
                            var error = h('div.cp-admin-edit-error', err);
                            $editForm.html('').append(error);
                        }
                        $editForm.html('<div class="cp-admin-edit-saved">Saved!</div>');
                    });
                }
            });

            $(queryButton).click(function () {
                $editForm.html('<i class="cp-spinner" data-lucide="loader"></i>');
                Api.stripeSync(sub.id, function (err) {
                    if (err) {
                        var error = h('div.cp-admin-edit-error', err);
                        $editForm.html('').append(error);
                    }
                    $editForm.html('<div class="cp-admin-edit-saved">Success</div>');
                });
            });
        };

        // Submit "get subscription" form
        var displayError = function (err) {
            $getResult.html('').append($(h('p.cp-admin-edit-error', err)));
        };

        $(getFormSubmit).click(function () {
            var id = $(getIdInput).val();
            id = id ? Number(id) : undefined;
            var email = ($(getEmailInput).val() || '').trim();
            var key = ($(getKeyInput).val() || '').trim();
            if (!id && !email && !key) { return; }
            Api.getSubAdmin(id, email, key, function (err, res) {
                if (err) { return void displayError(err); }
                if (!Array.isArray(res) || !res.length) {
                    return void displayError('Not found');
                }
                $getResult.html('');
                var table = h('table.subscription-table.cp-edit', [
                    h('tr', ['id', 'email', 'benificiary_user', 'plan', 'create_time', 'end_time'].map(function (i) {
                        return h('th.head-'+i, Messages[i] || i);
                    }))
                ]);
                var $table = $(table).appendTo($getResult);
                res.forEach(function (sub) {
                    var line = h('tr',
                        ['id', 'email', 'benificiary_user', 'plan', 'create_time', 'end_time'].map(function (i) {
                        return h('td.cell-'+i, sub[i]);
                    }));
                    $(line).appendTo($table).click(function () {
                        displayEdit(sub);
                    });
                });
            });
        });
    };

    const getStats = ($div, table, data) => {
        ['month', 'totalSubs', 'newSubs', 'subsCancelled',
        'newSubsCancelled', 'revenue_net', 'revenue',
        'revenue_m', 'revenue_y'].forEach(x => {
            table.$headTr.append(h(`td.head-${x}`, [
                Messages[`stats_${x}`]
            ]));
        });
        const nDisplayed = 30;

        const addRow = function (data) {
            // data.revenue[0]: monthly subs revenue
            // data.revenue[1]: yearly subs revenue (average)
            // data.revenue[2]: yearly subs revenue net from this month
            const revenue = data.revenue[0] + data.revenue[2];
            const revenueTitle = data.revenue[0] + '€ from monthly subs and ' + data.revenue[2] + '€ from yearly subs';
            const tr = h('tr');
            ([
                ['month', data.month],
                ['cell', data.subs],
                ['cell', data.newSubs],
                ['cell', data.subsCancelled],
                ['cell', data.newSubsCancelled],
                ['cell', revenue, {title: revenueTitle}],
                ['cell', Math.round(data.revenue[0] + data.revenue[1])],
                ['cell', data.revenue[0]],
                ['cell', Math.round(data.revenue[1])],
            ]).forEach(table.addCell(tr));
            table.$table.append(tr);
        };

        for (let i=0; i<nDisplayed; i++) {
            addRow(Stats.getTableStats(data, i));
        }

        let n = nDisplayed;
        let button = h('button.btn.btn-default.cp-stats-more', MessagesCP.ui_more);
        let showMore = () => {
            for (var i=n; i<(n+nDisplayed); i++) {
                addRow(Stats.getTableStats(data, i));
            }
            n += nDisplayed;
        };
        Util.onClickEnter($(button), showMore);
    };

    const getSubs = ($div, table, data, opts) => {
        const $stats = $(h('div.cp-admin-stats'))
                        .insertBefore(table.$table);

        const displayStats = function (subs, type) {
            let title = type === 'current'
                            ? Messages.stats_thisMonth
                            : (type === 'previous'
                                ? Messages.stats_previousMonth
                                : Messages.stats_total);
            $stats.append(h('div.cp-stats', [
                h('h3', title),
                h('p', [
                    h('strong', Messages.stats_new),
                    subs.number
                ]),
                h('p', [
                    h('strong', Messages.stats_monthlyRevenue),
                    subs.monthly + '€'
                ]),
                h('p', [
                    h('strong', Messages.stats_yearlyRevenue),
                    subs.yearly + '€'
                ]),
                type !== 'total' ? h('p', [
                    h('strong', Messages.stats_estimation),
                    subs.year + '€'
                ]) : undefined,
            ]));
        };

        displayStats(Stats.getRevenue(data, 'current'), 'current');
        displayStats(Stats.getRevenue(data, 'previous'), 'previous');
        displayStats(Stats.getTotalRevenue(data), 'total');
        $stats.append(h('div.cp-stats-note', Messages.stats_note));

        // Data
        ['id', 'plan', 'benificiary', 'key', 'domain',
        'created', 'ended' , 'notes', 'status'].forEach(x => {
            table.$headTr.append(h(`th.head-${x}`, [
                Messages[x] || x
            ]));
        });
        const addRow = function (sub) {
            // A paid account for yourself doesn't have a benificiary_user so 'Unknown'
            const username = sub.benificiary_user || sub.email
                                                    || 'Unknown';
            const beneficiary = username;
            const domain = sub.benificiary_domain;
            const plan = Messages['plan_' + sub.plan + '_name']
                        || sub.plan;
            let planMsg = sub.plan_added ? Messages.offeredWithPlan
                                            : plan;
            let cost = '';
            if (sub.email) { // paid plan
                const c = Plans.getPlanPrice(sub.plan);
                cost = Messages._getKey('pricePer'+(Plans.isYearly(sub.plan) ? 'Year' : 'Month'), [c]);
            }
            const key = h('button.btn.cp-copy-key', Icons.get('key'));
            $(key).click(function () {
                Clipboard.copy(sub.benificiary_pubkey, () => {
                    UI.log('Copied to clipboard');
                });
            });
            planMsg += cost ? ' ' + cost : '';
            const tr = h('tr');
            ([
                ['id', sub.id],
                ['plan', planMsg],
                ['benificiary', beneficiary, {title: sub.benificiary || sub.benificiary_pubkey}],
                ['key', key],
                ['domain', domain],
                ['create_time', new Date(sub.create_time).toLocaleString()],
                ['end_time', sub.end_time ? new Date(sub.end_time).toLocaleString() : '-'],
                ['gift_note', sub.gift_note || '-'],
                ['status', Messages['status_' + sub.status] || sub.status],
            ]).forEach(table.addCell(tr));
            table.$table.append(tr);
        };


        let subs = data.subs.slice() || [];
        subs.sort(function (a, b) { return b.create_time - a.create_time; });

        if (opts.adminGifts) {
            subs = subs.filter(function (s) {
                return s.customer === "_admin_";
            });
        } else if (opts.showInactive) {
            subs = subs.filter(function (s) {
                return (!isActive(s.status));
            });
        } else {
            subs = subs.filter(function (s) {
                return (isActive(s.status) || (s.end_time > +new Date() && s.status !== "refunded"));
            });
        }

        if (!opts.showGifts && !opts.adminGifts) {
            subs = subs.filter(function (s) { return s.email; });
        }

        subs.forEach(addRow);

        var $buttons = $(h('div.cp-admin-buttons')).appendTo($div);

        var $adminBox;
        var $inactiveBox = $(UI.createCheckbox('cp-admin-showinactive', Messages.show_inactive_only,
            opts.showInactive, {
            label: { class: 'noTitle' }
        })).click(() => {
            $adminBox.find('input').prop('checked', false);
            opts.adminGifts = false;
            opts.showInactive = !Util.isChecked($inactiveBox.find('input'));
            onAdminTab.fire('subs', opts, data);
        }).appendTo($buttons);

        var $giftsBox = $(UI.createCheckbox('cp-admin-showgifts', Messages.show_gifts,
            opts.showGifts, {
            label: { class: 'noTitle' }
        })).click(() => {
            $adminBox.find('input').prop('checked', false);
            opts.adminGifts = false;
            opts.showGifts = !Util.isChecked($giftsBox.find('input'));
            onAdminTab.fire('subs', opts, data);
        }).appendTo($buttons);

        $adminBox = $(UI.createCheckbox('cp-admin-showgifts', Messages.show_admin_only,
            opts.adminGifts, {
            label: { class: 'noTitle' }
        })).click(() => {
            $inactiveBox.find('input').prop('checked', false);
            $giftsBox.find('input').prop('checked', false);
            opts.showGifts = false;
            opts.showInactive = false;
            opts.adminGifts = !Util.isChecked($adminBox.find('input'));
            onAdminTab.fire('subs', opts, data);
        }).appendTo($buttons);

    };

    var displayAdmin = function ($tabs, $div, data, tab, opts) {
        if (!APP.isAdmin) { return; }
        opts = opts || {};
        $tabs.find('[data-tab]').removeClass('active');
        $tabs.find('[data-tab="' + tab + '"]').addClass('active');
        $div.empty();

        if (tab === 'gift') {
            return void getGiftTab($div);
        }
        if (tab === 'edit') {
            return void getEditTab($div);
        }

        var $table = $('<table class="subscription-table">').appendTo($div);
        var $headTr = $('<tr>').appendTo($table);
        var addCell = function (tr) {
            const $tr = $(tr);
            return function (x) {
                const td = h(`td.cell-${x[0]}`, x[2] || {}, x[1]);
                $tr.append(td);
            };
        };
        const table = {
            $table,
            $headTr,
            addCell
        };

        if (tab === 'dpa') {
            return void Dpa.getDpaAdmin(Api, $div, table, onAdminTab);
        }

        if (tab === 'stats') {
            return void getStats($div, table, data);
        }

        // Subscriptions
        return getSubs($div, table, data, opts);
    };

    const makeHeader = () => {
        var tabs = h('div.cp-admin-tabs-container', [
            h('span.cp-admin-tab', {
                'data-tab': 'subs'
            }, Messages.admin_subsTab),
            h('span.cp-admin-tab', {
                'data-tab': 'stats'
            }, Messages.admin_statsTab),
            h('span.cp-admin-tab', {
                'data-tab': 'edit'
            }, Messages.admin_editTab),
            h('span.cp-admin-tab', {
                'data-tab': 'gift'
            }, Messages.admin_giftTab),
            h('span.cp-admin-tab', {
                'data-tab': 'dpa'
            }, Messages.admin_dpaTab || 'dpa'),
        ]);
        var content = h('div.cp-admin-content-container');
        var div = h('div', [
            tabs,
            content
        ]);
        $(tabs).find('.cp-admin-tab').click(function () {
            onAdminTab.fire($(this).data('tab'));
        });
        onAdminTab.reg(function (tab, opts, data) {
            if (data) {
                displayAdmin($(tabs), $(content), data, tab, opts);
                return;
            }
            Api.getAll(function (err, data) {
                if (err) {
                    return void UI.alert(err);
                }
                displayAdmin($(tabs), $(content), data, tab || 'subs', opts);
            });
        });
        onAdminTab.fire('subs');
        return div;
    };

    return {
        create: makeHeader
    };
};

return {
    init,
};

});
