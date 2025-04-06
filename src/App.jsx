import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import ExtractionPage from './components/ExtractionPage';
import PlottingPage from './components/PlottingPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/extraction" element={<ExtractionPage />} />
        <Route path="/plotting" element={<PlottingPage />} />
      </Routes>
    </HashRouter>
  );
}
