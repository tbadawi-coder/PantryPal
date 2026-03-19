let ingredients = [];

function addIngredient() {
    const input = document.getElementById("ingredientInput");
    const value = input.value.trim();

    if (value !== "") {
        ingredients.push(value);

        const li = document.createElement("li");
        li.textContent = value;
        document.getElementById("ingredientList").appendChild(li);

        input.value = "";
    }
}

function findRecipes() {
    const results = document.getElementById("recipeResults");

    if (ingredients.length === 0) {
        results.innerHTML = "<p>Please add ingredients first.</p>";
        return;
    }

    results.innerHTML = `
        <p>Sample Recipe:</p>
        <ul>
            <li>Ingredient Match: ${ingredients.join(", ")}</li>
            <li>Recipe: Pasta with your ingredients 🍝</li>
        </ul>
    `;
}