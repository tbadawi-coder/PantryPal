const express = require('express');
const controller = require('../controller/userController');
const { isGuest, isLoggedIn } = require('../middleware/auth');
const {validateLogIn, validateSignUp, validateResult} = require('../middleware/validator');


const router = express.Router();

router.get('/new', isGuest, controller.newUser)

router.post('/',isGuest, validateSignUp, validateResult, controller.createUser)

router.get('/login',isGuest, controller.loginForm)

router.post('/login', isGuest, validateLogIn, validateResult, controller.login)

router.get('/logout', isLoggedIn, controller.logout)

router.get('/profile', isLoggedIn, controller.profile)
router.post('/profile/edit', isLoggedIn, controller.editProfile)
router.post('/profile/password', isLoggedIn, controller.changePassword)
router.post('/profile/delete', isLoggedIn, controller.deleteAccount)


module.exports = router;