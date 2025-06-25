import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Models from './pages/Models';
import ModelDetail from './pages/ModelDetail';
import ModelAccountsPage from './pages/ModelAccountsPage';
import CentralAccountsPage from './pages/CentralAccountsPage';
import Analytics from './pages/Analytics';
import CentralContentRegistry from './components/CentralContentRegistry';
import IPhoneSettingsPage from './pages/IPhoneSettingsPage';
import SettingsPage from './pages/SettingsPage';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <div className="App">
        <Toaster position="top-center" reverseOrder={false} />
        <Layout>
          <Routes>
            <Route path="/" element={<Models />} />
            <Route path="/models" element={<Models />} />
            <Route path="/models/:modelId" element={<ModelDetail />} />
            <Route path="/models/:modelId/accounts" element={<ModelAccountsPage />} />
            <Route path="/accounts" element={<CentralAccountsPage />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/content" element={<CentralContentRegistry />} />
            <Route path="/iphones" element={<IPhoneSettingsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </div>
    </Router>
  );
}

export default App; 