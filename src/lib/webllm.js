import { CreateMLCEngine } from "@mlc-ai/web-llm";

// Constants
const SELECTED_MODEL = "Llama-3.2-3B-Instruct-q4f16_1-MLC";

let engine = null;

/**
 * Get or create the WebLLM engine singleton.
 * @param {function} progressCallback - Callback for initialization progress updates.
 */
export async function getEngine(progressCallback) {
    if (!engine) {
        progressCallback?.({ text: "Initializing WebLLM Engine...", progress: 0 });
        engine = await CreateMLCEngine(
            SELECTED_MODEL,
            {
                initProgressCallback: (progress) => {
                    progressCallback?.(progress);
                }
            }
        );
    }
    return engine;
}

/**
 * Generate a structured recipe object from plain text using WebLLM.
 * @param {string} text - The plain text recipe.
 * @param {function} progressCallback - Callback for progress updates.
 */
export async function generateRecipe(text, progressCallback) {
    const engine = await getEngine(progressCallback);

    const systemPrompt = `You form JSON only. You are a helpful assistant that parses recipe text into a structured JSON format.
    The JSON structure must match this exactly:
    {
        "title": "Recipe Title",
        "description": "Brief description",
        "ingredients": ["Item 1", "Item 2"],
        "steps": ["Step 1", "Step 2"],
        "additionalInfo": "Extra notes",
        "metadata": { "prepTime": "10m", "servings": "4" },
        "nutrition": { "calories": "200", "protein": "10g", "carbs": "20g", "fat": "5g" }
    }
    If a field is missing, leave it as an empty string or empty array.
    Do not wrap the output in markdown code blocks. Return ONLY the raw JSON string.`;

    const userPrompt = `Parse this recipe text:\n\n${text}`;

    try {
        const response = await engine.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1, // Low temperature for deterministic output
        });

        const jsonString = response.choices[0].message.content;
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("WebLLM Parse Error:", error);
        throw new Error("Failed to parse recipe with AI.");
    }
}

/**
 * Estimate nutrition for a list of ingredients using WebLLM.
 * @param {string[]} ingredients - List of ingredient strings.
 * @param {function} progressCallback - Callback for progress updates.
 */
export async function estimateNutrition(ingredients, progressCallback) {
    const engine = await getEngine(progressCallback);

    const systemPrompt = `You are an expert nutritionist.
    Step 1: Analyze the ingredients one by one. Translate regional names (e.g. "Dhania" -> "Coriander", "Toor Dal" -> "Lentils") and estimate their nutrition values.
    Step 2: Sum up the total calories, protein, carbs (carbohydrates), and fat.
    Step 3: Provide the final total in a JSON block.

    CRITICAL:
    - You MUST estimate. Do not return 0.
    - Output the JSON inside a code block \`\`\`json ... \`\`\`.
    - JSON keys MUST be exactly: "calories", "protein", "carbs", "fat".
    `;

    const userPrompt = `Calculate nutrition for:\n${ingredients.join("\n")}`;

    try {
        const response = await engine.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            // response_format: { type: "json_object" }, // Disable strict JSON mode to allow CoT
            temperature: 0.5,
        });

        const content = response.choices[0].message.content;

        // Extract JSON from code block or raw string
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("No JSON found in response");
        }

        let jsonString = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("WebLLM Nutrition Error:", error);
        throw new Error("Failed to estimate nutrition with AI.");
    }
}
