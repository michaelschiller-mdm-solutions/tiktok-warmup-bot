import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Settings, Save, AlertTriangle } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState({
    gemini_api_key: '',
    gemini_model_name: 'gemini-1.5-flash',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data }));
      } else {
        toast.error('Failed to load settings');
      }
    } catch (error) {
      toast.error('An error occurred while fetching settings');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Settings updated successfully!');
      } else {
        throw new Error(result.details || 'Failed to update settings');
      }
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
        <Settings className="w-8 h-8 mr-3 text-gray-600" />
        AI Settings
      </h1>
      
      <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="gemini_api_key" className="block text-sm font-medium text-gray-700 mb-1">
              Gemini API Key
            </label>
            <input
              type="password"
              id="gemini_api_key"
              name="gemini_api_key"
              value={settings.gemini_api_key}
              onChange={handleInputChange}
              className="form-input w-full"
              placeholder="Enter your Gemini API Key"
            />
             <p className="text-xs text-gray-500 mt-1">Your API key is stored securely and is not displayed publicly.</p>
          </div>
          
          <div>
            <label htmlFor="gemini_model_name" className="block text-sm font-medium text-gray-700 mb-1">
              Gemini Model Name
            </label>
            <input
              type="text"
              id="gemini_model_name"
              name="gemini_model_name"
              value={settings.gemini_model_name}
              onChange={handleInputChange}
              className="form-input w-full"
              placeholder="e.g., gemini-1.5-flash"
            />
            <p className="text-xs text-gray-500 mt-1">Default is 'gemini-1.5-flash'.</p>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Changing these settings will affect all AI-powered features, including username and bio generation.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage; 