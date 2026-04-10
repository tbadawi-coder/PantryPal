const {body, param} = require('express-validator');
const {validationResult} = require('express-validator');

exports.validateSignUp = [
    body('username', 'Username cannot be empty').notEmpty().trim().escape(),
    body('email', 'Email must be a valid email address').isEmail().trim().escape(),
    body('password', 'Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character (!@#$%^&*)')
        .isLength({ min: 8, max: 64 })
        .matches(/[A-Z]/)
        .matches(/[a-z]/)
        .matches(/[0-9]/)
        .matches(/[!@#$%^&*]/)
];

exports.validateLogIn = [
    body('email', 'Email must be a valid email address').isEmail().trim().escape(),
    body('password', 'Password cannot be empty').notEmpty()
];

exports.validateId = [
    param('id')
    .trim()
    .escape()
    .isInt({min: 1})
    .withMessage('id must be positive integer')
]


exports.validateResult = (req, res, next) =>{
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        errors.array().forEach(error => {
            req.flash('error', error.msg);
        });
        return req.session.save(() => {
            res.redirect(req.headers.referer || '/');
        });
    }else{
        return next();
    }
};