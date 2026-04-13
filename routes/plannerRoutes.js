const express = require('express');
const router = express.Router();
const controller = require('../controller/plannerController');
const { isLoggedIn } = require('../middleware/auth');

router.get('/', isLoggedIn, controller.getMeals);
router.post('/', isLoggedIn, controller.addMeal);
router.delete('/:id', isLoggedIn, controller.deleteMeal);
router.get('/notes', isLoggedIn, controller.getNotes);
router.post('/notes', isLoggedIn, controller.saveNote);
router.post('/clear-week', isLoggedIn, controller.clearWeek);
router.post('/copy-last-week', isLoggedIn, controller.copyLastWeek);
router.post('/paste-week', isLoggedIn, controller.pasteWeek);

module.exports = router;
