define([
    '/accounts/plans.js',
],function (Plans) {
    const Stats = {};

    const ENABLED_STATUS = Plans.ENABLED_STATUS;
    const isYearly = Plans.isYearly;
    const cost = Plans.getPlanPrice;

    // ================ TOOLS ================

    Stats.tools = {};

    // Return number of months between 2 dates. d1's month is included, d2's month is not.
    Stats.tools.monthDiff = function (d1, d2) {
        var m = (d2.getFullYear() - d1.getFullYear()) * 12;
        m -= d1.getMonth();
        m += d2.getMonth();
        return m <= 0 ? 0 : m;
    };

    // ================ THIS MONTH'S REVENUE ================

    let today;

    // Filter data set to keep only __active__ and __paid__ subscriptions based
    // on the selected value of 'today'
    const filter = function (s) {
        if (s.status === "refunded") { return; }
        // Remove free subscriptions (plan gift or admin gift)
        if (!s.email) { return; }
        // Remove invalid subscriptions
        if (!s.plan) { return void console.log(s); }
        if (!s.create_time) { return; }
        // Remove subscriptions created after 'today'
        const c = new Date(s.create_time);
        if (!c) {
            return void console.error("Can't parse date...",
                                s.create_time);
        }
        if (c.getFullYear() > today.getFullYear() ||
            (c.getFullYear() === today.getFullYear() && c.getMonth() > today.getMonth())) {
            return;
        }

        // From here, we only active valid subscriptions created
        // before today. We still have to check if they have
        // been cancelled with their 'end_time'

        // Remove inactive subscriptions
        if (!s.end_time && ENABLED_STATUS.indexOf(s.status) === -1) {
            return false;
        }
        // No 'end_time': keep the subscription in the data set
        if (!s.end_time) { return true; }

        // Remove subscriptions ended this month or earlier (subs
        // cancelled this month don't bring money to this
        // month's revenue)
        var d = new Date(s.end_time);
        if (!d) {
            return void console.error("Can't parse date...",
                s.end_time);
        }
        if (d.getFullYear() < today.getFullYear() ||
            (d.getFullYear() === today.getFullYear() && d.getMonth() <= today.getMonth())) {
            return;
        }
        return true;
    };

    // Get this month's revenue from monthly subscriptions
    const monthlyReducer = function (acc, val) {
        if (isYearly(val.plan)) { return acc; }
        return acc + (cost(val.plan) || 0);
    };
    // Get this month's revenue from yearly subscriptions
    const yearlyMeanReducer = function (acc, val) {
        if (!isYearly(val.plan)) { return acc; }
        const c = cost(val.plan, true) || 0;
        return acc + (c / 12);
    };
    // Get this month's revenue from yearly subscriptions
    const yearlyReducer = function (acc, val) {
        if (!isYearly(val.plan)) { return acc; }
        const t = new Date(val.create_time);
        // Paid the same month every year
        if (today.getMonth() !== t.getMonth()) { return acc; }
        const c = cost(val.plan, true) || 0;
        return acc + c;
    };
    // Get the revenue for the next 12 months from active yearly subscription
    const yearReducer = function (acc, val) {
        if (!isYearly(val.plan)) { return acc; }
        if (val.end_time) { return acc; }
        const c = cost(val.plan, true) || 0;

        return acc + c;
    };

    // Get all revenues from this month for a given dataset
    var getTotal = function (subs) {
        const m = subs.reduce(monthlyReducer, 0);
        return {
            number: subs.length,
            monthly: m,
            yearly: subs.reduce(yearlyReducer, 0),
            yearlyMean: subs.reduce(yearlyMeanReducer, 0),
            year: 12*m + subs.reduce(yearReducer, 0)
        };
    };

    Stats.getRevenue = function (data, type) {
        if (type === 'current') {
            today = new Date();
            return getTotal(data.subs.filter(filter));
        }
        if (type === 'previous') {
            today = new Date();
            today.setMonth(today.getMonth() - 1, 1); // Previous month
            return getTotal(data.subs.filter(filter));
        }
    };

    // ================ TOTAL REVENUE ================

    Stats.getTotalRevenue = function (data) {
        // Calculate total as if everything is cancelled next month
        const today = new Date();
        today.setMonth(today.getMonth() + 1, 1);
        const totalSubs = data.subs.filter(function (s) {
            if (!s.email) { return; }
            if (!s.plan) { return; }
            return true;
        });
        return {
            number: totalSubs.length,
            monthly: totalSubs.reduce(function (acc, val) {
                if (isYearly(val.plan)) { return acc; }
                const c = cost(val.plan) || 0;
                if (!c) { return acc; }
                const s = new Date(val.create_time);
                const e = val.end_time ? new Date(val.end_time)
                                       : today;
                return acc + (Stats.tools.monthDiff(s, e) * c);
            }, 0),
            yearly: totalSubs.reduce(function (acc, val) {
                if (!isYearly(val.plan)) { return acc; }
                const c = cost(val.plan) || 0;

                if (!c) { return acc; }
                const s = new Date(val.create_time);
                const e = val.end_time ? new Date(val.end_time)
                                       : today;
                let n = e.getFullYear() - s.getFullYear();
                n += e.getMonth() >= s.getMonth() ? 1 : 0;
                return acc + (n * c);
            }, 0),
        };
    };

    // ================ STATS TABLE ================

    // Get stats we need for the table and for the given month
    // 'm' is the number of month before today for the date we want
    Stats.getTableStats = function (data, m) {
        today = new Date();
        today.setMonth(today.getMonth() - m, 1);

        const month = today.toLocaleDateString(void 0, {
            month: "long",
            year: "numeric"
        });

        let subs = data.subs.filter(filter); // based on "today"
        const total = subs.length;

        // Get only subs created this month
        const newSubs = subs.filter(function (val) {
            const s = new Date(val.create_time);
            if (s.getMonth() !== today.getMonth() || s.getFullYear() !== today.getFullYear()) {
                return;
            }
            return true;
        });

        // Get subs created 'this' month that have been cancelled later
        const newSubsCancelled = newSubs.filter(function (s) {
            return s.end_time;
        });

        const revenue = getTotal(subs);

        // Get subs cancelled this month
        var realToday = today;
        today = new Date();
        today.setMonth(today.getMonth() - m - 1, 1);
        subs = data.subs.filter(filter);
        var subsCancelled = subs.filter(function (val) {
            if (!val.end_time) { return; }
            var e = new Date(val.end_time);
            if (e.getMonth() !== realToday.getMonth() || e.getFullYear() !== realToday.getFullYear()) {
                return;
            }
            return true;
        });


        return {
            month: month,
            subs: total,
            newSubs: newSubs.length,
            subsCancelled: subsCancelled.length,
            newSubsCancelled: newSubsCancelled.length,
            revenue: [revenue.monthly, revenue.yearlyMean, revenue.yearly]
        };
    };

    return Stats;
});
