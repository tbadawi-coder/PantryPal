const db = require('../config/db')
const bcrypt = require('bcryptjs');


exports.newUser = (req, res) => {
    return res.render('./users/new');
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
            req.flash('error', 'An account with that email already exists');
            return req.session.save(() => res.redirect('/users/new'));
        }
        next(error)
    }
    
}

exports.loginForm  = (req, res) => {
    return res.render('./users/login');
}


exports.login  = async (req, res, next) => {
    // res.send('Post Profile Placeholder');
    try{
    // let email = req.body.email
    // let password = req.body.password;
    let {email , password} = req.body;

    if (email){
        email = email.toLowerCase();
    }

    const query = 'SELECT id, username, password FROM users WHERE email = ? LIMIT 1'
    const [results] = await db.execute(query, [email])
    const user = results[0];

    if(!user){
        console.log('Wrong email address');
        req.flash('error', 'Account does not exist');
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
                res.redirect('/users/login');
            })
        }

    }
    }catch (err){
        next(err);

    }

}
exports.profile = async (req, res, next) => {
    try {
        const [rows] = await db.execute('SELECT id, username, email FROM users WHERE id = ?', [req.session.user]);
        const user = rows[0];
        if (!user) return res.redirect('/users/login');
        return res.render('./users/profile', { user });
    } catch (err) {
        next(err);
    }
};

exports.editProfile = async (req, res, next) => {
    try {
        const { username } = req.body;
        const email = req.body.email ? req.body.email.toLowerCase() : '';
        await db.execute('UPDATE users SET username = ?, email = ? WHERE id = ?', [username, email, req.session.user]);
        req.flash('success', 'Profile updated successfully');
        return req.session.save(() => res.redirect('/users/profile'));
    } catch (err) {
        if (err.errno == 1062) {
            req.flash('error', 'Email is already in use');
            return req.session.save(() => res.redirect('/users/profile'));
        }
        next(err);
    }
};

exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        if (newPassword !== confirmPassword) {
            req.flash('error', 'New passwords do not match');
            return req.session.save(() => res.redirect('/users/profile'));
        }
        const [rows] = await db.execute('SELECT password FROM users WHERE id = ?', [req.session.user]);
        const correct = await bcrypt.compare(currentPassword, rows[0].password);
        if (!correct) {
            req.flash('error', 'Current password is incorrect');
            return req.session.save(() => res.redirect('/users/profile'));
        }
        const hashed = await bcrypt.hash(newPassword, 10);
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, req.session.user]);
        req.flash('success', 'Password changed successfully');
        return req.session.save(() => res.redirect('/users/profile'));
    } catch (err) {
        next(err);
    }
};

exports.deleteAccount = async (req, res, next) => {
    try {
        await db.execute('DELETE FROM users WHERE id = ?', [req.session.user]);
        req.session.destroy(() => res.redirect('/'));
    } catch (err) {
        next(err);
    }
};

exports.logout  = (req, res, next) => {
    req.session.destroy(err=>{
        if(err){
            return next(err);
        }else{
            res.redirect('/')
        }
    });
}
