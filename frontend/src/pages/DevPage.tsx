import { useState, useEffect } from 'react';
import {
  PageContainer, Heading, Button, Container,
} from '@ifrc-go/ui';

const SELECTED_MODEL_KEY = 'selectedVlmModel';

export default function DevPage() {
  const [availableModels, setAvailableModels] = useState<Array<{
    m_code: string;
    label: string;
    model_type: string;
    is_available: boolean;
  }>>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = () => {
    fetch('/api/models')
      .then(r => r.json())
      .then(modelsData => {
        setAvailableModels(modelsData.models || []);
        
        const persistedModel = localStorage.getItem(SELECTED_MODEL_KEY);
        if (modelsData.models && modelsData.models.length > 0) {
          if (persistedModel && modelsData.models.find((m: { m_code: string; is_available: boolean }) => m.m_code === persistedModel && m.is_available)) {
            setSelectedModel(persistedModel);
          } else {
            const firstAvailableModel = modelsData.models.find((m: { is_available: boolean }) => m.is_available) || modelsData.models[0];
            setSelectedModel(firstAvailableModel.m_code);
            localStorage.setItem(SELECTED_MODEL_KEY, firstAvailableModel.m_code);
          }
        }
      })
      .catch(() => {

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
    localStorage.setItem(SELECTED_MODEL_KEY, modelCode);
  };

  return (
    <PageContainer>
      <div className="mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <Heading level={1}>Development & Testing</Heading>
        
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
                    ✓ Active for caption generation
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
        </div>
      </div>
    </PageContainer>
  );
}
