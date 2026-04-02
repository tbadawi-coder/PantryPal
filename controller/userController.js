const userModel = require('../config/db')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken')


exports.newUser = (req, res) => {
    res.send('GET Profile Placeholder');
    // return res.render('./users/new', { cssFile: '/css/user/new.css' });
    //  create the ejs file with the new user form.
    //  will create the middleware later
};

exports.createUser = async (req, res, next) => {
    // res.send('Post Profile Placeholder');

    try{
        const {username, email, password} = req.body;

        const hashed = await bcrypt.hash(password, 10)
        // double check to make sure that the users table has the autoincrement attached to the id

        const query = `INSERT INTO users (username, email, password) VALUES (?,?,?)`


    }catch(error){
        if(error.errno == 1062){
            const err = new Error('Email already in use' + email)
            err.status = 409;
            next(err)
        }
    }
    
}

exports.loginForm  = (req, res) => {
    res.send('GET Profile Placeholder');
}


exports.login  = (req, res) => {
    res.send('Post Profile Placeholder');
    // return res.render('./users/new', { cssFile: '/css/user/new.css' });
}

exports.logout  = (req, res) => {
    res.send('GET Profile Placeholder');
}
