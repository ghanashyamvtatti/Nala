# Deploying Nala to GitHub Pages

I have already configured the project for deployment. Here are the steps to deploy:

1.  **Commit Changes**: Ensure all your changes are committed to git.
    ```bash
    git add .
    git commit -m "Prepare for deployment"
    ```

2.  **Deploy**: Run the deployment script. This will build the project and push the `dist` folder to the `gh-pages` branch.
    ```bash
    npm run deploy
    ```

3.  **GitHub Settings**:
    *   Go to your repository on GitHub: [https://github.com/ghanashyamvtatti/Nala](https://github.com/ghanashyamvtatti/Nala)
    *   Go to **Settings** > **Pages**.
    *   Ensure the **Source** is set to `Deploy from a branch`.
    *   Ensure the **Branch** is set to `gh-pages` / `(root)`.
    *   Save if necessary.

4.  **Visit Site**: Your site should be live at:
    [https://ghanashyamvtatti.github.io/Nala/](https://ghanashyamvtatti.github.io/Nala/)

## Configuration Changes Made
*   **Router**: Switched to `HashRouter` in `App.jsx` to prevent 404 errors on refresh (GitHub Pages doesn't support SPA routing natively).
*   **Base Path**: Updated `vite.config.js` with `base: '/Nala/'` to ensure assets load correctly from the subdirectory.
*   **Scripts**: Added `predeploy` and `deploy` scripts to `package.json`.
*   **Dependency**: Installed `gh-pages` package.
