import { Octokit } from "octokit";

let octokit = new Octokit();
let owner = '';
let repo = '';

export function initializeGitHub(token, repoOwner, repoName) {
    octokit = new Octokit({ auth: token });
    owner = repoOwner;
    repo = repoName;
}

export function getRepoDetails() {
    return { owner, repo };
}

function ensureRepoDetails() {
    if (owner && repo) return true;

    // Try to infer from current URL if hosted on GitHub Pages
    // Format: https://<owner>.github.io/<repo>/
    const url = window.location.hostname;
    if (url.includes('github.io')) {
        owner = url.split('.')[0];
        repo = window.location.pathname.split('/')[1] || '';
    }

    // Local Dev Mode
    if ((!owner || !repo) && (url.includes('localhost') || url.includes('127.0.0.1'))) {
        return false; // Handle local dev separately
    }

    return !!(owner && repo);
}

export async function fetchRecipes() {
    ensureRepoDetails();

    if (!owner || !repo) {
        const url = window.location.hostname;
        // Local Dev Mode
        if (url.includes('localhost') || url.includes('127.0.0.1')) {
            console.log("Running in local dev mode");
            try {
                const response = await fetch('/recipes.json');
                if (!response.ok) throw new Error("Failed to load local recipes index");
                const files = await response.json();

                const recipes = await Promise.all(files.map(async (file) => {
                    const res = await fetch(`/${file.path}`);
                    const text = await res.text();
                    return {
                        filename: file.name,
                        path: file.path,
                        sha: file.sha,
                        content: text // Already text, no need to decode
                    };
                }));
                return recipes;
            } catch (e) {
                console.error("Local dev fetch failed:", e);
                return [];
            }
        }

        // If still empty and in dev, use defaults or error
        if (!owner || !repo) {
            console.warn("Repo details not set. Please configure.");
            return [];
        }
    }

    try {
        // 1. Get list of files in 'recipes' directory
        const { data: files } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner,
            repo,
            path: 'public/recipes',
        });

        // 2. Filter for markdown files
        const markdownFiles = files.filter(file => file.name.endsWith('.md'));

        // 3. Fetch content for each file
        const recipes = await Promise.all(markdownFiles.map(async (file) => {
            const { data } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
                owner,
                repo,
                path: file.path,
            });

            // Decode content (base64)
            const content = atob(data.content);
            return {
                filename: file.name,
                path: file.path,
                sha: data.sha,
                content
            };
        }));

        return recipes;
    } catch (error) {
        console.error("Error fetching recipes:", error);
        return [];
    }
}

export async function fetchRecipe(filename) {
    ensureRepoDetails();

    if (!owner || !repo) {
        const url = window.location.hostname;
        // Local Dev Mode
        if (url.includes('localhost') || url.includes('127.0.0.1')) {
            try {
                const res = await fetch(`/recipes/${filename}`);
                if (!res.ok) throw new Error("Recipe not found locally");
                const text = await res.text();
                return {
                    filename: filename,
                    path: `recipes/${filename}`,
                    sha: 'mock-sha',
                    content: text
                };
            } catch (e) {
                console.error("Local fetch failed:", e);
                throw e;
            }
        }
    }

    try {
        const { data } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner,
            repo,
            path: `public/recipes/${filename}`,
        });

        const content = atob(data.content);
        return {
            filename: data.name,
            path: data.path,
            sha: data.sha,
            content
        };
    } catch (error) {
        console.error("Error fetching recipe:", error);
        throw error;
    }
}

export async function createPullRequest(recipe, filename, token) {
    ensureRepoDetails();
    if (token) {
        initializeGitHub(token, owner, repo);
    }

    const branchName = `recipe-${Date.now()}`;
    const message = `Add/Update recipe: ${recipe.title}`;
    const content = btoa(unescape(encodeURIComponent(recipe.markdown))); // Handle UTF-8
    const path = `public/recipes/${filename}`;

    try {
        // 1. Get default branch (usually main)
        const { data: repoData } = await octokit.request('GET /repos/{owner}/{repo}', {
            owner,
            repo
        });
        const defaultBranch = repoData.default_branch;

        // 2. Get SHA of default branch
        const { data: refData } = await octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
            owner,
            repo,
            ref: `heads/${defaultBranch}`
        });
        const sha = refData.object.sha;

        // 3. Create new branch
        await octokit.request('POST /repos/{owner}/{repo}/git/refs', {
            owner,
            repo,
            ref: `refs/heads/${branchName}`,
            sha
        });

        // 4. Create/Update file in new branch
        // Check if file exists to get SHA (for update)
        let fileSha;
        try {
            const { data: existingFile } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
                owner,
                repo,
                path,
                ref: branchName
            });
            fileSha = existingFile.sha;
        } catch (e) {
            // File doesn't exist, which is fine
        }

        await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner,
            repo,
            path,
            message,
            content,
            branch: branchName,
            sha: fileSha
        });

        // 5. Create Pull Request
        const { data: pr } = await octokit.request('POST /repos/{owner}/{repo}/pulls', {
            owner,
            repo,
            title: message,
            body: `This PR adds/updates the recipe: ${recipe.title}`,
            head: branchName,
            base: defaultBranch
        });

        return pr.html_url;

    } catch (error) {
        console.error("Error creating PR:", error);
        throw error;
    }
}

