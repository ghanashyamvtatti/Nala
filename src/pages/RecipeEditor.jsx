import React, { useState, useEffect } from 'react';
import { createPullRequest } from '../lib/github';
import { recipeToMarkdown } from '../lib/parser';
import AuthModal from '../components/AuthModal';
import { Plus, Trash2, Save, ArrowLeft, Link as LinkIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchRecipe } from '../lib/github';
import { parseRecipe } from '../lib/parser';
import { calculateNutrition } from '../lib/nutrition';
import { Sparkles, Calculator, Info, Wand2 } from 'lucide-react';
import { parsePlainText } from '../lib/parseutils';
import SmartPasteModal from '../components/SmartPasteModal';


export default function RecipeEditor() {
    const [recipe, setRecipe] = useState({
        title: '',
        description: '',
        ingredients: [],
        steps: [],
        variations: [],
        social: [],
        additionalInfo: '',
        metadata: {
            prepTime: '',
            servings: ''
        },
        nutrition: {
            calories: '',
            protein: '',
            carbs: '',
            fat: ''
        }
    });

    const [searchParams] = useSearchParams();
    const editFilename = searchParams.get('filename');

    useEffect(() => {
        if (editFilename) {
            async function loadRecipe() {
                try {
                    const data = await fetchRecipe(editFilename);
                    const parsed = parseRecipe(data.content);
                    setRecipe(parsed);
                } catch (error) {
                    console.error("Failed to load recipe for editing:", error);
                    setStatus({ type: 'error', message: 'Failed to load recipe for editing.' });
                }
            }
            loadRecipe();
        }
    }, [editFilename]);

    const [showAuthModal, setShowAuthModal] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [showSmartPaste, setShowSmartPaste] = useState(false);


    // Helper for array fields (ingredients, steps, variations, social)
    const [newItem, setNewItem] = useState({
        ingredients: '',
        steps: '',
        variations: '',
        social: ''
    });

    const handleAddItem = (field) => {
        if (!newItem[field].trim()) return;
        setRecipe(prev => ({
            ...prev,
            [field]: [...prev[field], newItem[field]]
        }));
        setNewItem(prev => ({ ...prev, [field]: '' }));
    };

    const handleRemoveItem = (field, index) => {
        setRecipe(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (token) => {
        setIsSubmitting(true);
        setStatus({ type: 'info', message: 'Creating Pull Request...' });

        try {
            const markdown = recipeToMarkdown(recipe);
            // Create a filename from title (slugify) if new, or use existing
            let filename = editFilename;
            if (!filename) {
                filename = recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.md';
            }

            const prUrl = await createPullRequest({ title: recipe.title, markdown }, filename, token);

            setStatus({
                type: 'success',
                message: `Success! Pull Request created: ${prUrl}`
            });

            if (!editFilename) {
                // Reset form only if creating new
                setRecipe({
                    title: '',
                    description: '',
                    ingredients: [],
                    steps: [],
                    variations: [],
                    social: [],
                    additionalInfo: '',
                    metadata: { prepTime: '', servings: '' },
                    nutrition: { calories: '', protein: '', carbs: '', fat: '' }
                });
            }
        } catch (error) {
            console.error(error);
            setStatus({
                type: 'error',
                message: `Error: ${error.message}. Make sure your token has 'repo' scope.`
            });
            if (error.status === 401) {
                setShowAuthModal(true); // Re-prompt if auth fails
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCalculateNutrition = async () => {
        if (recipe.ingredients.length === 0) {
            setStatus({ type: 'error', message: 'Please add ingredients first!' });
            return;
        }

        let apiKey = localStorage.getItem('usda_api_key');
        if (!apiKey) {
            apiKey = prompt("Please enter your USDA FoodData Central API Key (get one for free at api.data.gov):");
            if (!apiKey) return;
            localStorage.setItem('usda_api_key', apiKey);
        }

        setIsCalculating(true);
        setStatus({ type: 'info', message: 'Calculating nutrition facts...' });

        try {
            const nutrition = await calculateNutrition(recipe.ingredients, apiKey);
            setRecipe(prev => ({
                ...prev,
                nutrition: {
                    ...prev.nutrition,
                    ...nutrition
                }
            }));
            setStatus({ type: 'success', message: 'Nutrition facts calculated successfully!' });
        } catch (error) {
            console.error(error);
            if (error.message === "Invalid API Key") {
                localStorage.removeItem('usda_api_key');
                setStatus({ type: 'error', message: 'Invalid API Key. Please try again.' });
            } else {
                setStatus({ type: 'error', message: `Calculation failed: ${error.message}` });
            }
        } finally {
            setIsCalculating(false);
        }
    };

    const handleSmartPaste = (text) => {
        const parsed = parsePlainText(text);
        if (parsed) {
            setRecipe(prev => ({
                ...prev,
                title: parsed.title || prev.title,
                description: parsed.description || prev.description,
                ingredients: [...prev.ingredients, ...parsed.ingredients],
                steps: [...prev.steps, ...parsed.steps],
                additionalInfo: (prev.additionalInfo ? prev.additionalInfo + '\n' : '') + parsed.additionalInfo,
                metadata: {
                    prepTime: parsed.metadata.prepTime || prev.metadata.prepTime,
                    servings: parsed.metadata.servings || prev.metadata.servings
                },
                nutrition: {
                    calories: parsed.nutrition.calories || prev.nutrition.calories,
                    protein: parsed.nutrition.protein || prev.nutrition.protein,
                    carbs: parsed.nutrition.carbs || prev.nutrition.carbs,
                    fat: parsed.nutrition.fat || prev.nutrition.fat
                }
            }));
            setStatus({ type: 'success', message: 'Recipe parsed successfully! Review the fields below.' });
        } else {
            setStatus({ type: 'error', message: 'Could not parse recipe text.' });
        }
    };



    return (
        <div className="max-w-3xl mx-auto animate-fade-in">
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Recipes
            </Link>

            <div className="bg-card rounded-2xl shadow-sm border border-border p-8 md:p-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <h1 className="text-3xl font-serif font-bold text-foreground">{editFilename ? 'Edit Recipe' : 'New Recipe'}</h1>
                    {!editFilename && (
                        <button
                            onClick={() => setShowSmartPaste(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors font-medium text-sm"
                        >
                            <Wand2 className="w-4 h-4" />
                            Smart Paste
                        </button>
                    )}
                </div>

                {status.message && (
                    <div className={`p-4 rounded-lg mb-8 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                        status.type === 'error' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                            'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                        {status.message}
                        {status.type === 'success' && status.message.includes('Pull Request') && (
                            <a href={status.message.split(': ')[1]} target="_blank" rel="noopener noreferrer" className="ml-2 underline font-medium">View PR</a>
                        )}
                    </div>
                )}

                <div className="space-y-8">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-serif font-bold">Basic Information</h2>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Recipe Title</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                                value={recipe.title}
                                onChange={e => setRecipe({ ...recipe, title: e.target.value })}
                                placeholder="e.g. Grandma's Apple Pie"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
                            <textarea
                                className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                                rows="3"
                                value={recipe.description}
                                onChange={e => setRecipe({ ...recipe, description: e.target.value })}
                                placeholder="A brief description of the dish..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Prep Time</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                                    value={recipe.metadata.prepTime}
                                    onChange={e => setRecipe({ ...recipe, metadata: { ...recipe.metadata, prepTime: e.target.value } })}
                                    placeholder="e.g. 30m"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Servings</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                                    value={recipe.metadata.servings}
                                    onChange={e => setRecipe({ ...recipe, metadata: { ...recipe.metadata, servings: e.target.value } })}
                                    placeholder="e.g. 4"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Nutrition Info */}
                    {/* Nutrition Info */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-serif font-bold">Nutrition Information</h2>
                            <button
                                onClick={handleCalculateNutrition}
                                disabled={isCalculating || recipe.ingredients.length === 0}
                                className="text-sm px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Requires free USDA API Key"
                            >
                                {isCalculating ? (
                                    <span className="animate-spin">⏳</span>
                                ) : (
                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                )}
                                Auto-Calculate
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Calories</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                                    value={recipe.nutrition?.calories || ''}
                                    onChange={e => setRecipe({ ...recipe, nutrition: { ...recipe.nutrition, calories: e.target.value } })}
                                    placeholder="e.g. 350"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Protein</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                                    value={recipe.nutrition?.protein || ''}
                                    onChange={e => setRecipe({ ...recipe, nutrition: { ...recipe.nutrition, protein: e.target.value } })}
                                    placeholder="e.g. 20g"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Carbs</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                                    value={recipe.nutrition?.carbs || ''}
                                    onChange={e => setRecipe({ ...recipe, nutrition: { ...recipe.nutrition, carbs: e.target.value } })}
                                    placeholder="e.g. 45g"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Fat</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                                    value={recipe.nutrition?.fat || ''}
                                    onChange={e => setRecipe({ ...recipe, nutrition: { ...recipe.nutrition, fat: e.target.value } })}
                                    placeholder="e.g. 12g"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Ingredients */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-serif font-bold">Ingredients</h2>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 px-4 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                                value={newItem.ingredients}
                                onChange={e => setNewItem({ ...newItem, ingredients: e.target.value })}
                                onKeyPress={e => e.key === 'Enter' && handleAddItem('ingredients')}
                                placeholder="Add an ingredient..."
                            />
                            <button
                                onClick={() => handleAddItem('ingredients')}
                                className="p-2 bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                        <ul className="space-y-2">
                            {recipe.ingredients.map((item, index) => (
                                <li key={index} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg group">
                                    <span>{item}</span>
                                    <button onClick={() => handleRemoveItem('ingredients', index)} className="text-destructive hover:text-destructive/80 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Steps */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-serif font-bold">Instructions</h2>
                            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">Markdown Supported</span>
                        </div>

                        {/* Preview Section for Steps */}
                        {recipe.steps.length > 0 && (
                            <div className="mb-4 p-4 border border-border rounded-lg bg-card/50">
                                <h3 className="text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wider">Preview</h3>
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <ol>
                                        {recipe.steps.map((step, index) => (
                                            <li key={index} className="text-foreground">{step}</li>
                                        ))}
                                    </ol>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <textarea
                                className="flex-1 px-4 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                                rows="2"
                                value={newItem.steps}
                                onChange={e => setNewItem({ ...newItem, steps: e.target.value })}
                                onKeyPress={e => e.key === 'Enter' && !e.shiftKey && handleAddItem('steps')}
                                placeholder="Add a step (Markdown supported)..."
                            />
                            <button
                                onClick={() => handleAddItem('steps')}
                                className="p-2 bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors h-fit"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                        <ol className="space-y-2">
                            {recipe.steps.map((item, index) => (
                                <li key={index} className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg group">
                                    <span className="font-bold text-primary mt-0.5">{index + 1}.</span>
                                    <span className="flex-1">{item}</span>
                                    <button onClick={() => handleRemoveItem('steps', index)} className="text-destructive hover:text-destructive/80 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ol>
                    </div>

                    {/* Social Links */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-serif font-bold">Social Links</h2>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 px-4 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                                value={newItem.social}
                                onChange={e => setNewItem({ ...newItem, social: e.target.value })}
                                onKeyPress={e => e.key === 'Enter' && handleAddItem('social')}
                                placeholder="Add Instagram/TikTok URL..."
                            />
                            <button
                                onClick={() => handleAddItem('social')}
                                className="p-2 bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                        <ul className="space-y-2">
                            {recipe.social.map((item, index) => (
                                <li key={index} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg group">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <LinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        <span className="truncate text-sm">{item}</span>
                                    </div>
                                    <button onClick={() => handleRemoveItem('social', index)} className="text-destructive hover:text-destructive/80 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Additional Info */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-serif font-bold">Additional Information</h2>
                            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">Markdown Supported</span>
                        </div>

                        {/* Preview Section for Additional Info */}
                        {recipe.additionalInfo && (
                            <div className="mb-4 p-4 border border-border rounded-lg bg-card/50">
                                <h3 className="text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wider">Preview</h3>
                                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                                    {recipe.additionalInfo}
                                </div>
                            </div>
                        )}

                        <textarea
                            className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                            rows="4"
                            value={recipe.additionalInfo}
                            onChange={e => setRecipe({ ...recipe, additionalInfo: e.target.value })}
                            placeholder="Any extra tips, serving suggestions, or notes (Markdown supported)..."
                        />
                    </div>

                    <button
                        onClick={() => setShowAuthModal(true)}
                        disabled={isSubmitting || !recipe.title}
                        className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>Creating PR...</>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                {editFilename ? 'Update Recipe' : 'Create Pull Request'}
                            </>
                        )}
                    </button>
                </div>
            </div>

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onSubmit={handleSubmit}
            />

            <SmartPasteModal
                isOpen={showSmartPaste}
                onClose={() => setShowSmartPaste(false)}
                onImport={handleSmartPaste}
            />
        </div>
    );
}
