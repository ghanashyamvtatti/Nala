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
        'piece', 'pieces', 'slice', 'slices', 'cloves', 'clove', 'pinch', 'can', 'cans', 'package', 'packages'
    ];

    let unit = 'gram'; // Default fallback 

    const words = remainder.split(' ');
    if (words.length > 0 && units.includes(words[0].toLowerCase().replace('.', ''))) {
        unit = words[0].toLowerCase().replace('.', '');
        remainder = words.slice(1).join(' ');
    } else {
        unit = 'whole'; // Treat as quantity count
    }

    // Clean up remainder (remove "of", "large", "small" maybe?)
    // For "1 large onion", remainder is "large onion".
    // USDA search works better with just "onion" sometimes, but "large onion" helps with portion if available.
    // However, "large" as a keyword often matches "Large Eggs".
    // Let's try to strip common size adjectives for the *search query* but keep them for context if needed?
    // For now, let's strictly remove "of".
    if (remainder.toLowerCase().startsWith('of ')) {
        remainder = remainder.substring(3).trim();
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
        'cup': 240, 'cups': 240, 'c': 240,
        'tbsp': 15, 'tbs': 15, 'tablespoon': 15, 'tablespoons': 15,
        'tsp': 5, 'teaspoon': 5, 'teaspoons': 5,
        'oz': 28.35, 'ounce': 28.35, 'ounces': 28.35,
        'lb': 453.59, 'lbs': 453.59, 'pound': 453.59, 'pounds': 453.59,
        'g': 1, 'gram': 1, 'grams': 1,
        'kg': 1000, 'kilogram': 1000, 'kilograms': 1000,
        'ml': 1, 'milliliter': 1, 'milliliters': 1,
        'l': 1000, 'liter': 1000, 'liters': 1000,
        'clove': 5, 'cloves': 5, // garlic clove approx 5g
        'slice': 25, 'slices': 25, // cheese/bread slice approx 25-30g
        'pinch': 0.5, // approx
        'can': 400, 'cans': 400, // standard can approx 400g
        'whole': 100 // Fallback for "1 onion" etc. - imprecise but necessary without specific density data
    };

    const factor = unitMap[unit] || 0;
    if (factor === 0) return qty * 100;

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

        // Clean query for better matching
        // Remove size adjectives that confuse search (e.g. "large onion" -> "Eggs, Large")
        let query = parsed.food.replace(/\b(large|medium|small|chopped|diced|minced|sliced)\b/gi, '').trim();
        // If query becomes empty, revert
        if (!query) query = parsed.food;

        // Search USDA - Fetch more results to filter locally
        const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query)}&dataType=Foundation,SR Legacy&pageSize=25`;

        try {
            const searchRes = await fetch(searchUrl);
            if (!searchRes.ok) {
                if (searchRes.status === 403 || searchRes.status === 401) throw new Error("Invalid API Key");
                throw new Error(`API Error: ${searchRes.statusText}`);
            }
            const searchData = await searchRes.json();

            if (searchData.foods && searchData.foods.length > 0) {
                // Best match logic:
                // 1. Prefer exact match of description
                // 2. Prefer shorter descriptions (less likely to be "soup, tomato, canned, concentrate")
                // 3. Fallback to first

                // Best match logic with scoring
                let bestMatch = searchData.foods[0];
                let maxScore = -1000;

                const lowerQuery = query.toLowerCase();

                searchData.foods.forEach(food => {
                    let score = 0;
                    const desc = food.description.toLowerCase();

                    // 1. Exact start match
                    if (desc === lowerQuery) score += 50;
                    else if (desc.startsWith(lowerQuery + ',')) score += 30; // "Rice, white..."
                    else if (desc.startsWith(lowerQuery)) score += 20;
                    else if (desc.includes(lowerQuery)) score += 10;

                    // 2. Prefer raw/fresh
                    if (desc.includes('raw') && !lowerQuery.includes('cooked')) score += 5;
                    if (desc.includes('fresh')) score += 5;

                    // 3. Penalize processed/irrelevant if not in query
                    const penalties = ['cracker', 'chip', 'bread', 'soup', 'canned', 'sauce', 'mix', 'beverage', 'snack', 'candy', 'babyfood', 'baby food', 'formula'];
                    penalties.forEach(bad => {
                        if (desc.includes(bad) && !lowerQuery.includes(bad)) score -= 20;
                    });

                    // 4. Penalize branded foods if we want generic (Foundation/SR Legacy usually good, but just in case)
                    if (food.dataType === 'Branded') score -= 5;

                    // 5. Prefer "Foundation" or "SR Legacy"
                    if (food.dataType === 'Foundation' || food.dataType === 'SR Legacy') score += 10;

                    if (score > maxScore) {
                        maxScore = score;
                        bestMatch = food;
                    }
                });

                const food = bestMatch;

                const grams = convertToGrams(parsed.quantity, parsed.unit);
                const ratio = grams / 100;

                const getNutrient = (namePatterns) => {
                    const nutrient = food.foodNutrients.find(n => {
                        const name = n.nutrientName.toLowerCase();
                        return namePatterns.some(p => name.includes(p));
                    });
                    return nutrient ? nutrient.value : 0;
                };

                const calories = getNutrient(['energy']);
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
