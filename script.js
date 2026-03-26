let ingredients = JSON.parse(localStorage.getItem("ingredients")) || [];
ingredients = ingredients
    .map((i) => String(i).trim())
    .filter((i) => i !== "");
localStorage.setItem("ingredients", JSON.stringify(ingredients));

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[c]));
}

// Add ingredient
function addIngredient() {
    const input = document.getElementById("ingredientInput");
    const value = input.value.trim();

    if (value !== "") {
        ingredients.push(value);
        localStorage.setItem("ingredients", JSON.stringify(ingredients));
        displayIngredients();
        input.value = "";
    }
}

// Display ingredients
function displayIngredients() {
    const list = document.getElementById("ingredientList");
    if (!list) return;
    list.innerHTML = "";
    ingredients.forEach((item, index) => {
        const li = document.createElement("li");
        li.classList.add("ingredient-item");
        li.innerHTML = `
            <span class="ingredient-text">${escapeHtml(item)}</span>
            <span class="delete-btn" onclick="deleteIngredient(${index})" aria-label="Delete ingredient">✕</span>
        `;
        list.appendChild(li);
    });
}
// Delete ingredient
function deleteIngredient(index) {
    ingredients.splice(index, 1);
    localStorage.setItem("ingredients", JSON.stringify(ingredients));
    displayIngredients();
}

// Go to results page
function goToResults() {
    window.location.href = "results.html";
}

// Fetch recipes from MealDB using multiple ingredients
async function fetchRecipes() {
    const results = document.getElementById("recipeResults");
    if (!results) return;
    if (ingredients.length === 0) {
        results.innerHTML = "<p class='muted'>No ingredients provided.</p>";
        return;
    }

    try {
        // Make a separate API call for each ingredient
        const fetchPromises = ingredients.map(ingredient =>
            fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingredient)}`)
                .then(res => res.json())
        );

        const allResults = await Promise.all(fetchPromises);

        // Get meal IDs from each ingredient's results
        const mealIdSets = allResults.map(data => {
            const meals = data && data.meals ? data.meals : [];
            return new Set(meals.map(m => m.idMeal));
        });

        // Find meals that appear in ALL ingredient results (intersection)
        const commonIds = [...mealIdSets[0]].filter(id =>
            mealIdSets.every(set => set.has(id))
        );

        if (commonIds.length === 0) {
            results.innerHTML = "<p class='muted'>No recipes found matching all ingredients.</p>";
            return;
        }

        // Get meal details from first result that matched
        const mealsForCards = (allResults[0] && allResults[0].meals) ? allResults[0].meals : [];
        const allMeals = mealsForCards.filter(m => commonIds.includes(m.idMeal));

        results.innerHTML = "";
        allMeals.forEach(meal => {
    const div = document.createElement("div");
    div.classList.add("recipe-card");
    div.innerHTML = `
        <h3>${escapeHtml(meal.strMeal)}</h3>
        <img src="${meal.strMealThumb}" alt="${escapeHtml(meal.strMeal)}" loading="lazy">
    `;
    const openRecipe = () => {
        localStorage.setItem("selectedMealId", meal.idMeal);
        window.location.href = "recipe.html";
    };
    div.addEventListener("click", openRecipe);
    div.tabIndex = 0;
    div.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openRecipe();
        }
    });
    results.appendChild(div);
});

    } catch (error) {
        results.innerHTML = "<p class='muted'>Error fetching recipes.</p>";
        console.error(error);
    }
}
// Run on page load
document.addEventListener("DOMContentLoaded", () => {
    displayIngredients();
    fetchRecipes();
});