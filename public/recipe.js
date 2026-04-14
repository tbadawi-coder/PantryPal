const mealId = localStorage.getItem("selectedMealId");

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[c]));
}

async function fetchRecipeDetail() {
    const detail = document.getElementById("recipeDetail");
    const title = document.getElementById("recipeTitle");

    if (!mealId) {
        detail.innerHTML = "<p class='muted'>No recipe selected.</p>";
        return;
    }

    try {
        const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`);
        const data = await response.json();
        const meal = data && data.meals ? data.meals[0] : null;
        if (!meal) {
            detail.innerHTML = "<p class='muted'>No recipe details found.</p>";
            return;
        }

        title.textContent = meal.strMeal || "Recipe";

        // Collect ingredients
        let ingredientsList = "";
        for (let i = 1; i <= 20; i++) {
            const ingredient = meal[`strIngredient${i}`];
            const measure = meal[`strMeasure${i}`];
            if (ingredient && ingredient.trim() !== "") {
                const safeMeasure = measure ? escapeHtml(measure) : "";
                const safeIngredient = escapeHtml(ingredient);
                ingredientsList += `<li>${safeMeasure}${safeMeasure ? " " : ""}${safeIngredient}</li>`;
            }
        }

        // Check if coming from planner
        const plannerSlot = sessionStorage.getItem('plannerSlot');
        let addToPlannerBtn = '';
        if (plannerSlot) {
            const slot = JSON.parse(plannerSlot);
            addToPlannerBtn = `
                <button type="button" class="btn add-to-planner-btn" id="add-to-planner">
                    + Add to Planner (${slot.meal_type} on ${slot.date})
                </button>`;
        } else {
            addToPlannerBtn = `
                <button type="button" class="btn add-to-planner-btn" id="add-to-planner">
                    + Add to Planner
                </button>`;
        }

        detail.innerHTML = `
            <div class="recipe-detail-card">
                <img src="${meal.strMealThumb}" alt="${escapeHtml(meal.strMeal || "Recipe")}" loading="lazy">
                ${addToPlannerBtn}
                <h2>Ingredients</h2>
                <ul>${ingredientsList}</ul>
                <h2>Instructions</h2>
                <p>${escapeHtml(meal.strInstructions || "")}</p>
            </div>
        `;

        document.getElementById('add-to-planner').addEventListener('click', () => {
            handleAddToPlanner(meal);
        });

    } catch (error) {
        detail.innerHTML = "<p class='muted'>Error loading recipe.</p>";
        console.error(error);
    }
}

async function handleAddToPlanner(meal) {
    // Check if logged in first
    const meRes = await fetch('/api/me');
    const meData = await meRes.json();
    if (!meData.loggedIn) {
        window.location.href = '/users/login';
        return;
    }

    const plannerSlot = sessionStorage.getItem('plannerSlot');

    if (plannerSlot) {
        // Coming from planner — use stored slot directly
        const slot = JSON.parse(plannerSlot);
        await saveMeal(meal, slot.date, slot.meal_type);
        sessionStorage.removeItem('plannerSlot');
        window.location.href = '/planner.html';
    } else {
        // Show picker modal
        showPlannerModal(meal);
    }
}

function showPlannerModal(meal) {
    const today = new Date().toISOString().split('T')[0];
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'planner-modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal">
            <h3>Add to Planner</h3>
            <p class="muted">${escapeHtml(meal.strMeal)}</p>
            <div class="form-group">
                <label for="planner-date">Date</label>
                <input type="date" id="planner-date" value="${today}" min="${today}">
            </div>
            <div class="form-group">
                <label for="planner-meal-type">Meal</label>
                <select id="planner-meal-type">
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                </select>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn" id="planner-modal-confirm">Add</button>
                <button type="button" class="btn btn-outline" id="planner-modal-cancel">Cancel</button>
            </div>
        </div>`;
    document.body.appendChild(modal);

    document.getElementById('planner-modal-cancel').addEventListener('click', () => modal.remove());
    document.getElementById('planner-modal-confirm').addEventListener('click', async () => {
        const date = document.getElementById('planner-date').value;
        const mealType = document.getElementById('planner-meal-type').value;
        await saveMeal(meal, date, mealType);
        modal.remove();
        window.location.href = '/planner.html';
    });
}

async function saveMeal(meal, date, mealType, confirmed = false) {
    const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            recipe_id: meal.idMeal,
            recipe_name: meal.strMeal,
            recipe_image: meal.strMealThumb,
            date,
            meal_type: mealType,
            confirmed
        })
    });
    const data = await res.json();
    if (data.conflict) {
        const replace = confirm(`You already have "${data.existingName}" for ${mealType} on ${date}. Replace it?`);
        if (replace) {
            await saveMeal(meal, date, mealType, true);
        }
    }
}

document.addEventListener("DOMContentLoaded", fetchRecipeDetail);
