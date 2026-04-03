const {body, param} = require('express-validator');
const {validationResult} = require('express-validator');

exports.validateSignUp = [
    body('firstName', 'First name cannot be empty').notEmpty().trim().escape(),
    body('lastName', 'Last name cannot be empty').notEmpty().trim().escape(),
    body('email', 'Email must be a valid email address').isEmail().trim().escape().normalizeEmail(),
    body('password', 'Password must be between 8 and 64 characters').isLength({ min: 8, max: 64 })
];

exports.validateLogIn = [
    body('email', 'Email must be a valid email address').isEmail().trim().escape().normalizeEmail(),
    body('password', 'Password must be between 8 and 64 characters').isLength({ min: 8, max: 64 })
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
            res.redirect('back');
        });
    }else{
        return next();
    }
};