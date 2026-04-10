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

        detail.innerHTML = `
            <div class="recipe-detail-card">
                <img src="${meal.strMealThumb}" alt="${escapeHtml(meal.strMeal || "Recipe")}" loading="lazy">
                <h2>Ingredients</h2>
                <ul>${ingredientsList}</ul>
                <h2>Instructions</h2>
                <p>${escapeHtml(meal.strInstructions || "")}</p>
            </div>
        `;

    } catch (error) {
        detail.innerHTML = "<p class='muted'>Error loading recipe.</p>";
        console.error(error);
    }
}

document.addEventListener("DOMContentLoaded", fetchRecipeDetail);