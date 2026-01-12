import nlp from 'compromise';

// Common cooking units to identify
const UNITS = [
    'cup', 'cups',
    'tbsp', 'tablespoon', 'tablespoons',
    'tsp', 'teaspoon', 'teaspoons',
    'oz', 'ounce', 'ounces',
    'lb', 'lbs', 'pound', 'pounds',
    'g', 'gram', 'grams',
    'kg', 'kilogram', 'kilograms',
    'ml', 'milliliter', 'milliliters',
    'l', 'liter', 'liters',
    'pinch',
    'dash',
    'handful',
    'clove', 'cloves',
    'can', 'cans',
    'bunch',
    'slice', 'slices',
    'package', 'packages',
    'container', 'containers'
];

export function parseIngredient(text) {
    if (!text) return null;

    // Remove bullet points if present (though parser usually handles this)
    const cleanText = text.replace(/^[-*]\s+/, '').trim();

    // 1. Try to find the quantity first (usually a number at the start)
    // Matches: "1.5", "1/2", "1-1/2", "1 1/2", "1"
    const quantityRegex = /^(\d+[\s-]?\d*\/?\d*|\d*\/\d+)/;
    const qtyMatch = cleanText.match(quantityRegex);

    let quantity = 1; // Default
    let rawQuantity = null;
    let remainder = cleanText;

    if (qtyMatch) {
        rawQuantity = qtyMatch[0].trim();
        quantity = parseQuantity(rawQuantity);
        remainder = cleanText.substring(qtyMatch[0].length).trim();
    } else {
        // No explicit quantity found, assume 1? Or leave as null/text?
        // "Salt to taste" -> quantity might be null or 0.
        // Let's assume quantity is 1 for scaling purposes if not specified, 
        // BUT if it's strictly "Text only" scaling might be weird.
        // Let's mark as unscalable if no number found.
        return {
            original: cleanText,
            quantity: null,
            unit: null,
            item: cleanText,
            scalable: false
        };
    }

    // 2. Try to find the unit in the remainder
    const tokens = remainder.split(/\s+/);
    let unit = null;
    let item = remainder;

    // Check the first word of remainder for unit
    const firstWord = tokens[0] ? tokens[0].toLowerCase().replace(/[.,s]$/, '') : ''; // simple de-plural
    // Handle "cups" -> "cup"

    // Check against known units
    // We iterate broadly to catch "fluid ounce" etc if we wanted, but simple first word check is usually 80% good.
    if (UNITS.includes(firstWord) || UNITS.some(u => u.startsWith(firstWord))) { // sloppy matching
        // refine using exact list
        const potentialUnit = tokens[0].toLowerCase().replace(/[.,]$/, '');
        if (UNITS.includes(potentialUnit) || UNITS.includes(potentialUnit + 's')) {
            unit = tokens[0];
            item = tokens.slice(1).join(' ');
        }
    }

    return {
        original: cleanText,
        quantity: quantity,
        rawQuantity: rawQuantity,
        unit: unit,
        item: item,
        scalable: true
    };
}

function parseQuantity(qStr) {
    if (!qStr) return 0;

    // Handle fractions: "1/2", "1 1/2", "1-1/2"

    // Normalize "1-1/2" to "1 1/2"
    qStr = qStr.replace('-', ' ');

    const parts = qStr.split(' ');
    let total = 0;

    parts.forEach(part => {
        if (part.includes('/')) {
            const [num, den] = part.split('/').map(Number);
            if (den !== 0) total += num / den;
        } else {
            total += parseFloat(part);
        }
    });

    return total || 0;
}

export function formatIngredient(parsed, multiplier = 1) {
    if (!parsed.scalable || parsed.quantity === null) return parsed.original;

    const newQuantity = parsed.quantity * multiplier;

    // Format nicely (decimals to fraction? or just max 2 decimals)
    // Simple approach: round to 2 decimals, remove trailing zeros
    const formattedQty = parseFloat(newQuantity.toFixed(2));

    // Reconstruct
    let result = `${formattedQty}`;
    if (parsed.unit) {
        result += ` ${parsed.unit}`;
    }
    result += ` ${parsed.item}`;

    return result;
}
