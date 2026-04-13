const db = require('../config/db');

// Get all meals for the logged in user for a given week
exports.getMeals = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const [rows] = await db.execute(
            `SELECT * FROM meal_plans
             WHERE user_id = ? AND date BETWEEN ? AND ?
             ORDER BY date, meal_type`,
            [req.session.user, startDate, endDate]
        );
        res.json({ success: true, meals: rows });
    } catch (err) {
        next(err);
    }
};

// Add a meal to the planner
exports.addMeal = async (req, res, next) => {
    try {
        const { recipe_id, recipe_name, recipe_image, date, meal_type } = req.body;

        // Check if that meal slot is already taken
        const [existing] = await db.execute(
            `SELECT id, recipe_name FROM meal_plans WHERE user_id = ? AND date = ? AND meal_type = ?`,
            [req.session.user, date, meal_type]
        );

        if (existing.length > 0) {
            if (req.body.confirmed !== true) {
                return res.json({ success: false, conflict: true, existingName: existing[0].recipe_name });
            }
            await db.execute(
                `UPDATE meal_plans SET recipe_id = ?, recipe_name = ?, recipe_image = ?
                 WHERE user_id = ? AND date = ? AND meal_type = ?`,
                [recipe_id, recipe_name, recipe_image, req.session.user, date, meal_type]
            );
        } else {
            await db.execute(
                `INSERT INTO meal_plans (user_id, recipe_id, recipe_name, recipe_image, date, meal_type)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [req.session.user, recipe_id, recipe_name, recipe_image, date, meal_type]
            );
        }

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

// Paste copied meals into any week
exports.pasteWeek = async (req, res, next) => {
    try {
        const { weekStart, meals } = req.body;
        const [wy, wm, wd] = weekStart.split('-').map(Number);
        const monday = new Date(wy, wm - 1, wd);

        for (const meal of meals) {
            const mealDate = new Date(monday);
            mealDate.setDate(mealDate.getDate() + meal.dayOffset);
            const y = mealDate.getFullYear();
            const m = String(mealDate.getMonth() + 1).padStart(2, '0');
            const d = String(mealDate.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;

            const [existing] = await db.execute(
                `SELECT id FROM meal_plans WHERE user_id = ? AND date = ? AND meal_type = ?`,
                [req.session.user, dateStr, meal.meal_type]
            );

            if (existing.length === 0) {
                await db.execute(
                    `INSERT INTO meal_plans (user_id, recipe_id, recipe_name, recipe_image, date, meal_type)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [req.session.user, meal.recipe_id, meal.recipe_name, meal.recipe_image, dateStr, meal.meal_type]
                );
            }
        }
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

// Copy current week's meals to next week
exports.copyLastWeek = async (req, res, next) => {
    try {
        const { currentStart, currentEnd } = req.body;

        const fmt = d => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        // Get current week's meals
        const [currentMeals] = await db.execute(
            `SELECT * FROM meal_plans WHERE user_id = ? AND date BETWEEN ? AND ?`,
            [req.session.user, currentStart, currentEnd]
        );

        if (currentMeals.length === 0) {
            return res.json({ success: false, empty: true });
        }

        // Insert each meal shifted forward by 7 days, skip conflicts
        for (const meal of currentMeals) {
            const mealDate = new Date(meal.date);
            mealDate.setDate(mealDate.getDate() + 7);
            const newDate = fmt(mealDate);

            const [existing] = await db.execute(
                `SELECT id FROM meal_plans WHERE user_id = ? AND date = ? AND meal_type = ?`,
                [req.session.user, newDate, meal.meal_type]
            );

            if (existing.length === 0) {
                await db.execute(
                    `INSERT INTO meal_plans (user_id, recipe_id, recipe_name, recipe_image, date, meal_type)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [req.session.user, meal.recipe_id, meal.recipe_name, meal.recipe_image, newDate, meal.meal_type]
                );
            }
        }

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

// Clear all meals for a week
exports.clearWeek = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.body;
        await db.execute(
            `DELETE FROM meal_plans WHERE user_id = ? AND date BETWEEN ? AND ?`,
            [req.session.user, startDate, endDate]
        );
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

// Get notes for a week
exports.getNotes = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const [rows] = await db.execute(
            `SELECT * FROM slot_notes WHERE user_id = ? AND date BETWEEN ? AND ?`,
            [req.session.user, startDate, endDate]
        );
        res.json({ success: true, notes: rows });
    } catch (err) {
        next(err);
    }
};

// Save or update a note for a slot
exports.saveNote = async (req, res, next) => {
    try {
        const { date, meal_type, notes } = req.body;
        await db.execute(
            `INSERT INTO slot_notes (user_id, date, meal_type, notes)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE notes = ?`,
            [req.session.user, date, meal_type, notes, notes]
        );
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

// Delete a meal from the planner
exports.deleteMeal = async (req, res, next) => {
    try {
        const { id } = req.params;
        await db.execute(
            `DELETE FROM meal_plans WHERE id = ? AND user_id = ?`,
            [id, req.session.user]
        );
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};
