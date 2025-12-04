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
        additionalInfo: '',
        metadata: {}
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
            else currentSection = '';
        } else {
            if (currentSection === 'description') {
                recipe.description += (recipe.description ? '\n' : '') + line;
            } else if (currentSection === 'ingredients') {
                if (line.startsWith('- ') || line.startsWith('* ')) {
                    recipe.ingredients.push(line.substring(2).trim());
                } else {
                    // Handle multi-line ingredients or notes
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
            } else if (currentSection === 'additionalInfo') {
                recipe.additionalInfo += line;
            } else if (currentSection === 'social') {
                if (line.startsWith('- ') || line.startsWith('* ')) {
                    recipe.social.push(line.substring(2).trim());
                } else {
                    recipe.social.push(line);
                }
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

    if (recipe.additionalInfo) {
        markdown += `## Additional Information\n${recipe.additionalInfo}\n`;
    }

    return markdown;
}
