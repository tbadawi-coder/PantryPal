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

function normalizeIngredient(text) {
    return String(text).trim().toLowerCase();
}

// Add ingredient
function addIngredient() {
    const input = document.getElementById("ingredientInput");
    if (!input) return;

    const value = normalizeIngredient(input.value);

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

//Extract the full ingredient list from the MealDB API response
function extractIngredients(meal) {
    const recipeIngredients = [];
    for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        if (ingredient && ingredient.trim() !== "") {
            recipeIngredients.push(normalizeIngredient(ingredient));
        }
    }
    return recipeIngredients;
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
        const candidateFetches = ingredients.map((ingredient) =>
            fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingredient)}`)
                .then((res) => {
                    if (!res.ok) {
                        throw new Error(`Failed to fetch recipes for ingredient: ${ingredient}`);
                    }
                    return res.json();
                })
        );

        const candidateResults = await Promise.all(candidateFetches);

        const candidateMealMap = {};

        candidateResults.forEach((data) => {
            if (!data.meals) return;
            data.meals.forEach((meal) => {
                if (!candidateMealMap[meal.idMeal]) {
                    candidateMealMap[meal.idMeal] = meal;
                }
            });
        });

        const candidateMeals = Object.values(candidateMealMap);

        if (candidateMeals.length === 0) {
            results.innerHTML = "<p class='muted'>No recipes found.</p>";
            return;
        }

        const detailFetches = candidateMeals.map((meal) =>
            fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`)
                .then((res) => {
                    if (!res.ok) {
                        throw new Error(`Failed to fetch details for meal ID: ${meal.idMeal}`);
                    }
                    return res.json();
                })
        );

        const detailResults = await Promise.all(detailFetches);

        const pantrySet = new Set(ingredients);

        const scoredMeals = detailResults
            .map((data) => (data.meals && data.meals[0] ? data.meals[0] : null))
            .filter(Boolean)
            .map((meal) => {
                const recipeIngredients = extractIngredients(meal);

                const matchedIngredients = recipeIngredients.filter((ingredient) =>
                    pantrySet.has(ingredient)
                );

                const missingIngredients = recipeIngredients.filter((ingredient) =>
                    !pantrySet.has(ingredient)
                );

                return {
                    meal,
                    matchCount: matchedIngredients.length,
                    missingCount: missingIngredients.length,
                    matchedIngredients,
                    missingIngredients,
                    totalRecipeIngredients: recipeIngredients.length
                };
            });

        const filteredMeals = scoredMeals.filter((item) => item.matchCount > 0);

        if (filteredMeals.length === 0) {
            results.innerHTML = "<p class='muted'>No recipes found with your pantry ingredients.</p>";
            return;
        }

        const canMakeNow = filteredMeals
            .filter((item) => item.missingCount === 0)
            .sort((a, b) => b.matchCount - a.matchCount);

        const almostThere = filteredMeals
            .filter((item) => item.missingCount > 0 && item.missingCount <= 3)
            .sort((a, b) => {
                if (a.missingCount !== b.missingCount) {
                    return a.missingCount - b.missingCount;
                }
                return b.matchCount - a.matchCount;
            });

        results.innerHTML = "";

        if (canMakeNow.length === 0 && almostThere.length === 0) {
            results.innerHTML = "<p class='muted'>No recipes found.</p>";
            return;
        }

        if (canMakeNow.length > 0) {
            const makeNowHeader = document.createElement("h2");
            makeNowHeader.textContent = "Can Make Now";
            results.appendChild(makeNowHeader);

            canMakeNow.forEach((item) => {
                const { meal, matchCount } = item;

                const div = document.createElement("div");
                div.classList.add("recipe-card");
                div.innerHTML = `
                    <h3>${escapeHtml(meal.strMeal)}</h3>
                    <img src="${meal.strMealThumb}" alt="${escapeHtml(meal.strMeal)}" loading="lazy">
                    <p class="match-info">You can make this now • Uses ${matchCount} ingredient(s)</p>
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
        }

        if (almostThere.length > 0) {
            const almostHeader = document.createElement("h2");
            almostHeader.textContent = "Almost There";
            results.appendChild(almostHeader);

            almostThere.forEach((item) => {
                const { meal, matchCount, missingCount, missingIngredients } = item;

                const div = document.createElement("div");
                div.classList.add("recipe-card");
                div.innerHTML = `
                    <h3>${escapeHtml(meal.strMeal)}</h3>
                    <img src="${meal.strMealThumb}" alt="${escapeHtml(meal.strMeal)}" loading="lazy">
                    <p class="match-info">Matches ${matchCount} ingredient(s) • Missing ${missingCount}</p>
                    <p class="muted">Missing: ${escapeHtml(missingIngredients.join(", "))}</p>
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