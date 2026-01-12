import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchRecipe, fetchRecipes, getRepoDetails } from '../lib/github';
import { parseRecipe } from '../lib/parser';
import { parseIngredient, formatIngredient } from '../lib/ingredient-parser';
import SocialEmbed from '../components/SocialEmbed';
import ReactMarkdown from 'react-markdown';
import { Clock, Users, ArrowLeft, Loader2, AlertCircle, ChefHat, History, Edit, ExternalLink, User, GitBranch, Share2 } from 'lucide-react';

export default function RecipeView() {
    const { filename } = useParams();
    const navigate = useNavigate();
    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [variations, setVariations] = useState([]);

    // Scaling
    const [currentServings, setCurrentServings] = useState(4);
    const [baseServings, setBaseServings] = useState(4);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                // 1. Fetch current recipe
                const data = await fetchRecipe(decodeURIComponent(filename));
                const parsed = parseRecipe(data.content);
                parsed.filename = filename; // helper
                setRecipe(parsed);

                // Set initial servings
                const servings = parseInt(parsed.metadata?.servings) || 4;
                setBaseServings(servings);
                setCurrentServings(servings);

                // 2. Fetch all recipes to find variations (Family)
                const allRaw = await fetchRecipes();
                const allParsed = allRaw.map(r => ({ ...parseRecipe(r.content), filename: r.filename }));

                // Identify Root
                const rootFilename = parsed.metadata?.variationOf || filename;

                // Find Family: Root + Children (those whose variationOf === root)
                const family = allParsed.filter(r =>
                    r.filename === rootFilename ||
                    r.metadata?.variationOf === rootFilename ||
                    (r.filename === parsed.metadata?.variationOf) // Include parent if I am a child
                );

                // Ensure unique items just in case logic overlaps
                const uniqueFamily = Array.from(new Set(family.map(f => f.filename)))
                    .map(fname => family.find(f => f.filename === fname));

                setVariations(uniqueFamily);

            } catch (err) {
                console.error(err);
                setError('Failed to load recipe.');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [filename]);

    const handleServingsChange = (newServings) => {
        if (newServings >= 1) {
            setCurrentServings(newServings);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Loading recipe...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-md mx-auto mt-8 p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
            </div>
        );
    }

    if (!recipe) return null;

    const scaleFactor = baseServings ? (currentServings / baseServings) : 1;

    // Helper to scale nutrition
    const scaleNutrition = (val) => {
        if (!val) return null;
        // Parse "200kcal" or "20g" or "20"
        const match = val.toString().match(/([\d.]+)\s*(\w*)/);
        if (!match) return val;
        const num = parseFloat(match[1]);
        const unit = match[2] || '';
        if (isNaN(num)) return val;
        // Avoid scaling if serving size is 0 or invalid, but here we cover that with baseServings check above
        const scaled = Math.round(num * scaleFactor);
        return `${scaled}${unit}`;
    };

    return (
        <div className="max-w-3xl mx-auto animate-fade-in">
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Recipes
            </Link>

            {/* Header Actions */}
            <div className="flex flex-wrap justify-end gap-2 mb-8 items-center bg-secondary/20 p-2 rounded-xl">
                {/* Variations Dropdown */}
                {variations.length > 1 && (
                    <div className="relative mr-auto flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-muted-foreground" />
                        <select
                            className="appearance-none bg-background text-foreground border border-border rounded-lg pl-3 pr-8 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-w-[150px]"
                            value={filename}
                            onChange={(e) => navigate(`/recipe/${encodeURIComponent(e.target.value)}`)}
                        >
                            {variations.map(v => (
                                <option key={v.filename} value={v.filename}>
                                    {v.title} {v.filename === (recipe.metadata?.variationOf || filename) ? '(Root)' : ''}
                                </option>
                            ))}
                        </select>
                        {/* Custom arrow for select */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 pr-2 pointer-events-none text-muted-foreground">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => navigate(`/new?variationOf=${encodeURIComponent(filename)}`)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-primary/50 text-primary hover:bg-primary/5 transition-colors text-sm font-medium"
                >
                    <Share2 className="w-4 h-4" />
                    New Variation
                </button>

                <button
                    onClick={() => navigate(`/new?filename=${encodeURIComponent(filename)}`)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm font-medium"
                >
                    <Edit className="w-4 h-4" />
                    Edit
                </button>
                <a
                    href={`https://github.com/${getRepoDetails().owner}/${getRepoDetails().repo}/commits/main/public/recipes/${filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-secondary/50 transition-colors text-sm font-medium"
                >
                    <History className="w-4 h-4" />
                    History
                </a>
            </div>

            <article className="prose prose-slate dark:prose-invert max-w-none">
                <header className="mb-12 not-prose">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-foreground mb-4">
                        {recipe.title}
                    </h1>

                    {/* Tags */}
                    {recipe.tags && recipe.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                            {recipe.tags.map((tag, idx) => (
                                <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                        {recipe.metadata?.prepTime && (
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>{recipe.metadata.prepTime}</span>
                            </div>
                        )}
                        {/* Author */}
                        {recipe.author && (
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <span>Submitted by <span className="font-medium text-foreground">{recipe.author}</span></span>
                            </div>
                        )}
                        {recipe.metadata?.variationOf && (
                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                <GitBranch className="w-4 h-4" />
                                <span>Variation of <span className="font-medium italic">{recipe.metadata.variationOf.replace('.md', '').replace(/-/g, ' ')}</span></span>
                            </div>
                        )}
                    </div>
                </header>

                <div className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-sm mb-12 not-prose">
                    <p className="text-lg leading-relaxed text-muted-foreground italic">
                        {recipe.description}
                    </p>
                </div>

                <div className="grid md:grid-cols-[1fr,1.5fr] gap-12">
                    <div className="space-y-8">
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
                                    <ChefHat className="w-6 h-6 text-primary" />
                                    Ingredients
                                </h2>
                            </div>

                            {/* Portion Scaling Control */}
                            <div className="bg-secondary/30 p-4 rounded-xl mb-6 border border-border/50">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-muted-foreground">Servings</span>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleServingsChange(currentServings - 1)}
                                            className="w-8 h-8 rounded-full bg-background shadow-sm border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                                        >
                                            -
                                        </button>
                                        <span className="font-bold w-6 text-center tabular-nums">{currentServings}</span>
                                        <button
                                            onClick={() => handleServingsChange(currentServings + 1)}
                                            className="w-8 h-8 rounded-full bg-background shadow-sm border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                {(baseServings !== currentServings && baseServings) && (
                                    <div className="text-xs text-center text-amber-600 font-medium animate-in fade-in bg-amber-50 rounded py-1">
                                        Scaled from {baseServings} servings
                                    </div>
                                )}
                            </div>

                            <ul className="space-y-3 not-prose">
                                {recipe.ingredients.map((ingredient, index) => {
                                    const parsed = parseIngredient(ingredient);
                                    // If unknown serving size (0/null base), default to no scale
                                    const display = parsed ? formatIngredient(parsed, scaleFactor) : ingredient;

                                    return (
                                        <li key={index} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                                            <span className="text-foreground">{display}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>

                        {/* OLD Variations List (Legacy Support) */}
                        {recipe.variations && recipe.variations.length > 0 && (
                            <section>
                                <h2 className="text-xl font-serif font-bold mb-4">Notes & Alternatives</h2>
                                <ul className="space-y-3">
                                    {recipe.variations.map((variation, index) => (
                                        <li key={index} className="text-sm text-muted-foreground p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-lg">
                                            {variation}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {/* Sources */}
                        {recipe.sources && recipe.sources.length > 0 && (
                            <section>
                                <h2 className="text-xl font-serif font-bold mb-4">Sources</h2>
                                <div className="space-y-3">
                                    {recipe.sources.map((source, index) => (
                                        <a key={index} href={source.url} target="_blank" rel="noopener noreferrer" className="block p-4 border border-border rounded-xl hover:bg-secondary/50 transition-colors group">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium group-hover:text-primary transition-colors">{source.title || 'Source Link'}</span>
                                                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate mt-1 opacity-70">
                                                {source.url}
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </section>
                        )}


                        {recipe.social && recipe.social.length > 0 && (
                            <section>
                                <h2 className="text-xl font-serif font-bold mb-4">Social</h2>
                                <div className="space-y-4">
                                    {recipe.social.map((url, index) => (
                                        <SocialEmbed key={index} url={url} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Nutrition Badges */}
                        {recipe.nutrition && Object.keys(recipe.nutrition).length > 0 && (
                            <section>
                                <h2 className="text-xl font-serif font-bold mb-4">Nutrition</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    {recipe.nutrition.calories && (
                                        <div className="bg-secondary/50 p-3 rounded-lg text-center transition-all">
                                            <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Calories</span>
                                            <span className="font-medium">{scaleNutrition(recipe.nutrition.calories)}</span>
                                        </div>
                                    )}
                                    {recipe.nutrition.protein && (
                                        <div className="bg-secondary/50 p-3 rounded-lg text-center transition-all">
                                            <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Protein</span>
                                            <span className="font-medium">{scaleNutrition(recipe.nutrition.protein)}</span>
                                        </div>
                                    )}
                                    {recipe.nutrition.carbs && (
                                        <div className="bg-secondary/50 p-3 rounded-lg text-center transition-all">
                                            <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Carbs</span>
                                            <span className="font-medium">{scaleNutrition(recipe.nutrition.carbs)}</span>
                                        </div>
                                    )}
                                    {recipe.nutrition.fat && (
                                        <div className="bg-secondary/50 p-3 rounded-lg text-center transition-all">
                                            <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Fat</span>
                                            <span className="font-medium">{scaleNutrition(recipe.nutrition.fat)}</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-muted-foreground text-center mt-2 opacity-60">
                                    Estimated values {baseServings !== currentServings ? `scaled to ${currentServings} servings` : 'per serving'}
                                </p>
                            </section>
                        )}
                    </div>

                    <section>
                        <h2 className="text-2xl font-serif font-bold mb-6">Instructions</h2>
                        <div className="space-y-8">
                            {recipe.steps.map((step, index) => (
                                <div key={index} className="group relative pl-8 border-l-2 border-border hover:border-primary transition-colors">
                                    <span className="absolute -left-[9px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-background ring-2 ring-border group-hover:ring-primary transition-all">
                                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground group-hover:bg-primary transition-colors" />
                                    </span>
                                    <div className="space-y-1">
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Step {index + 1}</span>
                                        <p className="text-foreground leading-relaxed">{step}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {recipe.additionalInfo && (
                    <section className="mt-16 pt-8 border-t border-border">
                        <h2 className="text-2xl font-serif font-bold mb-6">Notes</h2>
                        <div className="prose-sm text-muted-foreground">
                            <ReactMarkdown>{recipe.additionalInfo}</ReactMarkdown>
                        </div>
                    </section>
                )}
            </article>
        </div>
    );
}
