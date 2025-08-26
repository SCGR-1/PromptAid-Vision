// Force rebuild - Frontend updated with edit prompt functionality
import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { PageContainer, Heading, Button, Container, TextInput, SelectInput } from '@ifrc-go/ui';
import styles from './AdminPage.module.css';

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
     provider?: string;
     model_id?: string;
     config?: {
       provider?: string;
       model_id?: string;
       model?: string;
       stub?: boolean;
     };
  }>>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  
  // Prompts state
  const [availablePrompts, setAvailablePrompts] = useState<Array<{
    p_code: string;
    label: string;
    metadata_instructions?: string;
  }>>([]);
  
  // Prompt management state
  const [showEditPromptForm, setShowEditPromptForm] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<any>(null);
  const [newPromptData, setNewPromptData] = useState({
    p_code: '',
    label: '',
    metadata_instructions: ''
  });
  
     // Model management state
   const [showAddModelForm, setShowAddModelForm] = useState(false);
   const [showEditModelForm, setShowEditModelForm] = useState(false);
   const [editingModel, setEditingModel] = useState<any>(null);
   const [newModelData, setNewModelData] = useState({
     m_code: '',
     label: '',
     model_type: 'custom',
     provider: 'huggingface',
     model_id: '',
     is_available: false
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

  useEffect(() => {
    if (isAuthenticated) {
      fetchModels();
      fetchPrompts();
    }
  }, [isAuthenticated]);

  const fetchModels = () => {
    fetch('/api/models')
      .then(r => r.json())
      .then(modelsData => {
         console.log('Models data received:', modelsData);
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

  const fetchPrompts = () => {
    fetch('/api/prompts')
      .then(r => r.json())
      .then(promptsData => {
        console.log('Prompts data received:', promptsData);
        setAvailablePrompts(promptsData || []);
      })
      .catch(() => {
        // Handle error silently
      });
  };

  const handleEditPrompt = (prompt: any) => {
    setEditingPrompt(prompt);
    setNewPromptData({
      p_code: prompt.p_code,
      label: prompt.label || '',
      metadata_instructions: prompt.metadata_instructions || ''
    });
    setShowEditPromptForm(true);
  };

  const handleSavePrompt = async () => {
    try {
      const response = await fetch(`/api/prompts/${editingPrompt.p_code}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          label: newPromptData.label,
          metadata_instructions: newPromptData.metadata_instructions
        }),
      });

      if (response.ok) {
        // Refresh prompts and close form
        fetchPrompts();
        setShowEditPromptForm(false);
        setEditingPrompt(null);
        setNewPromptData({ p_code: '', label: '', metadata_instructions: '' });
      } else {
        const errorData = await response.json();
        alert(`Failed to update prompt: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Error updating prompt: ${error}`);
    }
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
          is_available: false
        });
        fetchModels(); // Refresh the models list
      } else {
        const errorData = await response.json();
        alert(`Failed to add model: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Error adding model');
    }
  };

     const handleEditModel = (model: any) => {
     setEditingModel(model);
     setNewModelData({
       m_code: model.m_code,
       label: model.label,
       model_type: model.model_type || 'custom',
       provider: model.provider || model.config?.provider || 'huggingface',
       model_id: model.model_id || model.config?.model_id || model.m_code,
       is_available: model.is_available
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
           is_available: false
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
    } catch (error) {
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
                     ...availableModels
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
                    {availableModels.map(model => (
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
                           is_available: false
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

                 {/* Prompts Section */}
                 <Container
                   heading="Prompts Management"
                   headingLevel={2}
                   withHeaderBorder
                   withInternalPadding
                 >
                   <div className={styles.modelManagementArea}>
                     {/* Prompts Table */}
                     <div className={styles.modelsTable}>
                       <table>
                         <thead>
                           <tr>
                             <th>Code</th>
                             <th>Label</th>
                             <th>Actions</th>
                           </tr>
                         </thead>
                         <tbody>
                           {availablePrompts.map(prompt => (
                             <tr key={prompt.p_code}>
                               <td className={styles.modelCode}>{prompt.p_code}</td>
                               <td className={styles.promptLabel}>{prompt.label || 'No label'}</td>
                               <td>
                                 <div className={styles.modelActions}>
                                   <Button
                                     name={`view-${prompt.p_code}`}
                                     variant="secondary"
                                     size={1}
                                     onClick={() => {
                                       setTestResults(`=== Prompt Details ===\nCode: ${prompt.p_code}\nLabel: ${prompt.label}\n\nMetadata Instructions:\n${prompt.metadata_instructions || 'No instructions available'}`);
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

                     {/* Add Prompt Button */}
                     <div className={styles.addModelButtonContainer}>
                       <Button
                         name="add-prompt"
                         variant="primary"
                         onClick={() => {
                           // TODO: Implement add prompt functionality
                           alert('Add prompt functionality coming soon!');
                         }}
                       >
                         Add New Prompt
                       </Button>
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
                       const results = `✅ API connection successful!\n\nFound ${data.models?.length || 0} models in database.\n\nAvailable models:\n${data.models?.filter((m: any) => m.is_available).map((m: any) => `- ${m.label} (${m.m_code})`).join('\n') || 'None'}`;
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
                       console.log('Schemas Response:', data);
                       
                       let results = '';
                       let title = 'Schemas Response';
                       
                       if (data && Array.isArray(data)) {
                         results = `Found ${data.length} schemas:\n\n`;
                         data.forEach((schema, index) => {
                           results += `=== Schema ${index + 1} ===\n`;
                           results += JSON.stringify(schema, null, 2);
                           results += '\n\n';
                         });
                       } else if (data && typeof data === 'object') {
                         results = `Prompts Response:\n\nResponse type: ${typeof data}\nKeys: ${Object.keys(data).join(', ')}\n\nRaw data:\n${JSON.stringify(data, null, 2)}`;
                       } else {
                         results = `Prompts Response:\n\nUnexpected data type: ${typeof data}\nValue: ${data}`;
                       }
                       
                       setTestResults(results);
                       setTestResultsTitle(title);
                       setShowTestResultsModal(true);
                     })
                     .catch((error) => {
                       console.error('Schemas Error:', error);
                       const results = `Failed to fetch prompts: ${error.message || 'Unknown error'}`;
                       setTestResults(results);
                       setTestResultsTitle('Schemas Error');
                       setShowTestResultsModal(true);
                             });
                         }}
                       >
                         View Schemas
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
                    setNewPromptData({ p_code: '', label: '', metadata_instructions: '' });
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
    </PageContainer>
  );
}
