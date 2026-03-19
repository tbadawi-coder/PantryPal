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
    ingredients.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
    });
}

// Go to results page
function goToResults() {
    window.location.href = "results.html";
}

// Fetch recipes from MealDB
async function fetchRecipes() {
    const results = document.getElementById("recipeResults");
    if (!results) return;

    if (ingredients.length === 0) {
        results.innerHTML = "<p>No ingredients provided.</p>";
        return;
    }

    let query = ingredients[0]; // MealDB supports one ingredient at a time

    try {
        let response = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${query}`);
        let data = await response.json();

        if (!data.meals) {
            results.innerHTML = "<p>No recipes found.</p>";
            return;
        }

        results.innerHTML = "";

        data.meals.forEach(meal => {
            const div = document.createElement("div");
            div.classList.add("recipe-card");

            div.innerHTML = `
                <h3>${meal.strMeal}</h3>
                <img src="${meal.strMealThumb}" width="200">
            `;

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