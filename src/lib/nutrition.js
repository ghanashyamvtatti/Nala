/**
 * Parses an ingredient string to extract quantity, unit, and food name.
 * e.g., "1 cup rice" -> { quantity: 1, unit: 'cup', food: 'rice' }
 */
function parseIngredient(text) {
    if (!text) return null;

    // Reordered regex to match fractions properly (e.g. "1/2" before "1")
    const quantityRegex = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.\d+|\d+)\s*/;
    const match = text.trim().match(quantityRegex);

    let quantity = 1; // Default
    let remainder = text.trim();

    if (match) {
        const qtyStr = match[1];
        if (qtyStr.includes(' ') && qtyStr.includes('/')) {
            // Mixed fraction: "1 1/2"
            const parts = qtyStr.split(' ');
            const [num, den] = parts[1].split('/').map(Number);
            quantity = parseFloat(parts[0]) + (num / den);
        } else if (qtyStr.includes('/')) {
            // Fraction: "1/2"
            const [num, den] = qtyStr.split('/').map(Number);
            quantity = num / den;
        } else {
            quantity = parseFloat(qtyStr);
        }
        remainder = text.substring(match[0].length).trim();
    }

    // Common units
    const units = [
        'cup', 'cups', 'c',
        'tablespoon', 'tablespoons', 'tbsp', 'tbs',
        'teaspoon', 'teaspoons', 'tsp',
        'ounce', 'ounces', 'oz',
        'pound', 'pounds', 'lb', 'lbs',
        'gram', 'grams', 'g',
        'kilogram', 'kilograms', 'kg',
        'liter', 'liters', 'l',
        'milliliter', 'milliliters', 'ml',
        'piece', 'pieces', 'slice', 'slices', 'cloves', 'clove', 'pinch'
    ];

    let unit = 'gram'; // Default fallback if no unit found (often means 'whole' or 'piece' but we need mass)
    // Actually, if no unit is found, we might assume it's a "whole" item, handled by USDA portions if available.
    // For now, let's try to find a unit.

    const words = remainder.split(' ');
    if (words.length > 0 && units.includes(words[0].toLowerCase().replace('.', ''))) {
        unit = words[0].toLowerCase().replace('.', '');
        remainder = words.slice(1).join(' ');
    } else {
        unit = 'whole'; // Treat as quantity count
    }

    return {
        quantity,
        unit,
        food: remainder
    };
}

/**
 * Converts value from input unit to grams
 */
function convertToGrams(qty, unit) {
    const unitMap = {
        'cup': 240, // rough avg for water/liquids, solids vary wildly but this is an estimation
        'cups': 240,
        'c': 240,
        'tbsp': 15,
        'tbs': 15,
        'tablespoon': 15,
        'tablespoons': 15,
        'tsp': 5,
        'teaspoon': 5,
        'teaspoons': 5,
        'oz': 28.35,
        'ounce': 28.35,
        'ounces': 28.35,
        'lb': 453.59,
        'pound': 453.59,
        'pounds': 453.59,
        'g': 1,
        'gram': 1,
        'grams': 1,
        'kg': 1000,
        'kilogram': 1000,
        'kilograms': 1000,
        'ml': 1, // rough estimate 1g=1ml
        'milliliter': 1,
        'l': 1000,
        'liter': 1000,
        'whole': 100 // VERY ROUGH average for a "piece" of something if unknown (e.g. apple is ~180g). 
        // Ideally we use USDA portion data, but that adds complexity. 
        // We'll stick to a default or try to use portions if implemented later.
    };

    const factor = unitMap[unit] || 0;

    // If unit is 'whole' or unknown, we might want to default to 100g or 1 serving
    if (factor === 0) return qty * 100; // Fallback: assume 1 unit = 100g 

    return qty * factor;
}

export async function calculateNutrition(ingredients, apiKey) {
    if (!ingredients || ingredients.length === 0) return null;
    if (!apiKey) throw new Error("API Key is required");

    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    // Process ingredients in parallel
    const promises = ingredients.map(async (line) => {
        const parsed = parseIngredient(line);
        if (!parsed || !parsed.food) return;

        // Search USDA
        const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(parsed.food)}&dataType=Foundation,SR Legacy&pageSize=1`;

        try {
            const searchRes = await fetch(searchUrl);
            if (!searchRes.ok) {
                if (searchRes.status === 403 || searchRes.status === 401) throw new Error("Invalid API Key");
                throw new Error(`API Error: ${searchRes.statusText}`);
            }
            const searchData = await searchRes.json();

            if (searchData.foods && searchData.foods.length > 0) {
                const food = searchData.foods[0];
                const grams = convertToGrams(parsed.quantity, parsed.unit);
                const ratio = grams / 100;

                // Extract nutrients
                // Nutrient IDs: 2047 (Energy Kcal), 203 (Protein), 204 (Fat), 205 (Carbs) 
                // Note: ID might differ in different dataset types, but usually:
                // Energy: 1008 or 2047
                // Protein: 1003
                // Fat: 1004
                // Carbs: 1005
                // The API returns 'nutrientNumber' or 'nutrientId'. Safer to check name or use standard IDs.

                const getNutrient = (namePatterns) => {
                    const nutrient = food.foodNutrients.find(n => {
                        const name = n.nutrientName.toLowerCase();
                        return namePatterns.some(p => name.includes(p));
                    });
                    return nutrient ? nutrient.value : 0;
                };

                const calories = getNutrient(['energy']); // catches Energy (Atwater Factors), Energy (kcal), etc.
                const protein = getNutrient(['protein']);
                const fat = getNutrient(['total lipid', 'fat']);
                const carbs = getNutrient(['carbohydrate']);

                totals.calories += calories * ratio;
                totals.protein += protein * ratio;
                totals.fat += fat * ratio;
                totals.carbs += carbs * ratio;
            }
        } catch (error) {
            console.error(`Failed to fetch/calculate for ${parsed.food}:`, error);
            // Continue with other ingredients
        }
    });

    await Promise.all(promises);

    return {
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein) + 'g',
        carbs: Math.round(totals.carbs) + 'g',
        fat: Math.round(totals.fat) + 'g'
    };
}
