export function parseRecipe(markdown) {
    if (!markdown) return null;

    const lines = markdown.split('\n');
    const recipe = {
        title: '',
        description: '',
        ingredients: [],
        steps: [],
        variations: [],
        social: [],
        sources: [],
        tags: [],
        author: '',
        additionalInfo: '',

        metadata: {},
        nutrition: {}
    };

    let currentSection = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.startsWith('# ')) {
            recipe.title = line.replace('# ', '').trim();
        } else if (line.startsWith('## ')) {
            const sectionName = line.replace('## ', '').trim().toLowerCase();
            if (sectionName.includes('description')) currentSection = 'description';
            else if (sectionName.includes('ingredients')) currentSection = 'ingredients';
            else if (sectionName.includes('steps')) currentSection = 'steps';
            else if (sectionName.includes('variations')) currentSection = 'variations';
            else if (sectionName.includes('additional')) currentSection = 'additionalInfo';
            else if (sectionName.includes('social')) currentSection = 'social';
            else if (sectionName.includes('sources')) currentSection = 'sources';
            else if (sectionName.includes('metadata')) currentSection = 'metadata';
            else if (sectionName.includes('nutrition')) currentSection = 'nutrition';
            else currentSection = '';
        } else {
            if (currentSection === 'description') {
                recipe.description += (recipe.description ? '\n' : '') + line;
            } else if (currentSection === 'metadata') {
                const lowerLine = line.toLowerCase();
                if (lowerLine.startsWith('prep time:')) {
                    recipe.metadata.prepTime = line.substring(10).trim();
                } else if (lowerLine.startsWith('servings:')) {
                    recipe.metadata.servings = line.substring(9).trim();
                } else if (lowerLine.startsWith('author:')) {
                    recipe.author = line.substring(7).trim();
                } else if (lowerLine.startsWith('tags:')) {
                    const tagString = line.substring(5).trim();
                    recipe.tags = tagString.split(',').map(t => t.trim()).filter(Boolean);
                } else if (lowerLine.startsWith('variation of:')) {
                    recipe.metadata.variationOf = line.substring(13).trim();
                }
            } else if (currentSection === 'ingredients') {
                if (line.startsWith('- ') || line.startsWith('* ')) {
                    recipe.ingredients.push(line.substring(2).trim());
                } else {
                    recipe.ingredients.push(line);
                }
            } else if (currentSection === 'steps') {
                if (line.match(/^\d+\./)) {
                    recipe.steps.push(line.replace(/^\d+\.\s*/, '').trim());
                } else if (line.startsWith('- ') || line.startsWith('* ')) {
                    recipe.steps.push(line.substring(2).trim());
                } else {
                    recipe.steps.push(line);
                }
            } else if (currentSection === 'variations') {
                if (line.startsWith('- ') || line.startsWith('* ')) {
                    recipe.variations.push(line.substring(2).trim());
                } else {
                    recipe.variations.push(line);
                }
            } else if (currentSection === 'social') {
                if (line.startsWith('- ') || line.startsWith('* ')) {
                    recipe.social.push(line.substring(2).trim());
                } else {
                    recipe.social.push(line);
                }
            } else if (currentSection === 'sources') {
                let sourceLine = line;
                if (sourceLine.startsWith('- ') || sourceLine.startsWith('* ')) {
                    sourceLine = sourceLine.substring(2).trim();
                }
                // Try to parse markdown link [Title](url)
                const markdownLinkRegex = /^\[([^\]]+)\]\(([^)]+)\)/;
                const match = sourceLine.match(markdownLinkRegex);
                if (match) {
                    recipe.sources.push({ title: match[1], url: match[2] });
                } else {
                    // Assume it's just a raw URL if no proper formatting
                    if (sourceLine.startsWith('http')) {
                        recipe.sources.push({ title: new URL(sourceLine).hostname, url: sourceLine });
                    }
                }
            } else if (currentSection === 'additionalInfo') {
                recipe.additionalInfo += line;
            } else if (currentSection === 'nutrition') {
                const lowerLine = line.toLowerCase();
                if (lowerLine.startsWith('calories:')) recipe.nutrition.calories = line.substring(9).trim();
                else if (lowerLine.startsWith('protein:')) recipe.nutrition.protein = line.substring(8).trim();
                else if (lowerLine.startsWith('carbs:')) recipe.nutrition.carbs = line.substring(6).trim();
                else if (lowerLine.startsWith('fat:')) recipe.nutrition.fat = line.substring(4).trim();
            }
        }
    }

    return recipe;
}

export function recipeToMarkdown(recipe) {
    let markdown = `# ${recipe.title}\n\n`;

    if (recipe.description) {
        markdown += `## Description\n${recipe.description}\n\n`;
    }

    if (recipe.ingredients && recipe.ingredients.length > 0) {
        markdown += `## Ingredients\n`;
        recipe.ingredients.forEach(ing => {
            markdown += `- ${ing}\n`;
        });
        markdown += `\n`;
    }

    if (recipe.steps && recipe.steps.length > 0) {
        markdown += `## Steps\n`;
        recipe.steps.forEach((step, index) => {
            markdown += `${index + 1}. ${step}\n`;
        });
        markdown += `\n`;
    }

    if (recipe.variations && recipe.variations.length > 0) {
        markdown += `## Variations\n`;
        recipe.variations.forEach(variation => {
            markdown += `- ${variation}\n`;
        });
        markdown += `\n`;
    }

    if (recipe.social && recipe.social.length > 0) {
        markdown += `## Social\n`;
        recipe.social.forEach(link => {
            markdown += `- ${link}\n`;
        });
        markdown += `\n`;
    }

    if (recipe.sources && recipe.sources.length > 0) {
        markdown += `## Sources\n`;
        recipe.sources.forEach(source => {
            if (source.title && source.url) {
                markdown += `- [${source.title}](${source.url})\n`;
            } else if (source.url) {
                markdown += `- ${source.url}\n`;
            }
        });
        markdown += `\n`;
    }

    if (recipe.additionalInfo) {
        markdown += `## Additional Information\n${recipe.additionalInfo}\n`;
    }

    const hasMetadata = recipe.metadata.prepTime || recipe.metadata.servings || recipe.author || (recipe.tags && recipe.tags.length > 0);
    if (hasMetadata) {
        markdown += `\n## Metadata\n`;
        if (recipe.metadata.prepTime) markdown += `Prep Time: ${recipe.metadata.prepTime}\n`;
        if (recipe.metadata.servings) markdown += `Servings: ${recipe.metadata.servings}\n`;
        if (recipe.author) markdown += `Author: ${recipe.author}\n`;
        if (recipe.tags && recipe.tags.length > 0) markdown += `Tags: ${recipe.tags.join(', ')}\n`;
        if (recipe.metadata.variationOf) markdown += `Variation of: ${recipe.metadata.variationOf}\n`;
    }

    if (recipe.nutrition && Object.keys(recipe.nutrition).length > 0) {
        markdown += `\n## Nutrition\n`;
        if (recipe.nutrition.calories) markdown += `Calories: ${recipe.nutrition.calories}\n`;
        if (recipe.nutrition.protein) markdown += `Protein: ${recipe.nutrition.protein}\n`;
        if (recipe.nutrition.carbs) markdown += `Carbs: ${recipe.nutrition.carbs}\n`;
        if (recipe.nutrition.fat) markdown += `Fat: ${recipe.nutrition.fat}\n`;
    }

    return markdown;
}
