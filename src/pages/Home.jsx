import React, { useState, useEffect } from 'react';
import { fetchRecipes } from '../lib/github';
import { parseRecipe } from '../lib/parser';
import RecipeCard from '../components/RecipeCard';
import { Loader2, AlertCircle, Search, Filter, X } from 'lucide-react';

export default function Home() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState(null);

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

  // Compute unique tags from all recipes
  const allTags = Array.from(new Set(
    recipes.flatMap(recipe => recipe.tags || [])
  )).sort();

  // Filter recipes
  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = (recipe.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (recipe.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag ? (recipe.tags || []).includes(selectedTag) : true;

    // Hide variations from main list to avoid clutter
    const isVariation = !!recipe.metadata?.variationOf;

    return matchesSearch && matchesTag && !isVariation;
  });

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
    <div className="space-y-8 animate-fade-in">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-foreground">
          Nala
        </h1>
        <p className="text-lg text-muted-foreground">
          A home for your culinary experiments.
        </p>
      </div>

      {/* Search and Filter Section */}
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search recipes..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-card shadow-sm focus:ring-2 focus:ring-ring focus:border-transparent outline-none text-lg transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded-full text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Inline Tags Filter */}
          {allTags.length > 0 && (
            <div className="relative group max-w-full md:max-w-xs shrink-0">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar mask-gradient px-1">
                <button
                  onClick={() => setSelectedTag(null)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap shrink-0 border ${selectedTag === null
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-input hover:bg-secondary hover:text-secondary-foreground'
                    }`}
                >
                  All
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap shrink-0 border ${selectedTag === tag
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-input hover:bg-secondary hover:text-secondary-foreground'
                      }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {filteredRecipes.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-muted/30">
          <div className="flex flex-col items-center gap-4">
            <Search className="w-12 h-12 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="text-lg font-medium text-foreground">No recipes found</p>
              <p className="text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
            {(searchQuery || selectedTag) && (
              <button
                onClick={() => { setSearchQuery(''); setSelectedTag(null); }}
                className="text-sm text-primary hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.filename} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
