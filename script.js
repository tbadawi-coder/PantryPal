let ingredients = JSON.parse(localStorage.getItem("ingredients")) || [];

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
            ${item}
            <span class="delete-btn" onclick="deleteIngredient(${index})">✕</span>
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
        results.innerHTML = "<p>No ingredients provided.</p>";
        return;
    }

    try {
        // Make a separate API call for each ingredient
        const fetchPromises = ingredients.map(ingredient =>
            fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${ingredient}`)
                .then(res => res.json())
        );

        const allResults = await Promise.all(fetchPromises);

        // Get meal IDs from each ingredient's results
        const mealIdSets = allResults.map(data =>
            data.meals ? new Set(data.meals.map(m => m.idMeal)) : new Set()
        );

        // Find meals that appear in ALL ingredient results (intersection)
        const commonIds = [...mealIdSets[0]].filter(id =>
            mealIdSets.every(set => set.has(id))
        );

        if (commonIds.length === 0) {
            results.innerHTML = "<p>No recipes found matching all ingredients.</p>";
            return;
        }

        // Get meal details from first result that matched
        const allMeals = allResults[0].meals.filter(m => commonIds.includes(m.idMeal));

        results.innerHTML = "";
        allMeals.forEach(meal => {
    const div = document.createElement("div");
    div.classList.add("recipe-card");
    div.style.cursor = "pointer";
    div.innerHTML = `
        <h3>${meal.strMeal}</h3>
        <img src="${meal.strMealThumb}" width="200">
    `;
    div.addEventListener("click", () => {
        localStorage.setItem("selectedMealId", meal.idMeal);
        window.location.href = "recipe.html";
    });
    results.appendChild(div);
});

    } catch (error) {
        results.innerHTML = "<p>Error fetching recipes.</p>";
        console.error(error);
    }
}
// Run on page load
document.addEventListener("DOMContentLoaded", () => {
    displayIngredients();
    fetchRecipes();
});