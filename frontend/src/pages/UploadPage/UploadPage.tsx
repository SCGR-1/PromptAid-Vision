import { useState, useEffect, useRef, useCallback } from 'react';
import type { DragEvent } from 'react';
import {
  PageContainer, Heading, Button,
  SelectInput, MultiSelectInput, Container, IconButton, TextInput, TextArea, Spinner, SegmentInput,
} from '@ifrc-go/ui';
import {
  UploadCloudLineIcon,
  ArrowRightLineIcon,
  DeleteBinLineIcon,
} from '@ifrc-go/icons';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import styles from './UploadPage.module.css';

const SELECTED_MODEL_KEY = 'selectedVlmModel';

export default function UploadPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | '2a' | '2b' | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingContribution, setIsLoadingContribution] = useState(false);
  const stepRef = useRef(step);
  const uploadedImageIdRef = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [source,   setSource]   = useState('');
  const [eventType, setEventType] = useState('');
  const [epsg, setEpsg] = useState('');
  const [imageType, setImageType] = useState('crisis_map');
  const [countries, setCountries] = useState<string[]>([]);
  const [title, setTitle] = useState('');

  // Drone-specific metadata fields
  const [centerLon, setCenterLon] = useState<string>('');
  const [centerLat, setCenterLat] = useState<string>('');
  const [amslM, setAmslM] = useState<string>('');
  const [aglM, setAglM] = useState<string>('');
  const [headingDeg, setHeadingDeg] = useState<string>('');
  const [yawDeg, setYawDeg] = useState<string>('');
  const [pitchDeg, setPitchDeg] = useState<string>('');
  const [rollDeg, setRollDeg] = useState<string>('');
  const [rtkFix, setRtkFix] = useState<boolean>(false);
  const [stdHM, setStdHM] = useState<string>('');
  const [stdVM, setStdVM] = useState<string>('');

  const [sources, setSources] = useState<{s_code: string, label: string}[]>([]);
  const [types, setTypes] = useState<{t_code: string, label: string}[]>([]);
  const [spatialReferences, setSpatialReferences] = useState<{epsg: string, srid: string, proj4: string, wkt: string}[]>([]);
  const [imageTypes, setImageTypes] = useState<{image_type: string, label: string}[]>([]);
  const [countriesOptions, setCountriesOptions] = useState<{c_code: string, label: string, r_code: string}[]>([]);

  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
  
  stepRef.current = step;
  uploadedImageIdRef.current = uploadedImageId;

  const handleSourceChange = (value: string | undefined) => setSource(value || '');
  const handleEventTypeChange = (value: string | undefined) => setEventType(value || '');
  const handleEpsgChange = (value: string | undefined) => setEpsg(value || '');
  const handleImageTypeChange = (value: string | undefined) => setImageType(value || '');
  const handleCountriesChange = (value: string[] | undefined) => setCountries(Array.isArray(value) ? value : []);

  // Drone metadata handlers
  const handleCenterLonChange = (value: string | undefined) => setCenterLon(value || '');
  const handleCenterLatChange = (value: string | undefined) => setCenterLat(value || '');
  const handleAmslMChange = (value: string | undefined) => setAmslM(value || '');
  const handleAglMChange = (value: string | undefined) => setAglM(value || '');
  const handleHeadingDegChange = (value: string | undefined) => setHeadingDeg(value || '');
  const handleYawDegChange = (value: string | undefined) => setYawDeg(value || '');
  const handlePitchDegChange = (value: string | undefined) => setPitchDeg(value || '');
  const handleRollDegChange = (value: string | undefined) => setRollDeg(value || '');
  const handleRtkFixChange = (value: boolean | undefined) => setRtkFix(value || false);
  const handleStdHMChange = (value: string | undefined) => setStdHM(value || '');
  const handleStdVMChange = (value: string | undefined) => setStdVM(value || '');

  const handleStepChange = (newStep: 1 | '2a' | '2b' | 3) => setStep(newStep);

  useEffect(() => {
    Promise.all([
      fetch('/api/sources').then(r => r.json()),
      fetch('/api/types').then(r => r.json()),
      fetch('/api/spatial-references').then(r => r.json()),
      fetch('/api/image-types').then(r => r.json()),
      fetch('/api/countries').then(r => r.json()),
      fetch('/api/models').then(r => r.json())
    ]).then(([sourcesData, typesData, spatialData, imageTypesData, countriesData, modelsData]) => {
      if (!localStorage.getItem(SELECTED_MODEL_KEY) && modelsData?.length) {
        localStorage.setItem(SELECTED_MODEL_KEY, modelsData[0].m_code);
      }
      setSources(sourcesData);
      setTypes(typesData);
      setSpatialReferences(spatialData);
      setImageTypes(imageTypesData);
      setCountriesOptions(countriesData);
      
            if (sourcesData.length > 0) setSource(sourcesData[0].s_code);
      setEventType('OTHER');
      setEpsg('OTHER');
      // Only set default imageType if we don't have one from URL parameter and don't already have a default
      if (imageTypesData.length > 0 && !searchParams.get('imageType') && !imageType) {
        setImageType(imageTypesData[0].image_type);
      }
    });
  }, [searchParams]);

  const handleNavigation = useCallback((to: string) => {
    // Prevent navigation to upload/home when already on upload page
    if (to === '/upload' || to === '/') {
      return;
    }
    
    if (uploadedImageIdRef.current) {
      setPendingNavigation(to);
      setShowNavigationConfirm(true);
    } else {
      navigate(to);
    }
  }, [navigate]);

  useEffect(() => {
    window.confirmNavigationIfNeeded = (to: string) => {
      handleNavigation(to);
    };
    
    return () => {
      delete window.confirmNavigationIfNeeded;
    };
  }, [handleNavigation]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (uploadedImageIdRef.current) {
        const message = 'You have an uploaded image that will be deleted if you leave this page. Are you sure you want to leave?';
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    const handleCleanup = () => {
      if (uploadedImageIdRef.current) {
        // This is a user dissatisfaction delete (abandoning upload), so don't pass content_management=true
        fetch(`/api/images/${uploadedImageIdRef.current}`, { method: "DELETE" }).catch(console.error);
      }
    };

    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') || target.closest('[data-navigate]');
      
      if (link && uploadedImageIdRef.current) {
        const href = link.getAttribute('href') || link.getAttribute('data-navigate');
        if (href && href !== '#' && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
          event.preventDefault();
          event.stopPropagation();
          handleNavigation(href);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleGlobalClick, true);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleGlobalClick, true);
      handleCleanup();
    };
  }, [handleNavigation]);

  const [imageUrl, setImageUrl] = useState<string|null>(null);
  const [draft, setDraft] = useState('');
  
  useEffect(() => {
    const imageUrlParam = searchParams.get('imageUrl');
    const stepParam = searchParams.get('step');
    const imageIdParam = searchParams.get('imageId');
    const imageTypeParam = searchParams.get('imageType');
    
                if (imageUrlParam) {
        setImageUrl(imageUrlParam);
        
        if (stepParam === '2a' && imageIdParam) {
          setIsLoadingContribution(true);
          setUploadedImageId(imageIdParam);
          
          // Set imageType from URL parameter if available
          if (imageTypeParam) {
            console.log('Setting imageType from URL parameter:', imageTypeParam);
            setImageType(imageTypeParam);
          }
          
          fetch(`/api/images/${imageIdParam}`)
            .then(res => res.json())
            .then(data => {
              console.log('API response data.image_type:', data.image_type);
              // Only set imageType from API if we don't have it from URL parameter
              if (data.image_type && !imageTypeParam) {
                console.log('Setting imageType from API response:', data.image_type);
                setImageType(data.image_type);
              }
              
              if (data.generated) {
                // Handle both plain text and JSON responses
                try {
                  const parsedGenerated = JSON.parse(data.generated);
                  if (parsedGenerated.analysis) {
                    setDraft(parsedGenerated.analysis);
                  } else {
                    setDraft(data.generated);
                  }
                } catch (e) {
                  // Not JSON, treat as plain text
                  setDraft(data.generated);
                }
              }
              
              let extractedMetadata = data.raw_json?.extracted_metadata;
              console.log('Raw extracted_metadata:', extractedMetadata);
              
              if (!extractedMetadata && data.generated) {
                try {
                  const parsedGenerated = JSON.parse(data.generated);
                  console.log('Parsed generated field:', parsedGenerated);
                  if (parsedGenerated.metadata) {
                    extractedMetadata = parsedGenerated;
                    console.log('Using metadata from generated field');
                  }
                } catch (e) {
                  console.log('Could not parse generated field as JSON:', e);
                }
              }
              
              if (extractedMetadata) {
                const metadata = extractedMetadata.metadata || extractedMetadata;
                console.log('Final metadata to apply:', metadata);
                if (metadata.title) {
                  console.log('Setting title to:', metadata.title);
                  setTitle(metadata.title);
                }
                if (metadata.source) {
                  console.log('Setting source to:', metadata.source);
                  setSource(metadata.source);
                }
                if (metadata.type) {
                  console.log('Setting event type to:', metadata.type);
                  setEventType(metadata.type);
                }
                if (metadata.epsg) {
                  console.log('Setting EPSG to:', metadata.epsg);
                  setEpsg(metadata.epsg);
                }
                if (metadata.countries && Array.isArray(metadata.countries)) {
                  console.log('Setting countries to:', metadata.countries);
                  setCountries(metadata.countries);
                }
              } else {
                console.log('No metadata found to extract');
              }
              
              setStep('2a');
              setIsLoadingContribution(false);
            })
            .catch(console.error)
            .finally(() => setIsLoadingContribution(false));
        }
      }
  }, [searchParams]);

  // Debug useEffect to track imageType changes
  useEffect(() => {
    console.log('imageType changed to:', imageType);
  }, [imageType]);

  const resetToStep1 = () => {
    setIsPerformanceConfirmed(false);
    setStep(1);
    setFile(null);
    setPreview(null);
    setUploadedImageId(null);
    setImageUrl(null);
    setTitle('');
    setSource('');
    setEventType('');
    setEpsg('');
    setCountries([]);
    setCenterLon('');
    setCenterLat('');
    setAmslM('');
    setAglM('');
    setHeadingDeg('');
    setYawDeg('');
    setPitchDeg('');
    setRollDeg('');
    setRtkFix(false);
    setStdHM('');
    setStdVM('');
    setScores({ accuracy: 50, context: 50, usability: 50 });
    setDraft('');
    setShowFallbackNotification(false);
    setFallbackInfo(null);
    setShowPreprocessingNotification(false);
    setPreprocessingInfo(null);
    setShowPreprocessingModal(false);
    setPreprocessingFile(null);
    setIsPreprocessing(false);
    setPreprocessingProgress('');
  }; 
  const [scores, setScores] = useState({  
    accuracy: 50,
    context:  50,
    usability: 50,
  });

  const [isFullSizeModalOpen, setIsFullSizeModalOpen] = useState(false);
  const [isPerformanceConfirmed, setIsPerformanceConfirmed] = useState(false);
  const [showRatingWarning, setShowRatingWarning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNavigationConfirm, setShowNavigationConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [showFallbackNotification, setShowFallbackNotification] = useState(false);
  const [fallbackInfo, setFallbackInfo] = useState<{
    originalModel: string;
    fallbackModel: string;
    reason: string;
  } | null>(null);

  const [showPreprocessingNotification, setShowPreprocessingNotification] = useState(false);
  const [preprocessingInfo, setPreprocessingInfo] = useState<{
    original_filename: string;
    processed_filename: string;
    original_mime_type: string;
    processed_mime_type: string;
    was_preprocessed: boolean;
    error?: string;
  } | null>(null);

  // Enhanced preprocessing flow state
  const [showPreprocessingModal, setShowPreprocessingModal] = useState(false);
  const [preprocessingFile, setPreprocessingFile] = useState<File | null>(null);
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [preprocessingProgress, setPreprocessingProgress] = useState<string>('');


  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      // Use onFileChange to trigger preprocessing detection
      onFileChange(dropped);
    }
  };

  const onFileChange = (file: File | undefined) => {
    if (file) {
      console.log('File selected:', file.name, 'Type:', file.type, 'Size:', file.size);
      
      // Check if file needs preprocessing
      if (needsPreprocessing(file)) {
        console.log('File needs preprocessing, showing modal');
        setPreprocessingFile(file);
        setShowPreprocessingModal(true);
      } else {
        console.log('File does not need preprocessing, setting directly');
        setFile(file);
      }
    }
  };

  // Check if file needs preprocessing (non-JPEG/PNG)
  const needsPreprocessing = (file: File): boolean => {
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const supportedExtensions = ['.jpg', '.jpeg', '.png'];
    
    // Check MIME type first
    let needsPreprocess = !supportedTypes.includes(file.type);
    
    // If MIME type check is inconclusive, check file extension
    if (!needsPreprocess && file.name) {
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      needsPreprocess = !supportedExtensions.includes(fileExtension);
    }
    
    console.log('Preprocessing check:', {
      fileName: file.name,
      fileType: file.type,
      fileExtension: file.name ? file.name.toLowerCase().substring(file.name.lastIndexOf('.')) : 'none',
      supportedTypes,
      supportedExtensions,
      needsPreprocess
    });
    
    return needsPreprocess;
  };

  // Handle preprocessing confirmation
  const handlePreprocessingConfirm = async () => {
    if (!preprocessingFile) return;
    
    setIsPreprocessing(true);
    setPreprocessingProgress('Starting file conversion...');
    
    try {
      // Create FormData for preprocessing
      const formData = new FormData();
      formData.append('file', preprocessingFile);
      formData.append('preprocess_only', 'true'); // Flag to indicate preprocessing only
      
      setPreprocessingProgress('Converting file format...');
      
      // Call preprocessing endpoint
      const response = await fetch('/api/images/preprocess', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Preprocessing failed');
      }
      
      const result = await response.json();
      
      setPreprocessingProgress('Finalizing conversion...');
      
      // Decode base64 content
      const processedContent = atob(result.processed_content);
      const processedBytes = new Uint8Array(processedContent.length);
      for (let i = 0; i < processedContent.length; i++) {
        processedBytes[i] = processedContent.charCodeAt(i);
      }
      
      // Create a new File object from the processed data
      const processedFile = new File(
        [processedBytes], 
        result.processed_filename, 
        { type: result.processed_mime_type }
      );
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(processedFile);
      
      // Update the main file state
      setFile(processedFile);
      setPreview(previewUrl);
      
      setPreprocessingProgress('Conversion complete!');
      
      // Close modal after a brief delay
      setTimeout(() => {
        setShowPreprocessingModal(false);
        setPreprocessingFile(null);
        setIsPreprocessing(false);
        setPreprocessingProgress('');
      }, 1000);
      
    } catch (error) {
      console.error('Preprocessing error:', error);
      setPreprocessingProgress('Conversion failed. Please try again.');
      setTimeout(() => {
        setShowPreprocessingModal(false);
        setPreprocessingFile(null);
        setIsPreprocessing(false);
        setPreprocessingProgress('');
      }, 2000);
    }
  };

  // Handle preprocessing cancellation
  const handlePreprocessingCancel = () => {
    setShowPreprocessingModal(false);
    setPreprocessingFile(null);
    setIsPreprocessing(false);
    setPreprocessingProgress('');
  };

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]); 


  async function readJsonSafely(res: Response): Promise<Record<string, unknown>> {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { error: text };
    }
  }

  function handleApiError(err: unknown, operation: string) {
    const message = err instanceof Error ? err.message : `Failed to ${operation.toLowerCase()}`;
    alert(message);
  }

  async function handleGenerate() {
    if (!file) return;

    setIsLoading(true);

    const fd = new FormData();
    fd.append('file', file);
    
    if (imageType === 'drone_image') {
      fd.append('event_type', eventType || 'OTHER');
      fd.append('epsg', epsg || 'OTHER');
      // Add drone-specific metadata
      if (centerLon) fd.append('center_lon', centerLon);
      if (centerLat) fd.append('center_lat', centerLat);
      if (amslM) fd.append('amsl_m', amslM);
      if (aglM) fd.append('agl_m', aglM);
      if (headingDeg) fd.append('heading_deg', headingDeg);
      if (yawDeg) fd.append('yaw_deg', yawDeg);
      if (pitchDeg) fd.append('pitch_deg', pitchDeg);
      if (rollDeg) fd.append('roll_deg', rollDeg);
      if (rtkFix) fd.append('rtk_fix', rtkFix.toString());
      if (stdHM) fd.append('std_h_m', stdHM);
      if (stdVM) fd.append('std_v_m', stdVM);
    } else {
      fd.append('source', source || 'OTHER');
      fd.append('event_type', eventType || 'OTHER');
      fd.append('epsg', epsg || 'OTHER');
    }
    
    fd.append('image_type', imageType);
    countries.forEach((c) => fd.append('countries', c));

    const modelName = localStorage.getItem(SELECTED_MODEL_KEY);
    if (modelName) {
      fd.append('model_name', modelName);
    }

    try {
      const mapRes = await fetch('/api/images/', { method: 'POST', body: fd });
      const mapJson = await readJsonSafely(mapRes);
      if (!mapRes.ok) throw new Error((mapJson.error as string) || 'Upload failed');
      setImageUrl(mapJson.image_url as string);

      // Check for preprocessing info and show notification if needed
      if (mapJson.preprocessing_info && 
          typeof mapJson.preprocessing_info === 'object' && 
          'was_preprocessed' in mapJson.preprocessing_info && 
          mapJson.preprocessing_info.was_preprocessed === true) {
        setPreprocessingInfo(mapJson.preprocessing_info as any);
        setShowPreprocessingNotification(true);
      }

      const mapIdVal = mapJson.image_id as string;
      if (!mapIdVal) throw new Error('Upload failed: image_id not found');
      setUploadedImageId(mapIdVal);
    
      const capRes = await fetch(
        `/api/images/${mapIdVal}/caption`, 
        { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            title: title || 'Generated Caption',
            prompt: imageType === 'drone_image' ? 'DEFAULT_DRONE_IMAGE' : 'DEFAULT_CRISIS_MAP',
            ...(modelName && { model_name: modelName })
          })
        },
      );
      const capJson = await readJsonSafely(capRes);
      if (!capRes.ok) throw new Error((capJson.error as string) || 'Caption failed');
      setUploadedImageId(mapIdVal);                     

      // Check for model fallback information
      const fallbackInfo = (capJson.raw_json as Record<string, unknown>)?.fallback_info;
      if (fallbackInfo) {
        setFallbackInfo({
          originalModel: (fallbackInfo as Record<string, unknown>).original_model as string,
          fallbackModel: (fallbackInfo as Record<string, unknown>).fallback_model as string,
          reason: (fallbackInfo as Record<string, unknown>).reason as string
        });
        setShowFallbackNotification(true);
      }

      const extractedMetadata = (capJson.raw_json as Record<string, unknown>)?.extracted_metadata;
      if (extractedMetadata) {
        const metadata = (extractedMetadata as Record<string, unknown>).metadata || extractedMetadata;
        if ((metadata as Record<string, unknown>).title) setTitle((metadata as Record<string, unknown>).title as string);
        if ((metadata as Record<string, unknown>).source) setSource((metadata as Record<string, unknown>).source as string);
        if ((metadata as Record<string, unknown>).type) setEventType((metadata as Record<string, unknown>).type as string);
        if ((metadata as Record<string, unknown>).epsg) setEpsg((metadata as Record<string, unknown>).epsg as string);
        if ((metadata as Record<string, unknown>).countries && Array.isArray((metadata as Record<string, unknown>).countries)) {
          setCountries((metadata as Record<string, unknown>).countries as string[]);
        }
        // Extract drone metadata if available
        if (imageType === 'drone_image') {
          if ((metadata as Record<string, unknown>).center_lon) setCenterLon((metadata as Record<string, unknown>).center_lon as string);
          if ((metadata as Record<string, unknown>).center_lat) setCenterLat((metadata as Record<string, unknown>).center_lat as string);
          if ((metadata as Record<string, unknown>).amsl_m) setAmslM((metadata as Record<string, unknown>).amsl_m as string);
          if ((metadata as Record<string, unknown>).agl_m) setAglM((metadata as Record<string, unknown>).agl_m as string);
          if ((metadata as Record<string, unknown>).heading_deg) setHeadingDeg((metadata as Record<string, unknown>).heading_deg as string);
          if ((metadata as Record<string, unknown>).yaw_deg) setYawDeg((metadata as Record<string, unknown>).yaw_deg as string);
          if ((metadata as Record<string, unknown>).pitch_deg) setPitchDeg((metadata as Record<string, unknown>).pitch_deg as string);
          if ((metadata as Record<string, unknown>).roll_deg) setRollDeg((metadata as Record<string, unknown>).roll_deg as string);
          if ((metadata as Record<string, unknown>).rtk_fix !== undefined) setRtkFix((metadata as Record<string, unknown>).rtk_fix as boolean);
          if ((metadata as Record<string, unknown>).std_h_m) setStdHM((metadata as Record<string, unknown>).std_h_m as string);
          if ((metadata as Record<string, unknown>).std_v_m) setStdVM((metadata as Record<string, unknown>).std_v_m as string);
        }
      }

      // Handle both plain text and JSON responses
      if (capJson.generated) {
        try {
          const parsedGenerated = JSON.parse(capJson.generated as string);
          if (parsedGenerated.analysis) {
            setDraft(parsedGenerated.analysis);
          } else {
            setDraft(capJson.generated as string);
          }
        } catch (e) {
          // Not JSON, treat as plain text
          setDraft(capJson.generated as string);
        }
      }
      handleStepChange('2a');
    } catch (err) {
      handleApiError(err, 'Upload');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerateFromUrl() {
    if (!imageUrl) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/contribute/from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: imageUrl,
          source: imageType === 'drone_image' ? undefined : (source || 'OTHER'),
          event_type: eventType || 'OTHER',
          epsg: epsg || 'OTHER',
          image_type: imageType,
          countries,
          ...(imageType === 'drone_image' && {
            center_lon: centerLon || undefined,
            center_lat: centerLat || undefined,
            amsl_m: amslM || undefined,
            agl_m: aglM || undefined,
            heading_deg: headingDeg || undefined,
            yaw_deg: yawDeg || undefined,
            pitch_deg: pitchDeg || undefined,
            roll_deg: rollDeg || undefined,
            rtk_fix: rtkFix || undefined,
            std_h_m: stdHM || undefined,
            std_v_m: stdVM || undefined,
          }),
        }),
      });
      const json = await readJsonSafely(res);
      if (!res.ok) throw new Error((json.error as string) || 'Upload failed');
  
      // Check for preprocessing info and show notification if needed
      if (json.preprocessing_info && 
          typeof json.preprocessing_info === 'object' && 
          'was_preprocessed' in json.preprocessing_info && 
          json.preprocessing_info.was_preprocessed === true) {
        setPreprocessingInfo(json.preprocessing_info as any);
        setShowPreprocessingNotification(true);
      }
  
      const newId = json.image_id as string;
      setUploadedImageId(newId);
      setImageUrl(json.image_url as string);
  
      const modelName = localStorage.getItem(SELECTED_MODEL_KEY) || undefined;
      const capRes = await fetch(`/api/images/${newId}/caption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: new URLSearchParams({
            title: 'Generated Caption',
            prompt: imageType === 'drone_image' ? 'DEFAULT_DRONE_IMAGE' : 'DEFAULT_CRISIS_MAP',
            ...(modelName && { model_name: modelName }),
          }),
      });
      const capJson = await readJsonSafely(capRes);
      if (!capRes.ok) throw new Error((capJson.error as string) || 'Caption failed');
  
      // Check for model fallback information
      const fallbackInfo = (capJson.raw_json as Record<string, unknown>)?.fallback_info;
      if (fallbackInfo) {
        setFallbackInfo({
          originalModel: (fallbackInfo as Record<string, unknown>).original_model as string,
          fallbackModel: (fallbackInfo as Record<string, unknown>).fallback_model as string,
          reason: (fallbackInfo as Record<string, unknown>).reason as string
        });
        setShowFallbackNotification(true);
      }

      const extractedMetadata = (capJson.raw_json as Record<string, unknown>)?.extracted_metadata;
      if (extractedMetadata) {
        const metadata = (extractedMetadata as Record<string, unknown>).metadata || extractedMetadata;
        if ((metadata as Record<string, unknown>).title) setTitle((metadata as Record<string, unknown>).title as string);
        if ((metadata as Record<string, unknown>).source) setSource((metadata as Record<string, unknown>).source as string);
        if ((metadata as Record<string, unknown>).type) setEventType((metadata as Record<string, unknown>).type as string);
        if ((metadata as Record<string, unknown>).epsg) setEpsg((metadata as Record<string, unknown>).epsg as string);
        if ((metadata as Record<string, unknown>).countries && Array.isArray((metadata as Record<string, unknown>).countries)) {
          setCountries((metadata as Record<string, unknown>).countries as string[]);
        }
        // Extract drone metadata if available
        if (imageType === 'drone_image') {
          if ((metadata as Record<string, unknown>).center_lon) setCenterLon((metadata as Record<string, unknown>).center_lon as string);
          if ((metadata as Record<string, unknown>).center_lat) setCenterLat((metadata as Record<string, unknown>).center_lat as string);
          if ((metadata as Record<string, unknown>).amsl_m) setAmslM((metadata as Record<string, unknown>).amsl_m as string);
          if ((metadata as Record<string, unknown>).agl_m) setAglM((metadata as Record<string, unknown>).agl_m as string);
          if ((metadata as Record<string, unknown>).heading_deg) setHeadingDeg((metadata as Record<string, unknown>).heading_deg as string);
          if ((metadata as Record<string, unknown>).yaw_deg) setYawDeg((metadata as Record<string, unknown>).yaw_deg as string);
          if ((metadata as Record<string, unknown>).pitch_deg) setPitchDeg((metadata as Record<string, unknown>).pitch_deg as string);
          if ((metadata as Record<string, unknown>).roll_deg) setRollDeg((metadata as Record<string, unknown>).roll_deg as string);
          if ((metadata as Record<string, unknown>).rtk_fix !== undefined) setRtkFix((metadata as Record<string, unknown>).rtk_fix as boolean);
          if ((metadata as Record<string, unknown>).std_h_m) setStdHM((metadata as Record<string, unknown>).std_h_m as string);
          if ((metadata as Record<string, unknown>).std_v_m) setStdVM((metadata as Record<string, unknown>).std_v_m as string);
        }
      }

      // Handle both plain text and JSON responses
      if (capJson.generated) {
        try {
          const parsedGenerated = JSON.parse(capJson.generated as string);
          if (parsedGenerated.analysis) {
            setDraft(parsedGenerated.analysis);
          } else {
            setDraft(capJson.generated as string);
          }
        } catch (e) {
          // Not JSON, treat as plain text
          setDraft(capJson.generated as string);
        }
      }
      handleStepChange('2a');
    } catch (err) {
      handleApiError(err, 'Upload');
    } finally {
      setIsLoading(false);
    }
  }
  

  async function handleSubmit() {
    console.log('handleSubmit called with:', { uploadedImageId, title, draft });
    if (!uploadedImageId) return alert("No image to submit");
    
    if (!isPerformanceConfirmed) {
      setShowRatingWarning(true);
      return;
    }
    
    try {
      const metadataBody = {
        source: imageType === 'drone_image' ? undefined : (source || 'OTHER'),
        event_type: eventType || 'OTHER',
        epsg: epsg || 'OTHER',
        image_type: imageType,
        countries: countries,
      };
      console.log('Updating metadata:', metadataBody);
      const metadataRes = await fetch(`/api/images/${uploadedImageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadataBody),
      });
      const metadataJson = await readJsonSafely(metadataRes);
      if (!metadataRes.ok) throw new Error((metadataJson.error as string) || "Metadata update failed");
      
      const captionBody = {
        title: title,
        edited: draft || '',
        accuracy: scores.accuracy,
        context: scores.context,
        usability: scores.usability,
      };
      console.log('Updating caption:', captionBody);
      const captionRes = await fetch(`/api/images/${uploadedImageId}/caption`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(captionBody),
      });
      const captionJson = await readJsonSafely(captionRes);
      if (!captionRes.ok) throw new Error((captionJson.error as string) || "Caption update failed");
      
      setUploadedImageId(null);
      handleStepChange(3);
    } catch (err) {
      handleApiError(err, 'Submit');
    }
  }

  async function handleDelete() {
    console.log('handleDelete called with uploadedImageId:', uploadedImageId);
    if (!uploadedImageId) {
      alert('No image to delete. Please try refreshing the page.');
      return;
    }
    
    setShowDeleteConfirm(true);
  }

  async function confirmDelete() {
    try {
      console.log('Deleting image with ID:', uploadedImageId);
      const res = await fetch(`/api/images/${uploadedImageId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const json = await readJsonSafely(res);
        throw new Error((json.error as string) || `Delete failed with status ${res.status}`);
      }
      
      setShowDeleteConfirm(false);
      if (searchParams.get('isContribution') === 'true') {
        navigate('/explore');
      } else {
        resetToStep1();
      }
    } catch (err) {
      handleApiError(err, 'Delete');
    }
  }

  async function confirmNavigation() {
    if (pendingNavigation && uploadedImageIdRef.current) {
      try {
        await fetch(`/api/images/${uploadedImageIdRef.current}`, { method: "DELETE" });
        setShowNavigationConfirm(false);
        setPendingNavigation(null);
        navigate(pendingNavigation);
      } catch (error) {
        console.error('Failed to delete image before navigation:', error);
        setShowNavigationConfirm(false);
        setPendingNavigation(null);
        navigate(pendingNavigation);
      }
    }
  }



  return (
    <PageContainer>
      {step !== 3 && (
        <div className="max-w-7xl mx-auto">
          <div className={styles.uploadContainer} data-step={step}>
          {/* Drop-zone */}
          {step === 1 && !searchParams.get('step') && (
            <div className="space-y-6">
              <p className="text-gray-700 leading-relaxed max-w-2xl mx-auto">
                This app evaluates how well multimodal AI models analyze and describe
                crisis maps and drone imagery. Upload any file format (PDF, TIFF, HEIC, etc.) 
                and we'll automatically convert it for you. Let the AI generate a description, 
                then review and rate the result based on your expertise.
              </p>
              
              {/* "More »" link  */}
              <div className={styles.helpLink}>
                <Link
                  to="/help"
                  className={styles.helpLink}
                >
                  More <ArrowRightLineIcon className="w-3 h-3" />
                </Link>
              </div>
              
              {/* Image Type Selection */}
              <div className="flex justify-center">
                <Container withInternalPadding className="bg-transparent border-none shadow-none">
                  <SegmentInput
                    name="image-type"
                    value={imageType}
                    onChange={(value) => handleImageTypeChange(value as string)}
                    options={[
                      { key: 'crisis_map', label: 'Crisis Maps' },
                      { key: 'drone_image', label: 'Drone Imagery' }
                    ]}
                    keySelector={(o) => o.key}
                    labelSelector={(o) => o.label}
                  />
                </Container>
              </div>
              
              <div
                className={`${styles.dropZone} ${file ? styles.hasFile : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
              >
                {file && preview ? (
                  <div className={styles.filePreview}>
                    <div className={styles.filePreviewImage}>
                      <img
                        src={preview}
                        alt="File preview"
                      />
                    </div>
                    <p className={styles.fileName}>
                      {file.name}
                    </p>
                    <p className={styles.fileInfo}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <>
                    <UploadCloudLineIcon className={styles.dropZoneIcon} />
                    <p className={styles.dropZoneText}>Drag &amp; Drop any file here</p>
                    <p className={styles.dropZoneSubtext}>or</p>
                  </>
                )}
              
              {/* File-picker button - always visible */}
              <label className="inline-block cursor-pointer">
                <input
                  type="file"
                  className="sr-only"
                  onChange={e => onFileChange(e.target.files?.[0])}
                />
                <Button 
                  name="upload" 
                  variant="secondary"
                  size={1}
                  onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                >
                  {file ? 'Change File' : 'Browse Files'}
                </Button>
              </label>
              </div>
            </div>
          )}

        {/* Loading state */}
        {isLoading && (
          <div className={styles.loadingContainer}>
            <Spinner className="text-ifrcRed" />
                                <p className={styles.loadingText}>Generating...</p>
          </div>
        )}

        {/* Loading contribution data */}
        {isLoadingContribution && (
          <div className={styles.loadingContainer}>
            <Spinner className="text-ifrcRed" />
            <p className={styles.loadingText}>Loading contribution...</p>
          </div>
        )}

        {/* Generate button */}
        {step === 1 && !isLoading && (
          <div className={styles.generateButtonContainer}>
            {imageUrl ? (
              <Button
                name="generate-from-url"
                onClick={handleGenerateFromUrl}
              >
                Generate Caption
              </Button>
            ) : (
              <Button
                name="generate"
                disabled={!file}
                onClick={handleGenerate}
              >
                Generate
              </Button>
            )}
          </div>
        )}

        {step === '2a' && (
          <div className={styles.step2Layout}>
            {/* Left Column - Map */}
            <div className={styles.mapColumn}>
              <Container heading="Uploaded Image" headingLevel={3} withHeaderBorder withInternalPadding>
                <div className={styles.uploadedMapContainer}>
                  <div className={styles.uploadedMapImage}>
                    <img
                      src={imageUrl || preview || undefined}
                      alt="Uploaded image preview"
                    />
                  </div>
                  <div className={styles.viewFullSizeButton}>
                    <Button
                      name="view-full-size"
                      variant="secondary"
                      size={1}
                      onClick={() => setIsFullSizeModalOpen(true)}
                    >
                      View Image
                    </Button>
                  </div>
                </div>
              </Container>
            </div>

            {/* Right Column - Metadata Form */}
            <div className={styles.contentColumn}>
              <div className={styles.metadataSectionCard}>
                <Container
                  heading="Confirm image details"
                  headingLevel={3}
                  withHeaderBorder
                  withInternalPadding
                >
                  <div className={styles.formGrid}>
                    <div className={styles.titleField}>
                      <TextInput
                        label="Title"
                        name="title"
                        value={title}
                        onChange={(value) => setTitle(value || '')}
                        placeholder="Enter a title for this map..."
                        required
                      />
                    </div>
                                         {imageType !== 'drone_image' && (
                       <SelectInput
                         label="Source"
                         name="source"
                         value={source}
                         onChange={handleSourceChange}
                         options={sources}
                         keySelector={(o) => o.s_code}
                         labelSelector={(o) => o.label}
                         required
                       />
                     )}
                    <SelectInput
                      label="Event Type"
                      name="event_type"
                      value={eventType}
                      onChange={handleEventTypeChange}
                      options={types}
                      keySelector={(o) => o.t_code}
                      labelSelector={(o) => o.label}
                      required={imageType !== 'drone_image'}
                    />
                    <SelectInput
                      label="EPSG"
                      name="epsg"
                      value={epsg}
                      onChange={handleEpsgChange}
                      options={spatialReferences}
                      keySelector={(o) => o.epsg}
                      labelSelector={(o) => `${o.srid} (EPSG:${o.epsg})`}
                      placeholder="EPSG"
                      required={imageType !== 'drone_image'}
                    />
                    <SelectInput
                      label="Image Type"
                      name="image_type"
                      value={imageType}
                      onChange={handleImageTypeChange}
                      options={imageTypes}
                      keySelector={(o) => o.image_type}
                      labelSelector={(o) => o.label}
                      required
                    />
                    <MultiSelectInput
                      label="Countries (optional)"
                      name="countries"
                      value={countries}
                      onChange={handleCountriesChange}
                      options={countriesOptions}
                      keySelector={(o) => o.c_code}
                      labelSelector={(o) => o.label}
                      placeholder="Select one or more"
                    />
                    
                    {/* Drone-specific metadata fields */}
                    {imageType === 'drone_image' && (
                      <>
                        <div className={styles.droneMetadataSection}>
                          <h4 className={styles.droneMetadataHeading}>Drone Flight Data</h4>
                          <div className={styles.droneMetadataGrid}>
                            <TextInput
                              label="Center Longitude"
                              name="center_lon"
                              value={centerLon}
                              onChange={handleCenterLonChange}
                              placeholder="e.g., -122.4194"
                              step="any"
                            />
                            <TextInput
                              label="Center Latitude"
                              name="center_lat"
                              value={centerLat}
                              onChange={handleCenterLatChange}
                              placeholder="e.g., 37.7749"
                              step="any"
                            />
                            <TextInput
                              label="Altitude AMSL (m)"
                              name="amsl_m"
                              value={amslM}
                              onChange={handleAmslMChange}
                              placeholder="e.g., 100.5"
                              step="any"
                            />
                            <TextInput
                              label="Altitude AGL (m)"
                              name="agl_m"
                              value={aglM}
                              onChange={handleAglMChange}
                              placeholder="e.g., 50.2"
                              step="any"
                            />
                            <TextInput
                              label="Heading (degrees)"
                              name="heading_deg"
                              value={headingDeg}
                              onChange={handleHeadingDegChange}
                              placeholder="e.g., 180.0"
                              step="any"
                            />
                            <TextInput
                              label="Yaw (degrees)"
                              name="yaw_deg"
                              value={yawDeg}
                              onChange={handleYawDegChange}
                              placeholder="e.g., 90.0"
                              step="any"
                            />
                            <TextInput
                              label="Pitch (degrees)"
                              name="pitch_deg"
                              value={pitchDeg}
                              onChange={handlePitchDegChange}
                              placeholder="e.g., 0.0"
                              step="any"
                            />
                            <TextInput
                              label="Roll (degrees)"
                              name="roll_deg"
                              value={rollDeg}
                              onChange={handleRollDegChange}
                              placeholder="e.g., 0.0"
                              step="any"
                            />
                            <div className={styles.rtkFixContainer}>
                              <label className={styles.rtkFixLabel}>
                                <input
                                  type="checkbox"
                                  checked={rtkFix}
                                  onChange={(e) => handleRtkFixChange(e.target.checked)}
                                  className={styles.rtkFixCheckbox}
                                />
                                RTK Fix Available
                              </label>
                            </div>
                            <TextInput
                              label="Horizontal Std Dev (m)"
                              name="std_h_m"
                              value={stdHM}
                              onChange={handleStdHMChange}
                              placeholder="e.g., 0.1"
                              step="any"
                            />
                            <TextInput
                              label="Vertical Std Dev (m)"
                              name="std_v_m"
                              value={stdVM}
                              onChange={handleStdVMChange}
                              placeholder="e.g., 0.2"
                              step="any"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className={styles.confirmSection}>
                    <IconButton
                      name="delete"
                      variant="tertiary"
                      onClick={handleDelete}
                      title="Delete"
                      ariaLabel="Delete uploaded image"
                    >
                      <DeleteBinLineIcon />
                    </IconButton>
                    <Button
                      name="confirm-metadata"
                      onClick={async () => {
                        if (imageUrl && !uploadedImageId) {
                          await handleGenerateFromUrl();
                        } else if (imageUrl && !file) {
                          handleStepChange('2b');
                        } else {
                          handleStepChange('2b');
                        }
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </Container>
              </div>
            </div>
          </div>
        )}

        {step === '2b' && (
          <div className={styles.step2Layout}>
            {/* Left Column - Map */}
            <div className={styles.mapColumn}>
              <Container heading="Uploaded Image" headingLevel={3} withHeaderBorder withInternalPadding>
                <div className={styles.uploadedMapContainer}>
                  <div className={styles.uploadedMapImage}>
                    <img
                      src={imageUrl || preview || undefined}
                      alt="Uploaded image preview"
                    />
                  </div>
                  <div className={styles.viewFullSizeButton}>
                    <Button
                      name="view-full-size"
                      variant="secondary"
                      size={1}
                      onClick={() => setIsFullSizeModalOpen(true)}
                    >
                      View Image
                    </Button>
                  </div>
                </div>
              </Container>
            </div>

            {/* Right Column - Content */}
            <div className={styles.contentColumn}>
              {/* ────── RATING SLIDERS ────── */}
              <div className={styles.metadataSectionCard}>
                <Container
                  heading="AI Performance Rating"
                  headingLevel={3}
                  withHeaderBorder
                  withInternalPadding
                >
                  <div className={styles.ratingSection}>
                    {!isPerformanceConfirmed && (
                      <>
                        <p className={styles.ratingDescription}>How well did the AI perform on the task?</p>
                        {(['accuracy', 'context', 'usability'] as const).map((k) => (
                          <div key={k} className={styles.ratingSlider}>
                            <label className={styles.ratingLabel}>{k}</label>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={scores[k]}
                              onChange={(e) =>
                                setScores((s) => ({ ...s, [k]: Number(e.target.value) }))
                              }
                              className={styles.ratingInput}
                            />
                            <span className={styles.ratingValue}>{scores[k]}</span>
                          </div>
                        ))}
                        <div className={styles.confirmButtonContainer}>
                          <Button
                            name="confirm-ratings"
                            variant="secondary"
                            onClick={() => setIsPerformanceConfirmed(true)}
                          >
                            Confirm Ratings
                          </Button>
                        </div>
                      </>
                    )}
                    {isPerformanceConfirmed && (
                      <div className={styles.confirmButtonContainer}>
                        <Button
                          name="edit-ratings"
                          variant="secondary"
                          onClick={() => setIsPerformanceConfirmed(false)}
                        >
                          Edit Ratings
                        </Button>
                      </div>
                    )}
                  </div>
                </Container>
              </div>

              {/* ────── AI‑GENERATED CAPTION ────── */}
              <div className={styles.metadataSectionCard}>
                <Container
                  heading="Generated Text"
                  headingLevel={3}
                  withHeaderBorder
                  withInternalPadding
                >
                  <div className="text-left">
                    <TextArea
                      name="caption"
                      value={draft}
                      onChange={(value) => setDraft(value || '')}
                      rows={10}
                      placeholder="AI-generated caption will appear here..."
                    />
                  </div>
                  
                  {/* ────── SUBMIT BUTTONS ────── */}
                  <div className={styles.submitSection}>
                    <Button
                      name="back"
                      variant="secondary"
                      onClick={() => handleStepChange('2a')}
                    >
                      Back
                    </Button>
                    <IconButton
                      name="delete"
                      variant="tertiary"
                      onClick={handleDelete}
                      title="Delete"
                      ariaLabel="Delete uploaded image"
                    >
                      <DeleteBinLineIcon />
                    </IconButton>
                    <Button
                      name="submit"
                      onClick={handleSubmit}
                    >
                      Submit
                    </Button>
                  </div>
                </Container>
              </div>
            </div>
          </div>
        )}

        {/* Full Size Image Modal */}
        {isFullSizeModalOpen && (
          <div className={styles.fullSizeModalOverlay} onClick={() => setIsFullSizeModalOpen(false)}>
            <div className={styles.fullSizeModalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.fullSizeModalHeader}>
                <Button
                  name="close-modal"
                  variant="tertiary"
                  size={1}
                  onClick={() => setIsFullSizeModalOpen(false)}
                >
                  ✕
                </Button>
              </div>
              <div className={styles.fullSizeModalImage}>
                <img
                  src={imageUrl || preview || undefined}
                  alt="Full size map"
                />
              </div>
            </div>
          </div>
        )}

        {/* Rating Confirmation Warning Modal */}
        {showRatingWarning && (
          <div className={styles.fullSizeModalOverlay} onClick={() => setShowRatingWarning(false)}>
            <div className={styles.fullSizeModalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.ratingWarningContent}>
                <h3 className={styles.ratingWarningTitle}>Please Confirm Your Ratings</h3>
                <p className={styles.ratingWarningText}>
                  You must confirm your performance ratings before submitting. Please go back to the rating section and click "Confirm Ratings".
                </p>
                <div className={styles.ratingWarningButtons}>
                  <Button
                    name="close-warning"
                    variant="secondary"
                    onClick={() => setShowRatingWarning(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className={styles.fullSizeModalOverlay} onClick={() => setShowDeleteConfirm(false)}>
            <div className={styles.fullSizeModalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.ratingWarningContent}>
                <h3 className={styles.ratingWarningTitle}>Delete Image?</h3>
                <p className={styles.ratingWarningText}>
                  This action cannot be undone. Are you sure you want to delete this uploaded image?
                </p>
                <div className={styles.ratingWarningButtons}>
                  <Button
                    name="confirm-delete"
                    variant="secondary"
                    onClick={confirmDelete}
                  >
                    Delete
                  </Button>
                  <Button
                    name="cancel-delete"
                    variant="tertiary"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Confirmation Modal */}
        {showNavigationConfirm && (
          <div className={styles.fullSizeModalOverlay} onClick={() => setShowNavigationConfirm(false)}>
            <div className={styles.fullSizeModalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.ratingWarningContent}>
                <h3 className={styles.ratingWarningTitle}>Leave Page?</h3>
                <p className={styles.ratingWarningText}>
                  Your uploaded image will be deleted if you leave this page. Are you sure you want to continue?
                </p>
                <div className={styles.ratingWarningButtons}>
                  <Button
                    name="confirm-navigation"
                    variant="secondary"
                    onClick={confirmNavigation}
                  >
                    Leave Page
                  </Button>
                  <Button
                    name="cancel-navigation"
                    variant="tertiary"
                    onClick={() => setShowNavigationConfirm(false)}
                  >
                    Stay
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Model Fallback Notification Modal */}
        {showFallbackNotification && fallbackInfo && (
          <div className={styles.fullSizeModalOverlay} onClick={() => setShowFallbackNotification(false)}>
            <div className={styles.fullSizeModalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.ratingWarningContent}>
                <h3 className={styles.ratingWarningTitle}>Model Changed</h3>
                <p className={styles.ratingWarningText}>
                  {fallbackInfo.originalModel} is currently unavailable. 
                  We've automatically switched to {fallbackInfo.fallbackModel} to complete your request.
                </p>
                <div className={styles.ratingWarningButtons}>
                  <Button
                    name="close-fallback"
                    variant="secondary"
                    onClick={() => setShowFallbackNotification(false)}
                  >
                    Got it
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image Preprocessing Notification Modal */}
        {showPreprocessingNotification && preprocessingInfo && (
          <div className={styles.fullSizeModalOverlay} onClick={() => setShowPreprocessingNotification(false)}>
            <div className={styles.fullSizeModalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.ratingWarningContent}>
                <h3 className={styles.ratingWarningTitle}>File Converted</h3>
                <p className={styles.ratingWarningText}>
                  Your file <strong>{preprocessingInfo.original_filename}</strong> has been converted from 
                  <strong> {preprocessingInfo.original_mime_type}</strong> to 
                  <strong> {preprocessingInfo.processed_mime_type}</strong> for optimal processing.
                  <br /><br />
                  This conversion ensures your file is in the best format for our AI models to analyze.
                </p>
                <div className={styles.ratingWarningButtons}>
                  <Button
                    name="close-preprocessing"
                    variant="secondary"
                    onClick={() => setShowPreprocessingNotification(false)}
                  >
                    Got it
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preprocessing Modal */}
        {showPreprocessingModal && (
          <div className={styles.fullSizeModalOverlay} onClick={handlePreprocessingCancel}>
            <div className={styles.fullSizeModalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.ratingWarningContent}>
                <h3 className={styles.ratingWarningTitle}>File Conversion Required</h3>
                <p className={styles.ratingWarningText}>
                  The file you selected will be converted to a web-compatible format (PNG or JPEG).
                  This ensures optimal compatibility and processing by our AI models.
                </p>
                <div className={styles.ratingWarningButtons}>
                  <Button
                    name="confirm-preprocessing"
                    variant="secondary"
                    onClick={handlePreprocessingConfirm}
                  >
                    Convert File
                  </Button>
                  <Button
                    name="cancel-preprocessing"
                    variant="tertiary"
                    onClick={handlePreprocessingCancel}
                  >
                    Cancel
                  </Button>
                </div>
                {isPreprocessing && (
                  <div className={styles.preprocessingProgress}>
                    <p>{preprocessingProgress}</p>
                    <Spinner className="text-ifrcRed" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        </div>
        </div>
      )}

      {/* Success page - outside the upload container */}
      {step === 3 && (
        <div className={styles.successContainer}>
          <Heading level={2} className={styles.successHeading}>Saved!</Heading>
          <p className={styles.successText}>Your caption has been successfully saved.</p>
          <div className={styles.successButton}>
            <Button
              name="upload-another"
              onClick={resetToStep1}
            >
              Upload Another
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
