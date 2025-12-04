import React, { useState, useEffect } from 'react';
import { fetchRecipes } from '../lib/github';
import { parseRecipe } from '../lib/parser';
import RecipeCard from '../components/RecipeCard';
import { Loader2, AlertCircle } from 'lucide-react';

export default function Home() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadRecipes() {
      try {
        const rawData = await fetchRecipes();
        const parsedRecipes = rawData.map(item => {
          const parsed = parseRecipe(item.content);
          return {
            ...parsed,
            filename: item.filename,
            path: item.path,
            sha: item.sha
          };
        });
        setRecipes(parsedRecipes);
      } catch (err) {
        console.error(err);
        setError('Failed to load recipes. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    loadRecipes();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading recipes...</p>
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

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-foreground">
          Nala
        </h1>
        <p className="text-lg text-muted-foreground">
          Nala is a open source repository for gathering and experimenting with food recipes
        </p>
        <div className="text-sm text-muted-foreground/80 bg-secondary/50 p-4 rounded-lg inline-block text-left">
          <p className="font-semibold mb-2 text-center">Purpose</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Create, track and share recipes easily</li>
            <li>Easily experiment with recipes, tracking results of variations and versioning them</li>
            <li>Allow others to contribute and propose changes to your recipe</li>
          </ul>
        </div>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">No recipes found. Be the first to add one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.filename} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
