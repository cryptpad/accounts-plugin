define([
    'jquery',
    '/common/hyperscript.js',
    '/common/common-util.js',
    '/common/common-interface.js',
    '/common/common-icons.js',
    '/customize/messages.js',
    '/customize/fonts/lucide.js',
    '/common/extensions.js'
], ($, h, Util, UI, Icons, MessagesCP, Lucide, Extensions) => {

    let Messages = {};
    // Get translations from plugin
    Extensions.getExtensionsSync('TRANSLATIONS').forEach(ext => {
        try {
            let m = ext.get('accounts');
            if (m) { Messages = m; }
        } catch (e) {}
    });

    const getDpaForm = (Api, hideBtn, isUser, onSubmit) => {
        var nameInput = h('input#cp-dpa-name');
        var representedInput = h('input#cp-dpa-represented');
        var located1Input = h('input#cp-dpa-located', {
            'aria-label': Messages.dpa_loc1_placeholder,
            placeholder: Messages.dpa_loc1_placeholder
        });
        var located2Input = h('input', {
            'aria-label': Messages.dpa_loc2_placeholder,
            placeholder: Messages.dpa_loc2_placeholder
        });
        var identificationInput = h('input#cp-dpa-id');
        var submit = h('button.btn.btn-primary', Messages.dpa_create);
        var box = isUser ? UI.createCheckbox('cp-dpa-box', Messages.dpa_certify, false) : undefined;
        /*
        var language = h('div.cp-accounts-dpa-language', [
            h('label', Messages.dpa_language),
            UI.createRadio('dpa-language', 'cp-accounts-dpa-en', Messages.dpa_en, true),
            UI.createRadio('dpa-language', 'cp-accounts-dpa-fr', Messages.dpa_fr),
            UI.createRadio('dpa-language', 'cp-accounts-dpa-de', Messages.dpa_de),
        ]);
        */
        var userKeyInput = h('input', {
            placeholder: MessagesCP.settings_publicSigningKey
        });
        var dpaForm = h('div.dpa-block.cp-accounts-dpa-form', [
            isUser ? h('span.title', Messages.dpa_title) : undefined,
            isUser ? h('p', Messages.dpa_info) : undefined,
            isUser ? undefined : userKeyInput,
            h('label', {for: 'cp-dpa-name'}, Messages.dpa_name),
            nameInput,
            h('label', {for: 'cp-dpa-represented'},
                Messages.dpa_represented),
            representedInput,
            h('label', {for: 'cp-dpa-located'}, Messages.dpa_located),
            located1Input,
            located2Input,
            h('label', {for: 'cp-dpa-id'},
                Messages.dpa_identification),
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

    const getDpaUser = (Api, APP) => {

        const content = h('div.cp-accounts-user-dpa');
        const $div = $(content);
        let dpaState = false;
        const metadataMgr = APP.common.getMetadataMgr();

        let redraw = () => {};
        const draw = (obj) => {
            $div.empty();
            if (!obj.allowed) { return; } // No active org plan
            const data = obj.data;

            const showBtn = h('button.btn.btn-default.cp-show-dpa', [
                Icons.get('notebook'), Messages.dpa_title
            ]);
            $(showBtn).click(() => {
                dpaState = true;
                $div.find('.dpa-block').show();
                $(showBtn).hide();
            });
            const hideBtn = h('button.btn.btn-default', [
                Icons.get('close'), Messages.closeDetails]);
            $(hideBtn).click(() => {
                dpaState = true;
                $div.find('.dpa-block').hide();
                $(showBtn).show();
            });
            if (APP.showDpa) {
                $(showBtn).hide();
            }

            const showDownloadBanner = signed => {
                const uploadButton = h('button.btn.btn-primary', [
                    Icons.get('upload'),
                    Messages.dpa_sendSigned
                ]);
                $(uploadButton).click(() => {
                    $(h('input', {
                        type: 'file',
                        accept: ['.pdf']
                    })).on('change', e => {
                        const file = e.target.files[0];
                        if (file.type !== "application/pdf" ||
                            !/\.pdf$/.test(file.name)) {
                            return UI.warn(Messages.dpa_wrongType);
                        }

                        Api.postSignedDpa(file, () => {
                            dpaState = true;
                            redraw();
                        });
                    }).click();
                });

                const buttonKey = signed ? 'dpa_download'
                                         : 'dpa_downloadUnsigned';
                const button = h('button.btn.btn-secondary', [
                    Icons.get('download'),
                    Messages[buttonKey]
                ]);
                $(button).click(() => {
                    Api.downloadDPA(void 0, void 0, (err) => {
                        if (err) {
                            console.error(err);
                            return void UI.warn(MessagesCP.error);
                        }
                    });
                });

                const alertClass = signed ? '.cp-accounts-dpa-form'
                                          : '.alert.alert-warning';
                const key = signed ? 'dpa_signed' : 'dpa_generated';
                const cls = !signed ? '' : '.dpa-block';
                const privateData = metadataMgr.getPrivateData();
                const url = privateData.origin + '/support/';
                const buttons = h('div.cp-dpa-form-buttons',
                    signed ? [hideBtn, button]
                           : [button, uploadButton]);
                $div.append([
                    showBtn,
                    h('div.alertdpa'+alertClass+cls, [
                        signed ? h('div.title', Messages.dpa_title)
                               : undefined,
                        UI.setHTML(h('p'),
                        Messages._getKey(key, [url])),
                        buttons
                    ])
                ]);
                $div.find('a').click(e => {
                    e.preventDefault();
                    const url = $(e.target).attr('href');
                    console.error(url);
                    APP.common.gotoURL(url);
                });
                if (dpaState) { $div.find('.alertdpa').show(); }
            };
            if (!obj.new && data && data.signed_on) {
                return void showDownloadBanner(true);
            }

            if (!obj.new && data) { // DPA already generated
                APP.showDpa = true;
                $(showBtn).hide();
                return void showDownloadBanner(false);
            }

            const dpaForm = getDpaForm(Api, hideBtn, true, data => {
                Api.createDpa(data, () => {
                    redraw();
                });
            });
            Lucide.createIcons();
            $div.append([
                showBtn,
                dpaForm
            ]);
        };
        redraw = () => {
            Api.getDpa((err, obj) => {
                if (err) { return; }
                draw(obj);
            });
        };
        redraw();

        return content;
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

                let deleteSigned = h('button.btn.btn-danger', [
                    Icons.get('trash-empty'),
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
                    Icons.get('close'),
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
                    Api.downloadDPA(data.pdf_id, Boolean(data.signed_on), (err) => {
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


            const showBtn = h('button.btn.btn-default.cp-show-dpa', [
                Icons.get('notebook'), Messages.dpa_title
            ]);
            const hideBtn = h('button.btn.btn-default', [
                Icons.get('close'), Messages.closeDetails]);
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
            setTimeout(() => Lucide.createIcons());
            $div.append([
                showBtn,
                dpaBlock
            ]);
        });
    };

    return {
        getDpaForm,
        getDpaAdmin,
        getDpaUser
    };
});
