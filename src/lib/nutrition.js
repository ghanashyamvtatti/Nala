export async function calculateNutrition(ingredients, apiKey) {
    if (!ingredients || ingredients.length === 0) return null;
    if (!apiKey) throw new Error("API Key is required");

    // Join ingredients into a single query string
    const query = ingredients.join(' ');

    // CalorieNinjas API endpoint
    const url = 'https://api.calorieninjas.com/v1/nutrition?query=' + encodeURIComponent(query);

    const response = await fetch(url, {
        headers: {
            'X-Api-Key': apiKey
        }
    });

    if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
            throw new Error("Invalid API Key");
        }
        throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();

    // Aggregate totals
    const totals = data.items.reduce((acc, item) => {
        return {
            calories: acc.calories + item.calories,
            protein: acc.protein + item.protein_g,
            carbs: acc.carbs + item.carbohydrates_total_g,
            fat: acc.fat + item.fat_total_g
        };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    // Round values
    return {
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein) + 'g',
        carbs: Math.round(totals.carbs) + 'g',
        fat: Math.round(totals.fat) + 'g'
    };
}
