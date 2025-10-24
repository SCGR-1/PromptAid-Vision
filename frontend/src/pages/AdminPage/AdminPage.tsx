// Force rebuild - Frontend updated with edit prompt functionality
import React, { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../../hooks/useAdmin';
import { PageContainer, Heading, Button, Container, TextInput, SelectInput, Spinner } from '@ifrc-go/ui';
import styles from './AdminPage.module.css';
import uploadStyles from '../UploadPage/UploadPage.module.css';

const SELECTED_MODEL_KEY = 'selectedVlmModel';

interface PromptData {
  p_code: string;
  label: string;
  metadata_instructions?: string;
  image_type: string;
  is_active: boolean;
}

interface ModelData {
  m_code: string;
  label: string;
  model_type: string;
  provider?: string;
  model_id?: string;
  config?: {
    provider?: string;
    model_id?: string;
    model?: string;
    stub?: boolean;
  };
  is_available: boolean;
  is_fallback: boolean;
}

interface ImageTypeData {
  image_type: string;
  label: string;
}

interface SchemaData {
  schema_id: string;
  title: string;
  version: string;
  created_at?: string;
  schema: Record<string, unknown>;
}

export default function AdminPage() {
  const { isAuthenticated, isLoading, login, logout, verifyToken } = useAdmin();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [availableModels, setAvailableModels] = useState<ModelData[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedFallbackModel, setSelectedFallbackModel] = useState<string>('');
  
  // Prompts state
  const [availablePrompts, setAvailablePrompts] = useState<PromptData[]>([]);
  
  const [imageTypes, setImageTypes] = useState<ImageTypeData[]>([]);
  
  // Schema management state
  const [availableSchemas, setAvailableSchemas] = useState<SchemaData[]>([]);
  const [showEditSchemaForm, setShowEditSchemaForm] = useState(false);
  const [editingSchema, setEditingSchema] = useState<SchemaData | null>(null);
  const [newSchemaData, setNewSchemaData] = useState<SchemaData>({
    schema_id: '',
    title: '',
    version: '',
    schema: {}
  });
  
  // Prompt management state
  const [showEditPromptForm, setShowEditPromptForm] = useState(false);
  const [showAddPromptForm, setShowAddPromptForm] = useState(false);
  const [addingPromptType, setAddingPromptType] = useState<'crisis_map' | 'drone_image' | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<PromptData | null>(null);
  const [newPromptData, setNewPromptData] = useState<PromptData>({
    p_code: '',
    label: '',
    metadata_instructions: '',
    image_type: 'crisis_map',
    is_active: false
  });
  
     // Model management state
   const [showAddModelForm, setShowAddModelForm] = useState(false);
   const [showEditModelForm, setShowEditModelForm] = useState(false);
   const [editingModel, setEditingModel] = useState<ModelData | null>(null);
   const [newModelData, setNewModelData] = useState<ModelData>({
     m_code: '',
     label: '',
     model_type: 'custom',
     provider: 'huggingface',
     model_id: '',
     is_available: false,
     is_fallback: false
   });
  
         // Modal states
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [showSetupInstructionsModal, setShowSetupInstructionsModal] = useState(false);
    const [showTestResultsModal, setShowTestResultsModal] = useState(false);
    const [modelToDelete, setModelToDelete] = useState<string>('');
    const [setupInstructions, setSetupInstructions] = useState('');
    
    // VLM Testing states
    const [testResults, setTestResults] = useState<string>('');
    const [testResultsTitle, setTestResultsTitle] = useState<string>('');

  const fetchModels = useCallback(() => {
    fetch('/api/models')
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then(modelsData => {
         console.log('Models data received:', modelsData);
        // Ensure modelsData is an object with models array
        if (modelsData && Array.isArray(modelsData.models)) {
          setAvailableModels(modelsData.models);
          
          const persistedModel = localStorage.getItem(SELECTED_MODEL_KEY);
          if (modelsData.models.length > 0) {
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
        } else {
          console.error('Expected models object but got:', modelsData);
          setAvailableModels([]);
        }
      })
      .catch((error) => {
        console.error('Error fetching models:', error);
        setAvailableModels([]);
      });
    
    // Fetch current fallback model
    fetch('/api/admin/fallback-model', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    })
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then(fallbackData => {
        console.log('Fallback model data received:', fallbackData);
        if (fallbackData.fallback_model) {
          setSelectedFallbackModel(fallbackData.fallback_model.m_code);
        } else {
          setSelectedFallbackModel('');
        }
      })
      .catch((error) => {
        console.error('Error fetching fallback model:', error);
        setSelectedFallbackModel('');
      });
  }, []);

  const fetchPrompts = useCallback(() => {
    console.log('=== fetchPrompts called ===');
    fetch('/api/prompts')
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then(promptsData => {
        console.log('Prompts data received:', promptsData);
        // Ensure promptsData is an array
        if (Array.isArray(promptsData)) {
          setAvailablePrompts(promptsData);
        } else {
          console.error('Expected array but got:', promptsData);
          setAvailablePrompts([]);
        }
        console.log('State update triggered with:', promptsData || []);
      })
      .catch((error) => {
        console.error('Error fetching prompts:', error);
        setAvailablePrompts([]);
      });
  }, []);

  const fetchImageTypes = useCallback(() => {
    fetch('/api/image-types')
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then(imageTypesData => {
        console.log('Image types data received:', imageTypesData);
        // Ensure imageTypesData is an array
        if (Array.isArray(imageTypesData)) {
          setImageTypes(imageTypesData);
        } else {
          console.error('Expected array but got:', imageTypesData);
          setImageTypes([]);
        }
      })
      .catch((error) => {
        console.error('Error fetching image types:', error);
        setImageTypes([]);
      });
  }, []);

  const fetchSchemas = useCallback(() => {
    console.log('=== fetchSchemas called ===');
    fetch('/api/schemas', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    })
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then(schemasData => {
        console.log('Schemas data received:', schemasData);
        // Ensure schemasData is an array
        if (Array.isArray(schemasData)) {
          setAvailableSchemas(schemasData);
        } else {
          console.error('Expected array but got:', schemasData);
          setAvailableSchemas([]);
        }
      })
      .catch((error) => {
        console.error('Error fetching schemas:', error);
        setAvailableSchemas([]);
      });
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchModels();
      fetchPrompts();
      fetchImageTypes();
      fetchSchemas();
    }
  }, [isAuthenticated, fetchModels, fetchPrompts, fetchImageTypes, fetchSchemas]);

  // Check token validity on mount to handle expired tokens
  useEffect(() => {
    if (isAuthenticated) {
      verifyToken();
    }
  }, [isAuthenticated, verifyToken]);



  const handleEditPrompt = (prompt: PromptData) => {
    setEditingPrompt(prompt);
    setNewPromptData({
      p_code: prompt.p_code,
      label: prompt.label || '',
      metadata_instructions: prompt.metadata_instructions || '',
      image_type: prompt.image_type || 'crisis_map',
      is_active: prompt.is_active || false
    });
    setShowEditPromptForm(true);
  };

  const handleSavePrompt = async () => {
    try {
             if (!editingPrompt) {
         alert('No prompt selected for editing');
         return;
       }
       
       const response = await fetch(`/api/prompts/${editingPrompt.p_code}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          label: newPromptData.label,
          metadata_instructions: newPromptData.metadata_instructions,
          image_type: newPromptData.image_type,
          is_active: newPromptData.is_active
        }),
      });

      if (response.ok) {
        // Refresh prompts and close form
        fetchPrompts();
        setShowEditPromptForm(false);
        setEditingPrompt(null);
        setNewPromptData({ p_code: '', label: '', metadata_instructions: '', image_type: 'crisis_map', is_active: false });
      } else {
        const errorData = await response.json();
        alert(`Failed to update prompt: ${errorData.error || 'Unknown error'}`);
      }
    } catch {
      alert('Error updating prompt');
    }
  };

  const handleTogglePromptActive = async (promptCode: string, imageType: string) => {
    try {
      const response = await fetch(`/api/prompts/${promptCode}/toggle-active?image_type=${imageType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Refresh prompts to show updated status
        fetchPrompts();
      } else {
        const errorData = await response.json();
        alert(`Failed to toggle prompt active status: ${errorData.detail || 'Unknown error'}`);
      }
    } catch {
      alert('Error toggling prompt active status');
    }
  };

  const handleAddPrompt = (imageType: 'crisis_map' | 'drone_image') => {
    setAddingPromptType(imageType);
    setNewPromptData({
      p_code: '',
      label: '',
      metadata_instructions: '',
      image_type: imageType,
      is_active: false
    });
    setShowAddPromptForm(true);
  };

  const handleSaveNewPrompt = async () => {
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPromptData),
      });

      if (response.ok) {
        // Refresh prompts and close form
        fetchPrompts();
        setShowAddPromptForm(false);
        setAddingPromptType(null);
        setNewPromptData({
          p_code: '',
          label: '',
          metadata_instructions: '',
          image_type: 'crisis_map',
          is_active: false
        });
      } else {
        const errorData = await response.json();
        alert(`Failed to create prompt: ${errorData.detail || 'Unknown error'}`);
      }
    } catch {
      alert('Error creating prompt');
    }
  };

  // Schema management handlers
  const handleEditSchema = (schema: SchemaData) => {
    setEditingSchema(schema);
    setNewSchemaData({
      schema_id: schema.schema_id,
      title: schema.title,
      version: schema.version,
      schema: schema.schema
    });
    setShowEditSchemaForm(true);
  };

  const handleSaveSchema = async () => {
    try {
      if (!editingSchema) {
        alert('No schema selected for editing');
        return;
      }
      
      const response = await fetch(`/api/schemas/${editingSchema.schema_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(newSchemaData),
      });

      if (response.ok) {
        // Refresh schemas and close form
        fetchSchemas();
        setShowEditSchemaForm(false);
        setEditingSchema(null);
        setNewSchemaData({
          schema_id: '',
          title: '',
          version: '',
          schema: {}
        });
      } else {
        const errorData = await response.json();
        alert(`Failed to save schema: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving schema:', error);
      alert('Error saving schema');
    }
  };

  const handleCancelSchema = () => {
    setShowEditSchemaForm(false);
    setEditingSchema(null);
    setNewSchemaData({
      schema_id: '',
      title: '',
      version: '',
      schema: {}
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
          (prev || []).map(model => 
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

  const handleFallbackModelChange = async (modelCode: string) => {
    try {
      const response = await fetch(`/api/admin/models/${modelCode}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          is_fallback: true
        })
      });

      if (response.ok) {
        setSelectedFallbackModel(modelCode);
        // Refresh models to update the is_fallback status
        fetchModels();
      } else {
        const errorData = await response.json();
        alert(`Failed to set fallback model: ${errorData.detail || 'Unknown error'}`);
      }
    } catch {
      alert('Error setting fallback model');
    }
  };

  // Model management functions
  const handleAddModel = async () => {
    try {
      const response = await fetch('/api/admin/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(newModelData)
      });

      if (response.ok) {
        // Prepare setup instructions
        const instructions = `
Model "${newModelData.label}" added successfully!

⚠️  IMPORTANT: Model will NOT work until you complete these steps:

1. 🔑 Ensure API key is set and valid.

2. 📝 Verify model_id format.

3. 📚 Check model specific documentation for details.
        `;
        
        setSetupInstructions(instructions);
        setShowSetupInstructionsModal(true);
        
        setShowAddModelForm(false);
        setNewModelData({
          m_code: '',
          label: '',
          model_type: 'custom',
          provider: 'huggingface',
          model_id: '',
          is_available: false,
          is_fallback: false
        });
        fetchModels(); // Refresh the models list
      } else {
        const errorData = await response.json();
        alert(`Failed to add model: ${errorData.detail || 'Unknown error'}`);
      }
    } catch {
      alert('Error adding model');
    }
  };

     const handleEditModel = (model: ModelData) => {
     setEditingModel(model);
     setNewModelData({
       m_code: model.m_code,
       label: model.label,
       model_type: model.model_type || 'custom',
       provider: model.provider || model.config?.provider || 'huggingface',
       model_id: model.model_id || model.config?.model_id || model.m_code,
       is_available: model.is_available,
       is_fallback: model.is_fallback
     });
     setShowEditModelForm(true);
   };

   const handleUpdateModel = async () => {
     try {
       console.log('Updating model with data:', newModelData);
       
       // Create update payload without m_code (it's in the URL)
       const updatePayload = {
         label: newModelData.label,
         model_type: newModelData.model_type,
         provider: newModelData.provider,
         model_id: newModelData.model_id,
         is_available: newModelData.is_available
       };
       
       console.log('Update payload:', updatePayload);
       
       if (!editingModel) {
         alert('No model selected for editing');
         return;
       }
       
       const response = await fetch(`/api/admin/models/${editingModel.m_code}`, {
         method: 'PUT',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
         },
         body: JSON.stringify(updatePayload)
       });

       console.log('Update response status:', response.status);
       
       if (response.ok) {
         const result = await response.json();
         console.log('Update successful:', result);
         
         setShowEditModelForm(false);
         setEditingModel(null);
         setNewModelData({
           m_code: '',
           label: '',
           model_type: 'custom',
           provider: 'huggingface',
           model_id: '',
           is_available: false,
           is_fallback: false
         });
         
         console.log('Refreshing models...');
         fetchModels(); // Refresh the models list
       } else {
         const errorData = await response.json();
         console.error('Update failed:', errorData);
         alert(`Failed to update model: ${errorData.detail || 'Unknown error'}`);
       }
     } catch (error) {
       console.error('Update error:', error);
       alert('Error updating model');
     }
   };

   const handleDeleteModel = async (modelCode: string) => {
     setModelToDelete(modelCode);
     setShowDeleteConfirmModal(true);
   };

  const handleDeleteModelConfirm = async () => {
    try {
      const response = await fetch(`/api/admin/models/${modelToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (response.ok) {
        setShowDeleteConfirmModal(false);
        setModelToDelete('');
        fetchModels(); // Refresh the models list
      } else {
        const errorData = await response.json();
        alert(`Failed to delete model: ${errorData.detail || 'Unknown error'}`);
      }
    } catch {
      alert('Error deleting model');
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
    } catch {
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
             <Heading level={2}>Admin Login</Heading>
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
                disabled={isLoggingIn}
              />
            </div>

            {error && (
              <div>
                <p className="text-sm text-ifrcRed font-medium">{error}</p>
              </div>
            )}

            <div className="flex justify-center">
              <Container withInternalPadding className="p-2">
                {isLoggingIn ? (
                  <div className={uploadStyles.loadingContainer}>
                    <Spinner className="text-ifrcRed" />
                    <p className={uploadStyles.loadingText}>Logging in...</p>
                  </div>
                ) : (
                  <Button
                    name="login"
                    type="submit"
                    variant="primary"
                    size={2}
                  >
                    Login
                  </Button>
                )}
              </Container>
            </div>
          </form>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className={styles.adminContainer}>
        <div className={styles.adminHeader}>
          <Button
            name="logout"
            variant="secondary"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
        
        <div className={styles.adminSection}>
          {/* Model Selection Section */}
          <Container
            heading="VLM Model Selection"
            headingLevel={2}
            withHeaderBorder
            withInternalPadding
          >
            <div className={styles.modelSelectionArea}>
              <p className="text-gray-700">
                Select which Vision Language Model to use for caption generation.
              </p>
              
                             <div className={styles.modelSelectionRow}>
                 <SelectInput
                   label="Model"
                   name="selected-model"
                  value={selectedModel}
                   onChange={(newValue) => handleModelChange(newValue || '')}
                   options={[
                     { value: 'random', label: 'Random' },
                     ...(availableModels || [])
                    .filter(model => model.is_available)
                       .map(model => ({
                         value: model.m_code,
                         label: model.label
                       }))
                   ]}
                   keySelector={(o) => o.value}
                   labelSelector={(o) => o.label}
                 />
                 
                 <SelectInput
                   label="Fallback"
                   name="fallback-model"
                   value={selectedFallbackModel}
                   onChange={(newValue) => handleFallbackModelChange(newValue || '')}
                   options={[
                     { value: '', label: 'No fallback (use STUB_MODEL)' },
                     ...(availableModels || [])
                    .filter(model => model.is_available)
                       .map(model => ({
                         value: model.m_code,
                         label: model.label
                       }))
                   ]}
                   keySelector={(o) => o.value}
                   labelSelector={(o) => o.label}
                 />
                                 
              </div>
            </div>
          </Container>

          {/* Model Management Section */}
          <Container
            heading="Model Management"
            headingLevel={2}
            withHeaderBorder
            withInternalPadding
          >
            <div className={styles.modelManagementArea}>

              
              

              {/* Models Table */}
              <div className={styles.modelsTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Label</th>
                      <th>Provider</th>
                      <th>Model ID</th>
                      <th>Available</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(availableModels || []).map(model => (
                      <tr key={model.m_code}>
                        <td className={styles.modelCode}>{model.m_code}</td>
                        <td>{model.label}</td>
                                                 <td>{model.provider || model.config?.provider || 'huggingface'}</td>
                         <td className={styles.modelId}>{model.model_id || model.config?.model_id || model.m_code || 'N/A'}</td>
                        <td>
                          <Button
                            name={`toggle-${model.m_code}`}
                            variant={model.is_available ? "primary" : "secondary"}
                            size={1}
                            onClick={() => toggleModelAvailability(model.m_code, model.is_available)}
                          >
                            {model.is_available ? 'Enabled' : 'Disabled'}
                          </Button>
                        </td>
                                                 <td>
                           <div className={styles.modelActions}>
                             <Button
                               name={`edit-${model.m_code}`}
                               variant="secondary"
                               size={1}
                               onClick={() => handleEditModel(model)}
                             >
                               Edit
                             </Button>
                             <Button
                               name={`delete-${model.m_code}`}
                               variant="secondary"
                               size={1}
                               onClick={() => handleDeleteModel(model.m_code)}
                             >
                               Delete
                             </Button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

               {/* Add Model Button - now below the table */}
               {!showAddModelForm && (
                 <div className={styles.addModelButtonContainer}>
                   <Button
                     name="show-add-form"
                     variant="primary"
                     onClick={() => setShowAddModelForm(true)}
                   >
                     Add New Model
                   </Button>
            </div>
               )}

              {/* Add Model Form - now below the table */}
              {showAddModelForm && (
                <div className={styles.addModelForm}>
                  <h4 className={styles.addModelFormTitle}>Add New Model</h4>
                  <div className={styles.addModelFormGrid}>
                                         <div className={styles.addModelFormField}>
                       <TextInput
                         label="Model Code"
                         name="model-code"
                         value={newModelData.m_code}
                         onChange={(value) => setNewModelData({...newModelData, m_code: value || ''})}
                         placeholder="e.g., NEW_MODEL_123"
                       />
                     </div>
                                         <div className={styles.addModelFormField}>
                       <TextInput
                         label="Label"
                         name="model-label"
                         value={newModelData.label}
                         onChange={(value) => setNewModelData({...newModelData, label: value || ''})}
                         placeholder="e.g., New Model Name"
                       />
                     </div>
                                         <div className={styles.addModelFormField}>
                       <SelectInput
                         label="Provider"
                         name="model-provider"
                         value={newModelData.provider}
                         onChange={(value) => setNewModelData({...newModelData, provider: value || 'huggingface'})}
                         options={[
                           { value: 'huggingface', label: 'HuggingFace' },
                           { value: 'openai', label: 'OpenAI' },
                           { value: 'google', label: 'Google' }
                         ]}
                         keySelector={(o) => o.value}
                         labelSelector={(o) => o.label}
                       />
                     </div>
                                         <div className={styles.addModelFormField}>
                       <TextInput
                         label="Model ID"
                         name="model-id"
                         value={newModelData.model_id}
                         onChange={(value) => setNewModelData({...newModelData, model_id: value || ''})}
                         placeholder="e.g., org/model-name"
                       />
                     </div>
                                         <div className={styles.addModelFormField}>
                       <div className={styles.addModelFormCheckbox}>
                         <input
                           type="checkbox"
                           checked={newModelData.is_available}
                           onChange={(e) => setNewModelData({...newModelData, is_available: e.target.checked})}
                         />
                         <span>Available for use</span>
                       </div>
                     </div>
                  </div>
                  <div className={styles.addModelFormActions}>
                    <Button
                      name="save-model"
                      variant="primary"
                      onClick={handleAddModel}
                      disabled={!newModelData.m_code || !newModelData.label || !newModelData.model_id}
                    >
                      Save Model
                    </Button>
                       <Button
                      name="cancel-add"
                         variant="secondary"
                      onClick={() => setShowAddModelForm(false)}
                    >
                      Cancel
                       </Button>
                  </div>
                                 </div>
               )}

               {/* Edit Model Form */}
               {showEditModelForm && (
                 <div className={styles.addModelForm}>
                   <h4 className={styles.addModelFormTitle}>Edit Model: {editingModel?.label}</h4>
                   <div className={styles.addModelFormGrid}>
                     <div className={styles.addModelFormField}>
                       <TextInput
                         label="Model Code"
                         name="model-code"
                         value={newModelData.m_code}
                         onChange={(value) => setNewModelData({...newModelData, m_code: value || ''})}
                         placeholder="e.g., NEW_MODEL_123"
                         disabled
                       />
                     </div>
                     <div className={styles.addModelFormField}>
                       <TextInput
                         label="Label"
                         name="model-label"
                         value={newModelData.label}
                         onChange={(value) => setNewModelData({...newModelData, label: value || ''})}
                         placeholder="e.g., New Model Name"
                       />
                     </div>
                     <div className={styles.addModelFormField}>
                       <SelectInput
                         label="Provider"
                         name="model-provider"
                         value={newModelData.provider}
                         onChange={(value) => setNewModelData({...newModelData, provider: value || 'huggingface'})}
                         options={[
                           { value: 'huggingface', label: 'HuggingFace' },
                           { value: 'openai', label: 'OpenAI' },
                           { value: 'google', label: 'Google' }
                         ]}
                         keySelector={(o) => o.value}
                         labelSelector={(o) => o.label}
                       />
                     </div>
                     <div className={styles.addModelFormField}>
                       <TextInput
                         label="Model ID"
                         name="model-id"
                         value={newModelData.model_id}
                         onChange={(value) => setNewModelData({...newModelData, model_id: value || ''})}
                         placeholder="e.g., org/model-name"
                       />
                     </div>
                     <div className={styles.addModelFormField}>
                       <div className={styles.addModelFormCheckbox}>
                         <input
                           type="checkbox"
                           checked={newModelData.is_available}
                           onChange={(e) => setNewModelData({...newModelData, is_available: e.target.checked})}
                         />
                         <span>Available for use</span>
                       </div>
                     </div>
                   </div>
                   <div className={styles.addModelFormActions}>
                     <Button
                       name="update-model"
                       variant="primary"
                       onClick={handleUpdateModel}
                       disabled={!newModelData.m_code || !newModelData.label || !newModelData.model_id}
                     >
                       Update Model
                     </Button>
                       <Button
                       name="cancel-edit"
                         variant="secondary"
                         onClick={() => {
                         setShowEditModelForm(false);
                         setEditingModel(null);
                         setNewModelData({
                           m_code: '',
                           label: '',
                           model_type: 'custom',
                           provider: 'huggingface',
                           model_id: '',
                           is_available: false,
                           is_fallback: false
                             });
                         }}
                       >
                       Cancel
                       </Button>
                     </div>
                 </div>
               )}
                   </div>
                 </Container>

                 {/* Prompts Management Section */}
                 <Container
                   heading="Prompt Management"
                   headingLevel={2}
                   withHeaderBorder
                   withInternalPadding
                 >
                   <div className={styles.modelManagementArea}>
                     
                     {/* Crisis Maps Sub-section */}
                     <div className={styles.promptSubsection}>
                       <h4 className={styles.promptSubsectionTitle}>Crisis Maps</h4>
                       <div className={styles.modelsTable}>
                         <table>
                           <thead>
                             <tr>
                               <th>Code</th>
                               <th>Label</th>
                               <th>Status</th>
                               <th>Actions</th>
                             </tr>
                           </thead>
                           <tbody>
                             {(availablePrompts || [])
                               .filter(prompt => prompt.image_type === 'crisis_map')
                               .sort((a, b) => a.p_code.localeCompare(b.p_code)) // Stable sort by code
                               .map(prompt => (
                               <tr key={prompt.p_code}>
                                 <td className={styles.modelCode}>{prompt.p_code}</td>
                                 <td className={styles.promptLabel}>{prompt.label || 'No label'}</td>
                                 <td>
                                   <Button
                                     name={`toggle-crisis-${prompt.p_code}`}
                                     variant={prompt.is_active ? "primary" : "secondary"}
                                     size={1}
                                     onClick={() => handleTogglePromptActive(prompt.p_code, 'crisis_map')}
                                   >
                                     {prompt.is_active ? 'Active' : 'Inactive'}
                                   </Button>
                                 </td>
                                 <td>
                                   <div className={styles.modelActions}>
                                     <Button
                                       name={`view-${prompt.p_code}`}
                                       variant="secondary"
                                       size={1}
                                       onClick={() => {
                                         setTestResults(`=== Prompt Details ===\nCode: ${prompt.p_code}\nLabel: ${prompt.label}\nImage Type: ${prompt.image_type}\nActive: ${prompt.is_active}\n\nMetadata Instructions:\n${prompt.metadata_instructions || 'No instructions available'}`);
                                         setTestResultsTitle(`Prompt: ${prompt.p_code}`);
                                         setShowTestResultsModal(true);
                                       }}
                                     >
                                       View
                                     </Button>
                                     <Button
                                       name={`edit-${prompt.p_code}`}
                                       variant="secondary"
                                       size={1}
                                       onClick={() => handleEditPrompt(prompt)}
                                     >
                                       Edit
                                     </Button>
                                   </div>
                                 </td>
                               </tr>
                             ))}
                           </tbody>
                         </table>
                       </div>

                       {/* Add Crisis Map Prompt Button */}
                       <div className={styles.addModelButtonContainer}>
                         <Button
                           name="add-crisis-prompt"
                           variant="primary"
                           onClick={() => handleAddPrompt('crisis_map')}
                         >
                           Add New Crisis Map Prompt
                         </Button>
                       </div>
                     </div>

                     {/* Drone Images Sub-section */}
                     <div className={styles.promptSubsection}>
                       <h4 className={styles.promptSubsectionTitle}>Drone Images</h4>
                       <div className={styles.modelsTable}>
                         <table>
                           <thead>
                             <tr>
                               <th>Code</th>
                               <th>Label</th>
                               <th>Status</th>
                               <th>Actions</th>
                             </tr>
                           </thead>
                           <tbody>
                             {(availablePrompts || [])
                               .filter(prompt => prompt.image_type === 'drone_image')
                               .sort((a, b) => a.p_code.localeCompare(b.p_code)) // Stable sort by code
                               .map(prompt => (
                               <tr key={prompt.p_code}>
                                 <td className={styles.modelCode}>{prompt.p_code}</td>
                                 <td className={styles.promptLabel}>{prompt.label || 'No label'}</td>
                                 <td>
                                   <Button
                                     name={`toggle-drone-${prompt.p_code}`}
                                     variant={prompt.is_active ? "primary" : "secondary"}
                                     size={1}
                                     onClick={() => handleTogglePromptActive(prompt.p_code, 'drone_image')}
                                   >
                                     {prompt.is_active ? 'Active' : 'Inactive'}
                                   </Button>
                                 </td>
                                 <td>
                                   <div className={styles.modelActions}>
                                     <Button
                                       name={`view-${prompt.p_code}`}
                                       variant="secondary"
                                       size={1}
                                       onClick={() => {
                                         setTestResults(`=== Prompt Details ===\nCode: ${prompt.p_code}\nLabel: ${prompt.label}\nImage Type: ${prompt.image_type}\nActive: ${prompt.is_active}\n\nMetadata Instructions:\n${prompt.metadata_instructions || 'No instructions available'}`);
                                         setTestResultsTitle(`Prompt: ${prompt.p_code}`);
                                         setShowTestResultsModal(true);
                                       }}
                                     >
                                       View
                                     </Button>
                                     <Button
                                       name={`edit-${prompt.p_code}`}
                                       variant="secondary"
                                       size={1}
                                       onClick={() => handleEditPrompt(prompt)}
                                     >
                                       Edit
                                     </Button>
                                   </div>
                                 </td>
                               </tr>
                             ))}
                           </tbody>
                         </table>
                       </div>

                       {/* Add Drone Image Prompt Button */}
                       <div className={styles.addModelButtonContainer}>
                         <Button
                           name="add-drone-prompt"
                           variant="primary"
                           onClick={() => handleAddPrompt('drone_image')}
                         >
                           Add New Drone Image Prompt
                         </Button>
                       </div>
                     </div>

                   </div>
                 </Container>

                 {/* Schema Management Section */}
                 <Container
                   heading="Schema Management"
                   headingLevel={2}
                   withHeaderBorder
                   withInternalPadding
                 >
                   <div className={styles.modelManagementArea}>
                     <div className={styles.modelsTable}>
                       <table>
                         <thead>
                           <tr>
                             <th>Schema ID</th>
                             <th>Schema Content</th>
                             <th>Actions</th>
                           </tr>
                         </thead>
                         <tbody>
                           {(availableSchemas || [])
                             .sort((a, b) => a.schema_id.localeCompare(b.schema_id))
                             .map(schema => (
                             <tr key={schema.schema_id}>
                               <td className={styles.modelCode}>{schema.schema_id}</td>
                               <td className={styles.promptLabel} style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                 {JSON.stringify(schema.schema)}
                               </td>
                               <td>
                                 <div className={styles.modelActions}>
                                   <Button
                                     name={`view-schema-${schema.schema_id}`}
                                     variant="secondary"
                                     size={1}
                                     onClick={() => {
                                       setTestResults(`=== Schema Details ===\nSchema ID: ${schema.schema_id}\n\nSchema Definition:\n${JSON.stringify(schema.schema, null, 2)}`);
                                       setTestResultsTitle(`Schema: ${schema.schema_id}`);
                                       setShowTestResultsModal(true);
                                     }}
                                   >
                                     View
                                   </Button>
                                   <Button
                                     name={`edit-schema-${schema.schema_id}`}
                                     variant="secondary"
                                     size={1}
                                     onClick={() => handleEditSchema(schema)}
                                   >
                                     Edit
                                   </Button>
                                 </div>
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   </div>
                 </Container>

                     {/* Utilities Section */}
                 <Container
             heading="Utilities"
                   headingLevel={2}
                   withHeaderBorder
                   withInternalPadding
                 >
                     <div className="flex flex-wrap gap-4">
               <Button
                 name="test-connection"
                 variant="secondary"
                 onClick={async () => {
                   setTestResults('Testing API connection...');
                   setTestResultsTitle('Connection Test Results');
                   
                   try {
                     // Test basic API connectivity
                     const response = await fetch('/api/models');
                     if (response.ok) {
                       const data = await response.json();
                       const results = `✅ API connection successful!\n\nFound ${data.models?.length || 0} models in database.\n\nAvailable models:\n${(data.models || []).filter((m: Record<string, unknown>) => m.is_available).map((m: Record<string, unknown>) => `- ${m.label} (${m.m_code})`).join('\n') || 'None'}`;
                       setTestResults(results);
                     } else {
                       const results = `❌ API connection failed: HTTP ${response.status}`;
                       setTestResults(results);
                     }
                     setShowTestResultsModal(true);
                   } catch (error) {
                     const results = `❌ Connection error: ${error}`;
                     setTestResults(results);
                     setShowTestResultsModal(true);
                   }
                 }}
               >
                 Test Connection
               </Button>
               
                   </div>
                 </Container>
        </div>
      </div>

      {/* Delete Model Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteConfirmModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalBody}>
              <h3 className={styles.modalTitle}>Delete Model</h3>
              <p className={styles.modalText}>
                Are you sure you want to delete model <span className={styles.modelCode}>{modelToDelete}</span>? 
                This action cannot be undone.
              </p>
              <div className={styles.modalButtons}>
                <Button
                  name="cancel-delete"
                  variant="tertiary"
                  onClick={() => setShowDeleteConfirmModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  name="confirm-delete"
                  variant="secondary"
                  onClick={handleDeleteModelConfirm}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Setup Instructions Modal */}
      {showSetupInstructionsModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSetupInstructionsModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalBody}>
              <h3 className={styles.modalTitle}>Model Added Successfully!</h3>
              <div className={`${styles.modalText} ${styles.modalTextLeft}`}>
                {setupInstructions}
              </div>
              <div className={styles.modalButtons}>
                <Button
                  name="close-setup-instructions"
                  variant="secondary"
                  onClick={() => setShowSetupInstructionsModal(false)}
                >
                  Got it!
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

             {/* Test Results Modal */}
       {showTestResultsModal && (
         <div className={styles.modalOverlay} onClick={() => setShowTestResultsModal(false)}>
           <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
             <div className={styles.modalBody}>
               <h3 className={styles.modalTitle}>{testResultsTitle}</h3>
               <div className={`${styles.modalText} ${styles.modalTextLeft}`}>
                 <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                   {testResults}
                 </div>
               </div>
               <div className={styles.modalButtons}>
                 <Button
                   name="close-test-results"
                   variant="secondary"
                   onClick={() => setShowTestResultsModal(false)}
                 >
                   Close
                 </Button>
               </div>
             </div>
           </div>
         </div>
       )}

      {/* Edit Prompt Form Modal */}
      {showEditPromptForm && (
        <div className={styles.modalOverlay} onClick={() => setShowEditPromptForm(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalBody}>
              <h3 className={styles.modalTitle}>Edit Prompt: {editingPrompt?.p_code}</h3>
              <div className={styles.modalForm}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Code:</label>
                  <TextInput
                    name="prompt-code"
                    value={editingPrompt?.p_code}
                    onChange={() => {}} // Required prop for disabled field
                    disabled={true}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Label:</label>
                  <TextInput
                    name="prompt-label"
                    value={newPromptData.label}
                    onChange={(value) => setNewPromptData(prev => ({ ...prev, label: value || '' }))}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Image Type:</label>
                  <SelectInput
                    name="prompt-image-type"
                    value={newPromptData.image_type}
                    onChange={(value) => setNewPromptData(prev => ({ ...prev, image_type: value || 'crisis_map' }))}
                    options={imageTypes || []}
                    keySelector={(o) => o.image_type}
                    labelSelector={(o) => o.label}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Active Status:</label>
                  <div className={styles.addModelFormCheckbox}>
                    <input
                      type="checkbox"
                      checked={newPromptData.is_active}
                      onChange={(e) => setNewPromptData(prev => ({ ...prev, is_active: e.target.checked }))}
                    />
                    <span>Active for this image type</span>
                  </div>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Metadata Instructions:</label>
                  <textarea
                    name="prompt-instructions"
                    value={newPromptData.metadata_instructions}
                    onChange={(e) => setNewPromptData(prev => ({ ...prev, metadata_instructions: e.target.value }))}
                    className={`${styles.formInput} ${styles.textarea}`}
                    rows={8}
                  />
                </div>
              </div>
              <div className={styles.modalButtons}>
                <Button
                  name="cancel-edit-prompt"
                  variant="tertiary"
                  onClick={() => {
                    setShowEditPromptForm(false);
                    setEditingPrompt(null);
                    setNewPromptData({ p_code: '', label: '', metadata_instructions: '', image_type: 'crisis_map', is_active: false });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  name="save-prompt"
                  variant="primary"
                  onClick={handleSavePrompt}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Prompt Form Modal */}
      {showAddPromptForm && (
        <div className={styles.modalOverlay} onClick={() => setShowAddPromptForm(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalBody}>
              <h3 className={styles.modalTitle}>
                Add New {addingPromptType === 'crisis_map' ? 'Crisis Map' : 'Drone Image'} Prompt
              </h3>
              <div className={styles.modalForm}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Code:</label>
                  <TextInput
                    name="prompt-code"
                    value={newPromptData.p_code}
                    onChange={(value) => setNewPromptData(prev => ({ ...prev, p_code: value || '' }))}
                    placeholder="e.g., CUSTOM_CRISIS_MAP_001"
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Label:</label>
                  <TextInput
                    name="prompt-label"
                    value={newPromptData.label}
                    onChange={(value) => setNewPromptData(prev => ({ ...prev, label: value || '' }))}
                    placeholder="Enter prompt description..."
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Image Type:</label>
                  <TextInput
                    name="prompt-image-type"
                    value={newPromptData.image_type}
                    onChange={() => {}} // Disabled - automatically set
                    disabled={true}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Active Status:</label>
                  <div className={styles.addModelFormCheckbox}>
                    <input
                      type="checkbox"
                      checked={newPromptData.is_active}
                      onChange={(e) => setNewPromptData(prev => ({ ...prev, is_active: e.target.checked }))}
                    />
                    <span>Active for this image type</span>
                  </div>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Metadata Instructions:</label>
                  <textarea
                    name="prompt-instructions"
                    value={newPromptData.metadata_instructions}
                    onChange={(e) => setNewPromptData(prev => ({ ...prev, metadata_instructions: e.target.value }))}
                    placeholder="Enter metadata extraction instructions..."
                    className={`${styles.formInput} ${styles.textarea}`}
                    rows={8}
                  />
                </div>
              </div>
              <div className={styles.modalButtons}>
                <Button
                  name="cancel-add-prompt"
                  variant="tertiary"
                  onClick={() => {
                    setShowAddPromptForm(false);
                    setAddingPromptType(null);
                    setNewPromptData({ p_code: '', label: '', metadata_instructions: '', image_type: 'crisis_map', is_active: false });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  name="save-new-prompt"
                  variant="primary"
                  onClick={handleSaveNewPrompt}
                  disabled={!newPromptData.p_code || !newPromptData.label}
                >
                  Create Prompt
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Schema Form Modal */}
      {showEditSchemaForm && (
        <div className={styles.modalOverlay} onClick={() => setShowEditSchemaForm(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalBody}>
              <h3 className={styles.modalTitle}>Edit Schema: {editingSchema?.schema_id}</h3>
              <div className={styles.modalForm}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Schema ID:</label>
                  <TextInput
                    name="schema-id"
                    value={newSchemaData.schema_id}
                    onChange={(value) => setNewSchemaData(prev => ({ ...prev, schema_id: value || '' }))}
                    className={styles.formInput}
                    disabled
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Schema Definition (JSON):</label>
                  <textarea
                    name="schema-definition"
                    value={JSON.stringify(newSchemaData.schema, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsedSchema = JSON.parse(e.target.value);
                        setNewSchemaData(prev => ({ ...prev, schema: parsedSchema }));
                      } catch {
                        // Invalid JSON, don't update
                      }
                    }}
                    className={`${styles.formInput} ${styles.textarea}`}
                    rows={20}
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
              </div>
              <div className={styles.modalButtons}>
                <Button
                  name="cancel-edit-schema"
                  variant="tertiary"
                  onClick={handleCancelSchema}
                >
                  Cancel
                </Button>
                <Button
                  name="save-schema"
                  variant="primary"
                  onClick={handleSaveSchema}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
