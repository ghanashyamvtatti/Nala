import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchRecipe } from '../lib/github';
import { parseRecipe } from '../lib/parser';
import SocialEmbed from '../components/SocialEmbed';
import ReactMarkdown from 'react-markdown';
import { Clock, Users, ArrowLeft, Loader2, AlertCircle, ChefHat } from 'lucide-react';

export default function RecipeView() {
    const { filename } = useParams();
    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function loadRecipe() {
            try {
                const data = await fetchRecipe(decodeURIComponent(filename));
                const parsed = parseRecipe(data.content);
                setRecipe(parsed);
            } catch (err) {
                console.error(err);
                setError('Failed to load recipe.');
            } finally {
                setLoading(false);
            }
        }
        loadRecipe();
    }, [filename]);

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

    return (
        <div className="max-w-3xl mx-auto animate-fade-in">
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Recipes
            </Link>

            <article className="prose prose-slate dark:prose-invert max-w-none">
                <header className="mb-12 not-prose">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-foreground mb-6">
                        {recipe.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {recipe.metadata?.prepTime && (
                            <div className="flex items-center gap-1.5 bg-secondary px-3 py-1 rounded-full">
                                <Clock className="w-4 h-4" />
                                <span>{recipe.metadata.prepTime}</span>
                            </div>
                        )}
                        {recipe.metadata?.servings && (
                            <div className="flex items-center gap-1.5 bg-secondary px-3 py-1 rounded-full">
                                <Users className="w-4 h-4" />
                                <span>{recipe.metadata.servings} servings</span>
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
                            <h2 className="text-2xl font-serif font-bold mb-6 flex items-center gap-2">
                                <ChefHat className="w-6 h-6 text-primary" />
                                Ingredients
                            </h2>
                            <ul className="space-y-3 not-prose">
                                {recipe.ingredients.map((ingredient, index) => (
                                    <li key={index} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                                        <span className="text-foreground">{ingredient}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>

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
