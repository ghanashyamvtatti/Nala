import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Users, ArrowRight } from 'lucide-react';

export default function RecipeCard({ recipe }) {
  // Extract metadata if available, or use defaults
  const prepTime = recipe.metadata?.prepTime || '30m';
  const servings = recipe.metadata?.servings || '4';

  return (
    <Link
      to={`/recipe/${encodeURIComponent(recipe.filename)}`}
      className="group block h-full"
    >
      <div className="h-full flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/20">
        <div className="p-6 flex-1">
          <h3 className="text-2xl font-serif font-bold leading-tight mb-3 text-foreground group-hover:text-primary transition-colors">
            {recipe.title}
          </h3>
          <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed mb-6">
            {recipe.description}
          </p>

          <div className="flex items-center gap-3 mt-auto">
            <div className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground">
              <Clock className="mr-1 h-3 w-3" />
              {prepTime}
            </div>
            <div className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground">
              <Users className="mr-1 h-3 w-3" />
              {servings}
            </div>
          </div>
        </div>

        <div className="p-6 pt-0 flex justify-end">
          <span className="text-sm font-medium text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            View Recipe <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
