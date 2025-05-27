define([
    '/accounts/plans.js',
    '/customize/messages.js'
], function (Plans, Messages) {
    return function (MyMessages) {
        const extensions = {};

        extensions.TRANSLATIONS = [{
            get: (name) => {
                if (name !== 'accounts') { return; }
                return MyMessages;
            }
        }];
        console.error(Plans);
        extensions.REGISTER_FORM = [{
            getContent: (utils) => {
                const { h } = utils;
                const plans = Plans.getPlansRegister(MyMessages);
                const content = h('div.row', [
                    h('div.col-md-12', [
                        plans
                    ])
                ]);
                return content;
            }
        }];
        extensions.POST_REGISTER = [{
            getContent: (utils) => {
                const { h } = utils;
                const plans = Plans.getPlansRegister(MyMessages);
                const content = h('div.row', [
                    h('div.col-md-12', [
                        plans
                    ])
                ]);
                return content;
            }
        }];

        return extensions;
    };
});
