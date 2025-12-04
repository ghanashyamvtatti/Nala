import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import RecipeEditor from './pages/RecipeEditor';
import RecipeView from './pages/RecipeView';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new" element={<RecipeEditor />} />
          <Route path="/recipe/:filename" element={<RecipeView />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
