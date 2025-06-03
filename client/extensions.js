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
        extensions.POST_REGISTER = [{
            getContent: (keys) => {
                return Plans.getPlansRegister(MyMessages, keys);
            }
        }];

        return extensions;
    };
});
