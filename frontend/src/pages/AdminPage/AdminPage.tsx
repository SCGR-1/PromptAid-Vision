import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { PageContainer, Heading, Button, Container, TextInput } from '@ifrc-go/ui';

const SELECTED_MODEL_KEY = 'selectedVlmModel';

export default function AdminPage() {
  const { isAuthenticated, isLoading, login, logout } = useAdmin();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [availableModels, setAvailableModels] = useState<Array<{
    m_code: string;
    label: string;
    model_type: string;
    is_available: boolean;
  }>>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchModels();
    }
  }, [isAuthenticated]);

  const fetchModels = () => {
    fetch('/api/models')
      .then(r => r.json())
      .then(modelsData => {
        setAvailableModels(modelsData.models || []);
        
        const persistedModel = localStorage.getItem(SELECTED_MODEL_KEY);
        if (modelsData.models && modelsData.models.length > 0) {
          if (persistedModel === 'random') {
            // Keep random selection
            setSelectedModel('random');
          } else if (persistedModel && modelsData.models.find((m: { m_code: string; is_available: boolean }) => m.m_code === persistedModel && m.is_available)) {
            setSelectedModel(persistedModel);
          } else {
            const firstAvailableModel = modelsData.models.find((m: { is_available: boolean }) => m.is_available) || modelsData.models[0];
            setSelectedModel(firstAvailableModel.m_code);
            localStorage.setItem(SELECTED_MODEL_KEY, firstAvailableModel.m_code);
          }
        }
      })
      .catch(() => {
        // Handle error silently
      });
  };

  const toggleModelAvailability = async (modelCode: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/models/${modelCode}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_available: !currentStatus
        })
      });

      if (response.ok) {
        setAvailableModels(prev => 
          prev.map(model => 
            model.m_code === modelCode 
              ? { ...model, is_available: !currentStatus }
              : model
          )
        );
      } else {
        const errorData = await response.json();
        alert(`Failed to toggle model availability: ${errorData.error || 'Unknown error'}`);
      }
    } catch {
      alert('Error toggling model availability');
    }
  };

  const handleModelChange = (modelCode: string) => {
    setSelectedModel(modelCode);
    if (modelCode === 'random') {
      // For random selection, we'll select a random available model when needed
      localStorage.setItem(SELECTED_MODEL_KEY, 'random');
    } else {
      localStorage.setItem(SELECTED_MODEL_KEY, modelCode);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }

    setIsLoggingIn(true);
    setError('');

    try {
      const success = await login(password);
      if (!success) {
        setError('Invalid password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    logout();
    setPassword('');
    setError('');
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ifrcRed mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <div className="text-center mb-8">
            <Heading level={1}>Admin Login</Heading>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <TextInput
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(value) => setPassword(value || '')}
                placeholder="Enter admin password"
                required
                className="w-full"
              />
            </div>

            {error && (
              <div className="bg-ifrcRed/10 border border-ifrcRed/20 rounded-md p-3">
                <p className="text-sm text-ifrcRed font-medium">{error}</p>
              </div>
            )}

            <div className="flex justify-center">
              <Container withInternalPadding className="p-2">
                <Button
                  name="login"
                  type="submit"
                  variant="primary"
                  size={2}
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? 'Logging in...' : 'Login'}
                </Button>
              </Container>
            </div>
          </form>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="flex justify-end mb-8">
          <Button
            name="logout"
            variant="secondary"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
        
        <div className="mt-8 space-y-8">
          {/* Model Selection Section */}
          <Container
            heading="VLM Model Selection"
            headingLevel={2}
            withHeaderBorder
            withInternalPadding
          >
            <div className="space-y-4">
              <p className="text-gray-700">
                Select which Vision Language Model to use for caption generation.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Model:</label>
                <select
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ifrcRed focus:border-transparent min-w-[200px]"
                >
                  <option value="random">Random</option>
                  {availableModels
                    .filter(model => model.is_available)
                    .map(model => (
                      <option key={model.m_code} value={model.m_code}>
                        {model.label}
                      </option>
                    ))}
                </select>
                {selectedModel && (
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    {selectedModel === 'random' 
                      ? '✓ Random model selection active' 
                      : '✓ Active for caption generation'
                    }
                  </span>
                )}
              </div>
            </div>
          </Container>

          {/* Model Information Section */}
          <Container
            heading="Model Information"
            headingLevel={2}
            withHeaderBorder
            withInternalPadding
          >
            <div className="space-y-4">
              <p className="text-gray-700">
                Detailed information about available models and their status. Use the toggle buttons to enable/disable models.
              </p>
              
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Label</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {availableModels.map(model => (
                      <tr key={model.m_code}>
                        <td className="px-4 py-2 text-sm font-mono">{model.m_code}</td>
                        <td className="px-4 py-2 text-sm">{model.label}</td>
                        <td className="px-4 py-2 text-sm">{model.model_type}</td>
                        <td className="px-4 py-2 text-sm">
                          <Button
                            name={`toggle-${model.m_code}`}
                            variant={model.is_available ? "primary" : "secondary"}
                            size={1}
                            onClick={() => toggleModelAvailability(model.m_code, model.is_available)}
                          >
                            {model.is_available ? 'Enabled' : 'Disabled'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Container>

                           {/* API Testing Section */}
                 <Container
                   heading="API Testing"
                   headingLevel={2}
                   withHeaderBorder
                   withInternalPadding
                 >
                   <div className="space-y-4">
                     <p className="text-gray-700">
                       Test API endpoints and model functionality.
                     </p>
                     
                     <div className="flex flex-wrap gap-4">
                       <Button
                         name="test-models-api"
                         variant="secondary"
                         onClick={() => {
                           fetch('/api/models')
                             .then(r => r.json())
                             .then(() => {
                               alert('Models API response received successfully');
                             })
                             .catch(() => {
                               alert('Models API error occurred');
                             });
                         }}
                       >
                         Test Models API
                       </Button>
                       
                       <Button
                         name="test-selected-model"
                         variant="secondary"
                         disabled={!selectedModel}
                         onClick={() => {
                           if (!selectedModel) return;
                           fetch(`/api/models/${selectedModel}/test`)
                             .then(r => r.json())
                             .then(() => {
                               alert('Model test completed successfully');
                             })
                             .catch(() => {
                               alert('Model test failed');
                             });
                         }}
                       >
                         Test Selected Model
                       </Button>
       
                       <Button
                         name="refresh-models"
                         variant="secondary"
                         onClick={fetchModels}
                       >
                         Refresh Models
                       </Button>
                     </div>
                   </div>
                 </Container>

                 {/* Schema Validation Section */}
                 <Container
                   heading="Schema Validation"
                   headingLevel={2}
                   withHeaderBorder
                   withInternalPadding
                 >
                   <div className="space-y-4">
                     <p className="text-gray-700">
                       Monitor and test JSON schema validation for VLM responses.
                     </p>
                     
                     <div className="flex flex-wrap gap-4">
                       <Button
                         name="view-schemas"
                         variant="secondary"
                         onClick={() => {
                           fetch('/api/schemas', {
                             headers: {
                               'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                             }
                           })
                             .then(r => r.json())
                             .then(data => {
                               console.log('Schemas:', data);
                               alert(`Found ${data.length} schemas. Check console for details.`);
                             })
                             .catch(() => {
                               alert('Failed to fetch schemas');
                             });
                         }}
                       >
                         View Schemas
                       </Button>
                       
                       <Button
                         name="validation-stats"
                         variant="secondary"
                         onClick={() => {
                           fetch('/api/schemas/validation-stats', {
                             headers: {
                               'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                             }
                           })
                             .then(r => r.json())
                             .then(data => {
                               console.log('Validation Stats:', data);
                               alert(`Validation: ${data.validation_passed} passed, ${data.validation_failed} failed. Check console for details.`);
                             })
                             .catch(() => {
                               alert('Failed to fetch validation stats');
                             });
                         }}
                       >
                         Validation Stats
                       </Button>
                     </div>
                   </div>
                 </Container>
        </div>
      </div>
    </PageContainer>
  );
}
