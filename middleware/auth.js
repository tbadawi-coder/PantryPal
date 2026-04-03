
exports.isGuest = (req, res, next) => {
    if (!req.session.user) {
        return next();
    } else {
        req.flash('error', 'You are logged in');
        req.session.save(() => {
            return res.redirect('/users/profile');
        });
    }
};




exports.isLoggedIn = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Need to login in');
        req.session.save(() => {
            return res.redirect('/users/login');
        });
    }
};