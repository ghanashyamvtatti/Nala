// import nlp from 'compromise';

export function parsePlainText(text) {
    if (!text) return null;

    // const doc = nlp(text); // Unused for now

    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    const recipe = {
        title: '',
        description: '',
        ingredients: [],
        steps: [],
        variations: [],
        social: [],
        additionalInfo: '',
        metadata: { prepTime: '', servings: '' },
        nutrition: { calories: '', protein: '', carbs: '', fat: '' }
    };

    // Heuristic: First line is often the title
    if (lines.length > 0) {
        recipe.title = lines[0];
    }

    let currentSection = 'description'; // Default start
    // If we grabbed the title from line 0, maybe description starts at line 1?
    // Let's refine: iterate lines and try to guess sections

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lowerLine = line.toLowerCase();

        // Skip the title if we already set it and it's the first line
        if (i === 0 && line === recipe.title) continue;

        // Section Headers Detection
        if (lowerLine.match(/^(ingredients|what you need|shopping list)/)) {
            currentSection = 'ingredients';
            continue;
        } else if (lowerLine.match(/^(instructions|steps|directions|method|how to make)/)) {
            currentSection = 'steps';
            continue;
        } else if (lowerLine.match(/^(notes|tips|additional info)/)) {
            currentSection = 'additionalInfo';
            continue;
        } else if (lowerLine.match(/^(nutrition|nutritional info)/)) {
            currentSection = 'nutrition';
            continue;
        }

        // Content Extraction based on section
        if (currentSection === 'ingredients') {
            // Check if it looks like an ingredient (has numbers?)
            // Simple heuristic for now: just add everything in this section
            recipe.ingredients.push(line.replace(/^[-*•]\s*/, ''));
        } else if (currentSection === 'steps') {
            // Check if it's a step
            recipe.steps.push(line.replace(/^\d+\.\s*/, '').replace(/^[-*•]\s*/, ''));
        } else if (currentSection === 'description') {
            // If it's short metadata, extract it
            if (lowerLine.includes('prep time') || lowerLine.includes('time:')) {
                recipe.metadata.prepTime = line.split(':')[1]?.trim() || line;
            } else if (lowerLine.includes('servings') || lowerLine.includes('yields')) {
                recipe.metadata.servings = line.split(':')[1]?.trim() || line;
            } else {
                recipe.description += (recipe.description ? '\n' : '') + line;
            }
        } else if (currentSection === 'nutrition') {
            // Try to parse basic nutrition if formatted "Calories: 200"
            if (lowerLine.includes('calories')) recipe.nutrition.calories = line.split(':')[1]?.trim();
            if (lowerLine.includes('protein')) recipe.nutrition.protein = line.split(':')[1]?.trim();
            if (lowerLine.includes('carbs')) recipe.nutrition.carbs = line.split(':')[1]?.trim();
            if (lowerLine.includes('fat')) recipe.nutrition.fat = line.split(':')[1]?.trim();
        } else if (currentSection === 'additionalInfo') {
            recipe.additionalInfo += (recipe.additionalInfo ? '\n' : '') + line;
        }
    }

    // Clean up
    if (recipe.ingredients.length === 0 && recipe.steps.length === 0) {
        // Fallback: If we couldn't detect sections, maybe it's just a list of ingredients?
        // Or maybe we treat everything as description?
        // For now, let's leave as is. User can edit.
    }

    return recipe;
}
