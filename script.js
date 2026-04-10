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
    if (!input) return;

    const value = input.value.trim().toLowerCase();

    if (value !== "" && !ingredients.includes(value)) {
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

    results.innerHTML = "<p class='muted'>Loading recipes...</p>";

    try {

        // Make a separate API call for each ingredient
        const fetchPromises = ingredients.map((ingredient) =>
            fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingredient)}`)
                .then((res) => {
                    if (!res.ok) {
                        throw new Error('Request failed for ingredient: ${ingredient}');
                    }
                    return res.json();
                })
        );

        const allResults = await Promise.all(fetchPromises);
        //Count how many ingredients searches each meal appears
        const mealMap = {};

        allResults.forEach((data) => {
            if(!data.meals) return;
            data.meals.forEach(meal => {
                if (!mealMap[meal.idMeal]) {
                    mealMap[meal.idMeal] = { meal: meal, count: 1 };
                } else {
                    mealMap[meal.idMeal].count++;
                }
            });
        });

        const mealsArray = Object.values(mealMap);

        if (mealsArray.length === 0) {
            results.innerHTML = "<p class='muted'>No recipes found.</p>";
            return;
        }

        //Sorting by highest count of ingredient matches
        mealsArray.sort((a, b) => b.count - a.count);

        results.innerHTML = "";

        let shownCount = 0;

        mealsArray.forEach(item => {
            const meal = item.meal;
            const matchCount = item.count;
            
            //how many ingrediants from pantry are NOT used by the recipe
            const missingCount = ingredients.length - matchCount;

            //Show recipes missing 3 or fewer ingredients
            if(missingCount > 3) return;

            const div = document.createElement("div");
            div.classList.add("recipe-card");
            div.innerHTML = `
                <h3>${escapeHtml(meal.strMeal)}</h3>
                <img src="${meal.strMealThumb}" alt="${escapeHtml(meal.strMeal)}" loading="lazy">
                <p class="match-info">Matches ${matchCount} ingredient(s) | Missing ${missingCount} ingredient(s)</p>
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
            shownCount++;
        });

        if (shownCount === 0) {
            results.innerHTML = "<p class='muted'>No recipes found with 3 or fewer missing pantry ingredients.</p>";
        }

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