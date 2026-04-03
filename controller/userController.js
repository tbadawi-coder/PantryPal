const userModel = require('../config/db')
const bcrypt = require('bcryptjs');


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
        const [results] = await db.execute(query, [username, email, hashed])

        if(results && results.affectedRows > 0){
            req.flash('success', 'Your account has been registered');
            return req.session.save(()=>{
                // basically it will go straight to the login page
                res.redirect('/users/login')
            });
        }else{
            req.flash('error', 'Unable to register user account');
            return req.session.save(() =>{
                // will redirect back to the signup page to try again
                res.redirect('/users/new')
            });
        }




    }catch(error){
        if(error.errno == 1062){
            const err = new Error('Email already in use' + email)
            err.status = 409;
            return next(err)
        }
        next(error)
    }
    
}

exports.loginForm  = (req, res) => {
    res.send('GET Login Placeholder');
    // if we do ejs uncomment the below 
    // return res.render('./users/login', { cssFile: './styles.css' })
}


exports.login  = async (req, res) => {
    // res.send('Post Profile Placeholder');
    try{
    // let email = req.body.email
    // let password = req.body.password;
    const {email , password} = req.body;

    if (email){
        email = email.toLowerCase();
    }

    const query = 'SELECT id, username, password FROM users WHERE email = ? LIMIT 1'
    const [results] = await db.execute(query, [email])
    const user = results[0];

    if(!user){
        console.log('Wrong email address');
        req.flash('error', 'wrong email address');
        return req.session.save(() => {
            res.redirect('/users/login');
        });
    }else{
        const passCorrect = await bcrypt.compare(password, user.password);
        
        if(passCorrect){
            req.session.user = user.id;
            req.flash('success', 'You have successfully logged in');
            return req.session.save(()=>{
                // we can see where we want to redirect this to. Just a placeholder for now.
                res.redirect('/');
            })
        }else{
            req.flash('error', 'Incorrect Password');
            return req.session.save(()=>{
                // user will be asked to login again, form will reload 
                res.redirect('users/login');
            })
        }

    }
    }catch (err){
        next(err);

    }

}
//  can also implement profile so users can see all their ingreidents, saved recipe and possibly any recipes they create/upload
//  gets rid of the user attached to the session so views will not contain any user information.
exports.logout  = (req, res) => {
    res.send('GET Profile Placeholder');
    req.session.destroy(err=>{
        if(err){
            return next(err);
        }else{
            res.redirect('/')
        }
    });

}
