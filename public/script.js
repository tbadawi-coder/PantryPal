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

function ingredientTokens(text) {
    const stopWords = new Set([
        "fresh", "dried", "ground", "chopped", "diced", "sliced", "minced",
        "large", "small", "medium", "extra", "virgin", "boneless", "skinless",
        "optional", "to", "taste", "of", "and"
    ]);

    return normalizeIngredient(text)
        .replace(/[(),.-]/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .filter((word) => !stopWords.has(word));
}

// Strict matching for "Can Make Now" Section
function isUltraStrictMatch(recipeIngredient, pantryIngredient) {
    const recipeNorm = normalizeIngredient(recipeIngredient);
    const pantryNorm = normalizeIngredient(pantryIngredient);

    if (!recipeNorm || !pantryNorm) return false;

    const recipeWords = ingredientTokens(recipeNorm);
    const pantryWords = ingredientTokens(pantryNorm);

    if (recipeWords.length === 0 || pantryWords.length === 0) return false;

    if (recipeNorm === pantryNorm) return true;

    if (pantryWords.length === 1) {
        return recipeWords[0] === pantryWords[0];
    }

    return pantryWords.every((word) => recipeWords.includes(word));
}

// Smarter matching for "Almost There" Section
function isSmartMatch(recipeIngredient, pantryIngredient) {
    const recipeNorm = normalizeIngredient(recipeIngredient);
    const pantryNorm = normalizeIngredient(pantryIngredient);

    if (!recipeNorm || !pantryNorm) return false;

    if (recipeNorm === pantryNorm) return true;

    const recipeWords = ingredientTokens(recipeNorm);
    const pantryWords = ingredientTokens(pantryNorm);

    if (recipeWords.length === 0 || pantryWords.length === 0) return false;

    if (pantryWords.length === 1) {
        return recipeWords.includes(pantryWords[0]);
    }

    const overlapCount = pantryWords.filter((word) => recipeWords.includes(word)).length;
    return overlapCount >= Math.ceil(pantryWords.length / 2);
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
    window.location.href = "/results.html";
}

// Extract full ingredient list from MealDB response
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

function makeRecipeCard(item, mode = "smart") {
    const { meal } = item;

    const div = document.createElement("div");
    div.classList.add("recipe-card");

    if (mode === "strict") {
        div.innerHTML = `
            <h3>${escapeHtml(meal.strMeal)}</h3>
            <img src="${meal.strMealThumb}" alt="${escapeHtml(meal.strMeal)}" loading="lazy">
            <p class="match-info">You can make this now</p>
        `;
    } else {
        div.innerHTML = `
            <h3>${escapeHtml(meal.strMeal)}</h3>
            <img src="${meal.strMealThumb}" alt="${escapeHtml(meal.strMeal)}" loading="lazy">
            <p class="match-info">Matches ${item.smartMatchCount} ingredient(s) • Missing ${item.smartMissingCount}</p>
            <p class="muted">Missing: ${escapeHtml(item.smartMissingIngredients.join(", "))}</p>
        `;
    }

    const openRecipe = () => {
        localStorage.setItem("selectedMealId", meal.idMeal);
        window.location.href = "/recipe.html";
    };

    div.addEventListener("click", openRecipe);
    div.tabIndex = 0;
    div.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openRecipe();
        }
    });

    return div;
}

function renderRecipeSections(results, canMakeNow, almostThere) {
    results.innerHTML = "";

    const sectionsWrapper = document.createElement("div");
    sectionsWrapper.classList.add("results-sections");

    if (canMakeNow.length > 0) {
        const canMakeNowColumn = document.createElement("div");
        canMakeNowColumn.classList.add("results-column");

        const makeNowHeader = document.createElement("h2");
        makeNowHeader.textContent = "Can Make Now";
        makeNowHeader.classList.add("results-heading");

        const makeNowGrid = document.createElement("div");
        makeNowGrid.classList.add("recipe-grid");

        canMakeNow.forEach((item) => {
            makeNowGrid.appendChild(makeRecipeCard(item, "strict"));
        });

        canMakeNowColumn.appendChild(makeNowHeader);
        canMakeNowColumn.appendChild(makeNowGrid);
        sectionsWrapper.appendChild(canMakeNowColumn);
    }

    if (almostThere.length > 0) {
        const almostThereColumn = document.createElement("div");
        almostThereColumn.classList.add("results-column");

        const almostHeader = document.createElement("h2");
        almostHeader.textContent = "Almost There";
        almostHeader.classList.add("results-heading");

        const almostGrid = document.createElement("div");
        almostGrid.classList.add("recipe-grid");

        almostThere.forEach((item) => {
            almostGrid.appendChild(makeRecipeCard(item, "smart"));
        });

        almostThereColumn.appendChild(almostHeader);
        almostThereColumn.appendChild(almostGrid);
        sectionsWrapper.appendChild(almostThereColumn);
    }

    results.appendChild(sectionsWrapper);
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

        const detailResults = [];

        for (const meal of candidateMeals) {
            try {
                const res = await fetch(`/api/meal-details/${meal.idMeal}`);

                if (!res.ok) {
                    console.warn(`Skipped meal ${meal.idMeal} - status ${res.status}`);
                    continue;
                }

                const data = await res.json();

                if (data.meals && data.meals[0]) {
                    detailResults.push(data);
                }

                /*await new Promise((resolve) => setTimeout(resolve, 100));*/
            } catch (error) {
                console.error(`Failed to fetch details for meal ID: ${meal.idMeal}`, error);
            }
        }

        if (detailResults.length === 0) {
            results.innerHTML = "<p class='muted'>Could not load recipe details right now. Please try again.</p>";
            return;
        }

        const scoredMeals = detailResults
            .map((data) => (data.meals && data.meals[0] ? data.meals[0] : null))
            .filter(Boolean)
            .map((meal) => {
                const recipeIngredients = extractIngredients(meal);

                const strictMatchedIngredients = recipeIngredients.filter((ingredient) =>
                    ingredients.some((pantryItem) => isUltraStrictMatch(ingredient, pantryItem))
                );

                const strictMissingIngredients = recipeIngredients.filter((ingredient) =>
                    !ingredients.some((pantryItem) => isUltraStrictMatch(ingredient, pantryItem))
                );

                const smartMatchedIngredients = recipeIngredients.filter((ingredient) =>
                    ingredients.some((pantryItem) => isSmartMatch(ingredient, pantryItem))
                );

                const smartMissingIngredients = recipeIngredients.filter((ingredient) =>
                    !ingredients.some((pantryItem) => isSmartMatch(ingredient, pantryItem))
                );

                return {
                    meal,
                    recipeIngredients,

                    strictMatchCount: strictMatchedIngredients.length,
                    strictMissingCount: strictMissingIngredients.length,
                    strictMatchedIngredients,
                    strictMissingIngredients,

                    smartMatchCount: smartMatchedIngredients.length,
                    smartMissingCount: smartMissingIngredients.length,
                    smartMatchedIngredients,
                    smartMissingIngredients,

                    totalRecipeIngredients: recipeIngredients.length
                };
            });

        const canMakeNow = scoredMeals
            .filter((item) =>
                item.totalRecipeIngredients > 0 &&
                (item.strictMissingCount === 0 || item.smartMissingCount === 0)
             )
            .sort((a, b) => {
                if (b.smartMatchCount !== a.smartMatchCount) {
                    return b.smartMatchCount - a.smartMatchCount;
                }
                return b.strictMatchCount - a.strictMatchCount;
            });

        const almostThere = scoredMeals
            .filter((item) =>
                item.smartMissingCount > 0 &&
                item.smartMatchCount >= 2 &&
                item.smartMissingCount <= 5
            )
            .sort((a, b) => {
                if (a.smartMissingCount !== b.smartMissingCount) {
                    return a.smartMissingCount - b.smartMissingCount;
                }
                return b.smartMatchCount - a.smartMatchCount;
            });

        if (canMakeNow.length === 0 && almostThere.length === 0) {
            results.innerHTML = "<p class='muted'>No recipes found with your pantry ingredients.</p>";
            return;
        }

        renderRecipeSections(results, canMakeNow, almostThere);
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