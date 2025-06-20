import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Models from './pages/Models';
import ModelDetail from './pages/ModelDetail';
import ModelAccountsPage from './pages/ModelAccountsPage';
import CentralAccountsPage from './pages/CentralAccountsPage';
import Analytics from './pages/Analytics';
import CentralContentRegistry from './components/CentralContentRegistry';
import IPhoneSettingsPage from './pages/IPhoneSettingsPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Toaster position="top-right" />
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/models" element={<Models />} />
            <Route path="/models/:modelId" element={<ModelDetail />} />
            <Route path="/models/:id/accounts" element={<ModelAccountsPage />} />
            <Route path="/accounts" element={<CentralAccountsPage />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/content" element={<CentralContentRegistry />} />
            <Route path="/iphones" element={<IPhoneSettingsPage />} />
          </Routes>
        </Layout>
      </div>
    </Router>
  );
}

export default App; 