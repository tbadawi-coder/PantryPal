const express = require('express');
const controller = require('../controller/userController');

const router = express.Router();

router.get('/new', controller.newUser)

router.post('/', controller.createUser)

router.get('/login', controller.loginForm)

router.post('/login', controller.login)

router.get('/logout', controller.logout)


module.exports = router;