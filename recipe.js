const mealId = localStorage.getItem("selectedMealId");

async function fetchRecipeDetail() {
    const detail = document.getElementById("recipeDetail");
    const title = document.getElementById("recipeTitle");

    if (!mealId) {
        detail.innerHTML = "<p>No recipe selected.</p>";
        return;
    }

    try {
        const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`);
        const data = await response.json();
        const meal = data.meals[0];

        title.textContent = meal.strMeal;

        // Collect ingredients
        let ingredientsList = "";
        for (let i = 1; i <= 20; i++) {
            const ingredient = meal[`strIngredient${i}`];
            const measure = meal[`strMeasure${i}`];
            if (ingredient && ingredient.trim() !== "") {
                ingredientsList += `<li>${measure} ${ingredient}</li>`;
            }
        }

        detail.innerHTML = `
            <div class="recipe-detail-card">
                <img src="${meal.strMealThumb}" width="300">
                <h2>Ingredients</h2>
                <ul>${ingredientsList}</ul>
                <h2>Instructions</h2>
                <p>${meal.strInstructions}</p>
            </div>
        `;

    } catch (error) {
        detail.innerHTML = "<p>Error loading recipe.</p>";
        console.error(error);
    }
}

document.addEventListener("DOMContentLoaded", fetchRecipeDetail);