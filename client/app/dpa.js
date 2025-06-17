define([
    'jquery',
    '/common/hyperscript.js',
    '/common/common-util.js',
    '/common/common-interface.js',
    '/customize/messages.js',
    '/common/extensions.js'
], ($, h, Util, UI, MessagesCP, Extensions) => {

    let Messages = {};
    // Get translations from plugin
    Extensions.getExtensionsSync('TRANSLATIONS').forEach(ext => {
        try {
            let m = ext.get('accounts');
            if (m) { Messages = m; }
        } catch (e) {}
    });

    const getDpaForm = (Api, hideBtn, isUser, onSubmit) => {
        var nameInput = h('input');
        var representedInput = h('input');
        var located1Input = h('input', {
            placeholder: Messages.dpa_loc1_placeholder
        });
        var located2Input = h('input', {
            placeholder: Messages.dpa_loc2_placeholder
        });
        var identificationInput = h('input');
        var submit = h('button.btn.btn-primary', Messages.dpa_create);
        var box = isUser ? UI.createCheckbox('cp-dpa-box', Messages.dpa_certify, false) : undefined;
        var language = h('div.cp-accounts-dpa-language', [
            h('label', Messages.dpa_language),
            UI.createRadio('dpa-language', 'cp-accounts-dpa-en', Messages.dpa_en, true),
            UI.createRadio('dpa-language', 'cp-accounts-dpa-fr', Messages.dpa_fr),
            UI.createRadio('dpa-language', 'cp-accounts-dpa-de', Messages.dpa_de),
        ]);
        var userKeyInput = h('input', {
            placeholder: MessagesCP.settings_publicSigningKey
        });
        var dpaForm = h('div.dpa-block.cp-accounts-dpa-form', [
            isUser ? h('span.title', Messages.dpa_title) : undefined,
            isUser ? h('p', Messages.dpa_info) : undefined,
            isUser ? undefined : userKeyInput,
            h('label', Messages.dpa_name),
            nameInput,
            h('label', Messages.dpa_represented),
            representedInput,
            h('label', Messages.dpa_located),
            located1Input,
            located2Input,
            h('label', Messages.dpa_identification),
            identificationInput,
            //language,
            box,
            h('div.cp-dpa-form-buttons', [hideBtn, submit])
        ]);
        $(submit).click(function () {
            if (box && !Util.isChecked($(box).find('input'))) {
                return UI.warn(Messages.dpa_check);
            }
            var languageVal = "en";
            if (Util.isChecked($('#cp-accounts-dpa-fr'))) {
                languageVal = "fr";
            } else if (Util.isChecked($('#cp-accounts-dpa-de'))) {
                languageVal = "de";
            }
            var data = {
                name: $(nameInput).val().trim(),
                represented: $(representedInput).val().trim(),
                located1: $(located1Input).val().trim(),
                located2: $(located2Input).val().trim(),
                identification: $(identificationInput).val().trim(),
                language: languageVal,
            };
            if (!isUser) { data.userKey = $(userKeyInput).val(); }

            if (Object.keys(data).some(function (k) {
                return !data[k];
            })) {
                UI.warn(Messages.dpa_inval);
                return;
            }

            onSubmit(data);
        });
        return dpaForm;
    };

    const getDpaAdmin = (Api, $div, table, onAdminTab) => {
        const displayError = err => {
            $div.empty().append(h('p.cp-admin-edit-error', err));
        };
        Api.getDpaAdmin((err, res) => {
            if (err) { return void displayError(err); }

            // Add header
            ['id', 'sub', 'name', 'signed',
            'url', 'deletesigned', 'delete'].forEach(x => {
                table.$headTr.append(h(`th.head-${x}`, [
                    Messages[`dpa_table_${x}`] || x
                ]));
            });
            // Add body
            const addRow = data => {
                const tr = h('tr');

                const baseUrl = '/accounts/dpa/' + data.pdf_id;
                const signedUrl = baseUrl + '_signed.pdf';
                const unsignedUrl = baseUrl + '.pdf';
                const url = data.signed_on ? signedUrl : unsignedUrl;

                let deleteSigned = h('button.btn.btn-danger', [
                    h('i.fa.fa-trash'),
                    h('span', Messages.dpa_deleteSigned)
                ]);
                UI.confirmButton(deleteSigned, {
                    classes: 'danger'
                }, () => {
                    Api.unsignDpaAdmin(data.id, function (err) {
                        if (err) {
                            console.error(err);
                            return void UI.warn(MessagesCP.error);
                        }
                        onAdminTab.fire('dpa');
                    });
                });
                if (!data.signed_on) { deleteSigned = undefined; }

                const btn = h('button.btn.btn-danger', [
                    h('i.fa.fa-times'),
                    h('span', Messages.dpa_delete)
                ]);
                UI.confirmButton(btn, {
                    classes: 'danger'
                }, () => {
                    Api.cancelDpaAdmin(data.id, function (err) {
                        if (err) {
                            console.error(err);
                            return void UI.warn(MessagesCP.error);
                        }
                        onAdminTab.fire('dpa');
                    });
                });

                const download = h('button.btn.btn-secondary', Messages.dpa_download);
                $(download).click(function (e) {
                    e.preventDefault();
                    Api.downloadDPA(data.pdf_id, Boolean(data.signed_on), (err, res) => {
                        if (err) {
                            console.error(err);
                            return void UI.warn(MessagesCP.error);
                        }
                    });
                });

                ([
                    ['month', data.id],
                    ['cell', data.sub_id],
                    ['cell', data.company_name],
                    ['cell', Boolean(data.signed_on) ? 'yes' : 'no'],
                    ['cell', download],
                    ['cell', deleteSigned],
                    ['cell', btn],
                ]).forEach(table.addCell(tr));
                table.$table.append(tr);
            };
            res.forEach(addRow);


            const showBtn = h('button.btn.btn-default', [
                h('i.fa.fa-file-text-o'), Messages.dpa_title
            ]);
            const hideBtn = h('button.btn.btn-default', [
                h('i.fa.fa-times'), Messages.closeDetails]);
            const dpaForm = getDpaForm(Api, hideBtn, false, data => {
                Api.createDpaAdmin(data, function (err, obj) {
                    if (err || obj?.allowed === false) {
                        return void UI.warn('Not allowed'); // XXX
                    }
                    onAdminTab.fire('dpa');
                });
            });
            const dpaBlock = h('div', {
                style: 'display:none;'
            }, dpaForm);
            $(showBtn).click(function () {
                $(dpaBlock).show();
                $(showBtn).hide();
            });
            $(hideBtn).click(function () {
                $(dpaBlock).hide();
                $(showBtn).show();
            });

            $div.append([
                showBtn,
                dpaBlock
            ]);
        });
    };

    return {
        getDpaForm,
        getDpaAdmin
    };
});
