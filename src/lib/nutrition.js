

import { estimateNutrition } from './webllm';

export async function calculateNutrition(ingredients, progressCallback) {
    if (!ingredients || ingredients.length === 0) return null;

    // We no longer need apiKey, but we might accept a progressCallback
    try {
        const result = await estimateNutrition(ingredients, progressCallback);
        // Ensure we return strings with units or formatted simply as the UI expects strings often
        // The prompt asks for "200" or "10g", so we just pass it through or sanitize if needed.
        return {
            calories: result.calories?.toString() || '',
            protein: result.protein?.toString() || '',
            carbs: result.carbs?.toString() || '',
            fat: result.fat?.toString() || ''
        };
    } catch (error) {
        console.error("Nutrition calculation failed:", error);
        throw error;
    }
}

