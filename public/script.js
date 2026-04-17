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

const INGREDIENT_STOP_WORDS = new Set([
    "fresh", "dried", "ground", "chopped", "diced", "sliced", "minced",
    "large", "small", "medium", "extra", "virgin", "boneless", "skinless",
    "optional", "to", "taste", "of", "and"
]);

/** @param {string} norm already lowercased / trimmed */
function ingredientTokensNormalized(norm) {
    return norm
        .replace(/[(),.-]/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .filter((word) => !INGREDIENT_STOP_WORDS.has(word));
}

function buildPantryProfiles(pantryNorms) {
    return pantryNorms.map((norm) => {
        const words = ingredientTokensNormalized(norm);
        return { norm, words };
    });
}

function matchesUltraStrictPrecomputed(recipeNorm, recipeWords, recipeWordSet, pantry) {
    const { norm: pantryNorm, words: pantryWords } = pantry;
    if (!recipeNorm || !pantryNorm) return false;
    if (recipeWords.length === 0 || pantryWords.length === 0) return false;
    if (recipeNorm === pantryNorm) return true;
    if (pantryWords.length === 1) {
        return recipeWords[0] === pantryWords[0];
    }
    return pantryWords.every((word) => recipeWordSet.has(word));
}

function matchesSmartPrecomputed(recipeNorm, recipeWords, recipeWordSet, pantry) {
    const { norm: pantryNorm, words: pantryWords } = pantry;
    if (!recipeNorm || !pantryNorm) return false;
    if (recipeNorm === pantryNorm) return true;
    if (recipeWords.length === 0 || pantryWords.length === 0) return false;
    if (pantryWords.length === 1) {
        return recipeWordSet.has(pantryWords[0]);
    }
    let overlap = 0;
    for (let i = 0; i < pantryWords.length; i++) {
        if (recipeWordSet.has(pantryWords[i])) overlap++;
    }
    return overlap >= Math.ceil(pantryWords.length / 2);
}

function scoreRecipeAgainstPantry(recipeIngredients, pantryProfiles) {
    const strictMatchedIngredients = [];
    const strictMissingIngredients = [];
    const smartMatchedIngredients = [];
    const smartMissingIngredients = [];

    for (let r = 0; r < recipeIngredients.length; r++) {
        const recipeIng = recipeIngredients[r];
        const recipeWords = ingredientTokensNormalized(recipeIng);
        const recipeWordSet = new Set(recipeWords);

        let strictOk = false;
        let smartOk = false;
        for (let p = 0; p < pantryProfiles.length; p++) {
            const pantry = pantryProfiles[p];
            if (!strictOk && matchesUltraStrictPrecomputed(recipeIng, recipeWords, recipeWordSet, pantry)) {
                strictOk = true;
            }
            if (!smartOk && matchesSmartPrecomputed(recipeIng, recipeWords, recipeWordSet, pantry)) {
                smartOk = true;
            }
            if (strictOk && smartOk) break;
        }

        if (strictOk) strictMatchedIngredients.push(recipeIng);
        else strictMissingIngredients.push(recipeIng);
        if (smartOk) smartMatchedIngredients.push(recipeIng);
        else smartMissingIngredients.push(recipeIng);
    }

    return {
        recipeIngredients,
        strictMatchedIngredients,
        strictMissingIngredients,
        smartMatchedIngredients,
        smartMissingIngredients,
        strictMatchCount: strictMatchedIngredients.length,
        strictMissingCount: strictMissingIngredients.length,
        smartMatchCount: smartMatchedIngredients.length,
        smartMissingCount: smartMissingIngredients.length,
        totalRecipeIngredients: recipeIngredients.length
    };
}

async function mapWithConcurrency(items, concurrency, mapper) {
    if (items.length === 0) return [];
    const limit = Math.max(1, Math.min(concurrency, items.length));
    const out = new Array(items.length);
    let next = 0;

    const worker = async () => {
        while (true) {
            const i = next++;
            if (i >= items.length) return;
            out[i] = await mapper(items[i], i);
        }
    };

    await Promise.all(Array.from({ length: limit }, () => worker()));
    return out;
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

        const MEAL_DETAIL_CONCURRENCY = 12;

        const detailResults = (
            await mapWithConcurrency(candidateMeals, MEAL_DETAIL_CONCURRENCY, async (meal) => {
                try {
                    const res = await fetch(`/api/meal-details/${meal.idMeal}`);
                    if (!res.ok) {
                        console.warn(`Skipped meal ${meal.idMeal} - status ${res.status}`);
                        return null;
                    }
                    const data = await res.json();
                    return data.meals && data.meals[0] ? data : null;
                } catch (error) {
                    console.error(`Failed to fetch details for meal ID: ${meal.idMeal}`, error);
                    return null;
                }
            })
        ).filter(Boolean);

        if (detailResults.length === 0) {
            results.innerHTML = "<p class='muted'>Could not load recipe details right now. Please try again.</p>";
            return;
        }

        const pantryProfiles = buildPantryProfiles(ingredients);

        const scoredMeals = detailResults.map((data) => {
            const meal = data.meals[0];
            const recipeIngredients = extractIngredients(meal);
            const scored = scoreRecipeAgainstPantry(recipeIngredients, pantryProfiles);
            return { meal, ...scored };
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