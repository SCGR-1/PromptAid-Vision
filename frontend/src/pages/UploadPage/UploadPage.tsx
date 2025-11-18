import { useState, useEffect, useRef, useCallback } from 'react';
import { PageContainer, Heading, Button, Spinner, IconButton } from '@ifrc-go/ui';
import { DeleteBinLineIcon} from '@ifrc-go/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import styles from './UploadPage.module.css';
import {
  FileUploadSection,
  ImagePreviewSection,
  MetadataFormSection,
  RatingSection,
  GeneratedTextSection,
  FullSizeImageModal,
  RatingWarningModal,
  DeleteConfirmModal,
  NavigationConfirmModal,
  FallbackNotificationModal,
  PreprocessingNotificationModal,
  PreprocessingModal,
  UnsupportedFormatModal,
  FileSizeWarningModal,

} from '../../components';

const SELECTED_MODEL_KEY = 'selectedVlmModel';

export default function UploadPage() {
  // Safely get search params with fallback
  let searchParams: URLSearchParams;
  let navigate: any;
  
  try {
    [searchParams] = useSearchParams();
    navigate = useNavigate();
  } catch (error) {
    console.warn('Router context not available, using fallback:', error);
    searchParams = new URLSearchParams();
    navigate = () => {};
  }
  
  const [step, setStep] = useState<1 | '2a' | '2b' | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingContribution, setIsLoadingContribution] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const stepRef = useRef(step);
  const uploadedImageIdRef = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [source, setSource] = useState('');
  const [eventType, setEventType] = useState('');
  const [epsg, setEpsg] = useState('');
  const [imageType, setImageType] = useState('crisis_map');
  const [countries, setCountries] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [isManualMode, setIsManualMode] = useState(true);

  // Drone metadata fields
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

  // Multi-image metadata arrays
  const [metadataArray, setMetadataArray] = useState<Array<{
    source: string;
    eventType: string;
    epsg: string;
    countries: string[];
    centerLon: string;
    centerLat: string;
    amslM: string;
    aglM: string;
    headingDeg: string;
    yawDeg: string;
    pitchDeg: string;
    rollDeg: string;
    rtkFix: boolean;
    stdHM: string;
    stdVM: string;
  }>>([]);

  const [sources, setSources] = useState<{s_code: string, label: string}[]>([]);
  const [types, setTypes] = useState<{t_code: string, label: string}[]>([]);
  const [spatialReferences, setSpatialReferences] = useState<{epsg: string, srid: string, proj4: string, wkt: string}[]>([]);
  const [imageTypes, setImageTypes] = useState<{image_type: string, label: string}[]>([]);
  const [countriesOptions, setCountriesOptions] = useState<{c_code: string, label: string, r_code: string}[]>([]);

  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
   const [uploadedImageIds, setUploadedImageIds] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string|null>(null);
  const [draft, setDraft] = useState('');
  const [description, setDescription] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [recommendedActions, setRecommendedActions] = useState('');
  const [scores, setScores] = useState({ accuracy: 50, context: 50, usability: 50 });

  // Modal states
  const [isFullSizeModalOpen, setIsFullSizeModalOpen] = useState(false);
  const [selectedImageData, setSelectedImageData] = useState<{ file: File; index: number } | null>(null);
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
  const [showPreprocessingModal, setShowPreprocessingModal] = useState(false);
  const [preprocessingFile, setPreprocessingFile] = useState<File | null>(null);
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [preprocessingProgress, setPreprocessingProgress] = useState<string>('');
  const [showUnsupportedFormatModal, setShowUnsupportedFormatModal] = useState(false);
  const [unsupportedFile, setUnsupportedFile] = useState<File | null>(null);
  const [showFileSizeWarningModal, setShowFileSizeWarningModal] = useState(false);
  const [oversizedFile, setOversizedFile] = useState<File | null>(null);

  // Carousel state for multi-upload in step 2b
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  stepRef.current = step;
  uploadedImageIdRef.current = uploadedImageId;

  // Helper function to convert source label to code
  const convertSourceToCode = (sourceValue: string): string => {
    if (!sourceValue || sources.length === 0) return sourceValue;
    
    // Find matching source by code or label
    const sourceObj = sources.find(s => s.s_code === sourceValue || s.label === sourceValue);
    return sourceObj?.s_code || sourceValue;
  };

  // Event handlers
  const handleSourceChange = (value: string | undefined) => {
    setSource(convertSourceToCode(value || ''));
  };
  const handleEventTypeChange = (value: string | undefined) => setEventType(value || '');
  const handleEpsgChange = (value: string | undefined) => setEpsg(value || '');
  const handleImageTypeChange = (value: string | undefined) => setImageType(value || '');
  const handleCountriesChange = (value: string[] | undefined) => setCountries(Array.isArray(value) ? value : []);
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

  // Carousel navigation functions for step 2b
  const goToPrevious = useCallback(() => {
    if (files.length > 1) {
      setCurrentImageIndex((prev: number) => (prev > 0 ? prev - 1 : files.length - 1));
    }
  }, [files.length]);

  const goToNext = useCallback(() => {
    if (files.length > 1) {
      setCurrentImageIndex((prev: number) => (prev < files.length - 1 ? prev + 1 : 0));
    }
  }, [files.length]);

  const goToImage = useCallback((index: number) => {
    if (index >= 0 && index < files.length) {
      setCurrentImageIndex(index);
    }
  }, [files.length]);

  // Multi-image functions
  const addImage = () => {
    if (files.length < 5) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.jpg,.jpeg,.png,.tiff,.tif,.heic,.heif,.webp,.gif,.pdf';
      input.onchange = (e) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files[0]) {
          const newFile = target.files[0];
          onFileChange(newFile);
        }
      };
      input.click();
    }
  };

  const removeImage = (index: number) => {
    setFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      // If we're back to single file, update the single file state
      if (newFiles.length === 1) {
        setFile(newFiles[0]);
      } else if (newFiles.length === 0) {
        setFile(null);
      }
      return newFiles;
    });
    setMetadataArray(prev => prev.filter((_, i) => i !== index));
  };

  const updateMetadataForImage = (index: number, field: string, value: any) => {
    setMetadataArray(prev => {
      const newArray = [...prev];
      if (!newArray[index]) {
        newArray[index] = {
          source: '', eventType: '', epsg: '', countries: [],
          centerLon: '', centerLat: '', amslM: '', aglM: '',
          headingDeg: '', yawDeg: '', pitchDeg: '', rollDeg: '',
          rtkFix: false, stdHM: '', stdVM: ''
        };
      }
      
      if (field === 'source') {
        newArray[index] = { ...newArray[index], [field]: convertSourceToCode(value) };
      } else {
        newArray[index] = { ...newArray[index], [field]: value };
      }
      
      return newArray;
    });
  };

  // File handling functions
  const needsPreprocessing = (file: File): boolean => {
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const supportedExtensions = ['.jpg', '.jpeg', '.png'];
    
    let needsPreprocess = !supportedTypes.includes(file.type);
    
    if (!needsPreprocess && file.name) {
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      needsPreprocess = !supportedExtensions.includes(fileExtension);
    }
    
    return needsPreprocess;
  };

  const isCompletelyUnsupported = (file: File): boolean => {
    const completelyUnsupportedTypes = [
      'text/html', 'text/css', 'application/javascript', 'application/json',
      'text/plain', 'application/xml', 'text/xml', 'application/zip',
      'application/x-zip-compressed', 'application/x-rar-compressed',
      'application/x-7z-compressed', 'audio/', 'video/', 'text/csv',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    for (const unsupportedType of completelyUnsupportedTypes) {
      if (file.type.startsWith(unsupportedType)) {
        return true;
      }
    }
    
    if (file.name) {
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      const unsupportedExtensions = [
        '.html', '.htm', '.css', '.js', '.json', '.txt', '.xml',
        '.zip', '.rar', '.7z', '.csv', '.xlsx', '.xls', '.pptx',
        '.ppt', '.docx', '.doc', '.mp3', '.mp4', '.avi', '.mov'
      ];
      
      if (unsupportedExtensions.includes(fileExtension)) {
        return true;
      }
    }
    
    return false;
  };

  const onFileChange = (file: File | undefined) => {
    if (file) {
      console.log('File selected:', file.name, 'Type:', file.type, 'Size:', file.size);
      
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 5) {
        console.log('File too large, showing size warning modal');
        setOversizedFile(file);
        setShowFileSizeWarningModal(true);
      }
      
      if (isCompletelyUnsupported(file)) {
        console.log('File format not supported at all, showing unsupported format modal');
        setUnsupportedFile(file);
        setShowUnsupportedFormatModal(true);
            return;
          }

      if (needsPreprocessing(file)) {
        console.log('File needs preprocessing, showing modal');
        setPreprocessingFile(file);
        setShowPreprocessingModal(true);
            } else {
        console.log('File does not need preprocessing, setting directly');
        // If this is the first file, set it as the single file
        if (files.length === 0) {
          setFile(file);
          setFiles([file]);
        } else {
          // If files already exist, add to the array (multi-upload mode)
          setFiles(prev => [...prev, file]);
        }
      }
    }
  };

  const onChangeFile = (file: File | undefined) => {
    if (file) {
      console.log('File changed:', file.name, 'Type:', file.type, 'Size:', file.size);
      
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 5) {
        console.log('File too large, showing size warning modal');
        setOversizedFile(file);
        setShowFileSizeWarningModal(true);
      }
      
      if (isCompletelyUnsupported(file)) {
        console.log('File format not supported at all, showing unsupported format modal');
        setUnsupportedFile(file);
        setShowUnsupportedFormatModal(true);
            return;
          }

      if (needsPreprocessing(file)) {
        console.log('File needs preprocessing, showing modal');
        setPreprocessingFile(file);
        setShowPreprocessingModal(true);
            } else {
        console.log('File does not need preprocessing, replacing last file');
        // Replace only the last file in the array
        if (files.length > 1) {
          setFiles(prev => {
            const newFiles = [...prev];
            newFiles[newFiles.length - 1] = file;
            return newFiles;
          });
          // Update single file state if it's a single upload
          if (files.length === 1) {
            setFile(file);
          }
        } else {
          // If only one file, replace it normally
          setFile(file);
          setFiles([file]);
        }
      }
    }
  };

  // API functions
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
     if (files.length === 0) return;

    setIsLoading(true);
    
     try {
       if (files.length === 1) {
         await handleSingleUpload();
       } else {
         await handleMultiUpload();
       }
     } catch (err) {
       handleApiError(err, 'Upload');
     } finally {
       setIsLoading(false);
     }
   }

   async function handleSingleUpload() {
     console.log('DEBUG: Starting single image upload');

    const fd = new FormData();
     fd.append('file', files[0]);
     fd.append('title', title);
     fd.append('image_type', imageType);
     
     // Add metadata for single image
     if (source) fd.append('source', source);
     if (eventType) fd.append('event_type', eventType);
     if (epsg) fd.append('epsg', epsg);
     if (countries.length > 0) {
       countries.forEach(c => fd.append('countries', c));
     }
    if (imageType === 'drone_image') {
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
     }

     // Use manual mode if selected, otherwise use the selected model from localStorage
     if (isManualMode) {
       fd.append('model_name', 'manual');
     } else {
       const modelName = localStorage.getItem(SELECTED_MODEL_KEY);
       if (modelName) {
         fd.append('model_name', modelName);
       }
     }

     const mapRes = await fetch('/api/images/', { method: 'POST', body: fd });
     const mapJson = await readJsonSafely(mapRes);
     if (!mapRes.ok) throw new Error((mapJson.error as string) || 'Upload failed');
     console.log('DEBUG: Single upload response:', mapJson);

     await processUploadResponse(mapJson, false);
   }

   async function handleMultiUpload() {
     console.log('DEBUG: Starting multi-image upload');
     
     const fd = new FormData();
     files.forEach(file => fd.append('files', file));
     fd.append('title', title);
    fd.append('image_type', imageType);
     
     // Add metadata for each image
     metadataArray.forEach((metadata, index) => {
       if (metadata.source) fd.append(`source_${index}`, metadata.source);
       if (metadata.eventType) fd.append(`event_type_${index}`, metadata.eventType);
       if (metadata.epsg) fd.append(`epsg_${index}`, metadata.epsg);
       if (metadata.countries.length > 0) {
         metadata.countries.forEach(c => fd.append(`countries_${index}`, c));
       }
       if (imageType === 'drone_image') {
         if (metadata.centerLon) fd.append(`center_lon_${index}`, metadata.centerLon);
         if (metadata.centerLat) fd.append(`center_lat_${index}`, metadata.centerLat);
         if (metadata.amslM) fd.append(`amsl_m_${index}`, metadata.amslM);
         if (metadata.aglM) fd.append(`agl_m_${index}`, metadata.aglM);
         if (metadata.headingDeg) fd.append(`heading_deg_${index}`, metadata.headingDeg);
         if (metadata.yawDeg) fd.append(`yaw_deg_${index}`, metadata.yawDeg);
         if (metadata.pitchDeg) fd.append(`pitch_deg_${index}`, metadata.pitchDeg);
         if (metadata.rollDeg) fd.append(`roll_deg_${index}`, metadata.rollDeg);
         if (metadata.rtkFix) fd.append(`rtk_fix_${index}`, metadata.rtkFix.toString());
         if (metadata.stdHM) fd.append(`std_h_m_${index}`, metadata.stdHM);
         if (metadata.stdVM) fd.append(`std_v_m_${index}`, metadata.stdVM);
       }
     });

    const modelName = localStorage.getItem(SELECTED_MODEL_KEY);
    if (modelName) {
      fd.append('model_name', modelName);
    }

     const mapRes = await fetch('/api/images/multi', { method: 'POST', body: fd });
      const mapJson = await readJsonSafely(mapRes);
      if (!mapRes.ok) throw new Error((mapJson.error as string) || 'Upload failed');
     console.log('DEBUG: Multi upload response:', mapJson);

     await processUploadResponse(mapJson, true);
   }

   async function processUploadResponse(mapJson: Record<string, unknown>, isMultiUpload: boolean) {
      setImageUrl(mapJson.image_url as string);

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
    
     // Store image IDs
     if (isMultiUpload) {
       if (mapJson.image_ids && Array.isArray(mapJson.image_ids)) {
         const imageIds = mapJson.image_ids as string[];
         console.log('DEBUG: Storing image IDs for multi-upload:', imageIds);
         setUploadedImageIds(imageIds);
       } else {
         console.log('DEBUG: Multi-upload but no image_ids found, using single ID');
         setUploadedImageIds([mapIdVal]);
       }
     } else {
       console.log('DEBUG: Storing single image ID:', mapIdVal);
       setUploadedImageIds([mapIdVal]);
     }
     
     const capJson = mapJson;

      // Check for fallback information in the response
      const rawJson = capJson.raw_json as Record<string, unknown>;
      const fallbackUsed = rawJson?.fallback_used;
      const originalModel = rawJson?.original_model as string;
      const fallbackReason = rawJson?.fallback_reason as string;
      const currentModel = capJson.model as string;
      
      if (fallbackUsed && originalModel && fallbackReason) {
        setFallbackInfo({
          originalModel: originalModel,
          fallbackModel: currentModel,
          reason: fallbackReason
        });
        setShowFallbackNotification(true);
      }

      // Check if this is manual mode (model is "manual")
      const isManualModel = (capJson.model as string) === 'manual';
      
      const extractedMetadata = rawJson?.metadata;
      if (extractedMetadata) {
        const metadata = (extractedMetadata as Record<string, unknown>).metadata || extractedMetadata;
       
       if (metadata && typeof metadata === 'object') {
         const newMetadataArray = [];
         
         if (isMultiUpload) {
           // Try to get individual image metadata first
           const metadataImages = (metadata as Record<string, unknown>).metadata_images;
           if (metadataImages && typeof metadataImages === 'object') {
             // Parse individual image metadata
             for (let i = 1; i <= files.length; i++) {
               const imageKey = `image${i}`;
               const imageMetadata = (metadataImages as Record<string, unknown>)[imageKey];
               
               if (imageMetadata && typeof imageMetadata === 'object') {
                 const imgMeta = imageMetadata as Record<string, unknown>;
                 // For manual mode, use empty values; otherwise convert source label to code if needed
                 const sourceValue = imgMeta.source as string || '';
                 const sourceCode = isManualModel ? '' : convertSourceToCode(sourceValue);
                 
                 newMetadataArray.push({
                   source: sourceCode,
                   eventType: imgMeta.type as string || '',
                   epsg: imgMeta.epsg as string || '',
                   countries: Array.isArray(imgMeta.countries) ? imgMeta.countries as string[] : [],
                   centerLon: '', centerLat: '', amslM: '', aglM: '',
                   headingDeg: '', yawDeg: '', pitchDeg: '', rollDeg: '',
                   rtkFix: false, stdHM: '', stdVM: ''
                 });
               } else {
                 // Fallback to empty metadata for this image
                 newMetadataArray.push({
                   source: '', eventType: '', epsg: '', countries: [],
                   centerLon: '', centerLat: '', amslM: '', aglM: '',
                   headingDeg: '', yawDeg: '', pitchDeg: '', rollDeg: '',
                   rtkFix: false, stdHM: '', stdVM: ''
                 });
               }
             }
           } else {
             // Fallback to shared metadata if no individual metadata found
             // For manual mode, use empty values; otherwise convert source label to code if needed
             const sourceValue = (metadata as Record<string, unknown>).source as string || '';
             const sourceCode = isManualModel ? '' : convertSourceToCode(sourceValue);
             
             const sharedMetadata = {
               source: sourceCode,
               eventType: (metadata as Record<string, unknown>).type as string || '',
               epsg: (metadata as Record<string, unknown>).epsg as string || '',
               countries: Array.isArray((metadata as Record<string, unknown>).countries) 
                 ? (metadata as Record<string, unknown>).countries as string[] 
                 : [],
               centerLon: '', centerLat: '', amslM: '', aglM: '',
               headingDeg: '', yawDeg: '', pitchDeg: '', rollDeg: '',
               rtkFix: false, stdHM: '', stdVM: ''
             };
             
             // Create metadata array with shared data for all images
             for (let i = 0; i < files.length; i++) {
               newMetadataArray.push({ ...sharedMetadata });
             }
           }
         } else {
           // Single upload: use shared metadata
           // For manual mode, use empty values; otherwise convert source label to code if needed
           const sourceValue = (metadata as Record<string, unknown>).source as string || '';
           const sourceCode = isManualModel ? '' : convertSourceToCode(sourceValue);
           
           const sharedMetadata = {
             source: sourceCode,
             eventType: (metadata as Record<string, unknown>).type as string || '',
             epsg: (metadata as Record<string, unknown>).epsg as string || '',
             countries: Array.isArray((metadata as Record<string, unknown>).countries) 
               ? (metadata as Record<string, unknown>).countries as string[] 
               : [],
             centerLon: '', centerLat: '', amslM: '', aglM: '',
             headingDeg: '', yawDeg: '', pitchDeg: '', rollDeg: '',
             rtkFix: false, stdHM: '', stdVM: ''
           };
           newMetadataArray.push(sharedMetadata);
         }
         
         setMetadataArray(newMetadataArray);
         
         if (newMetadataArray.length > 0) {
           const firstMeta = newMetadataArray[0];
           // For manual mode, always set title, eventType, and epsg to empty
           if (isManualModel) {
             setTitle('');
             setSource('');
             setEventType('');
             setEpsg('');
             setCountries([]);
           } else {
             // Set shared title from metadata for non-manual modes
             if (metadata && typeof metadata === 'object') {
               const sharedTitle = (metadata as Record<string, unknown>).title;
               if (sharedTitle) {
                 setTitle(sharedTitle as string || '');
               }
             }
             setSource(firstMeta.source || '');
             setEventType(firstMeta.eventType || '');
             setEpsg(firstMeta.epsg || '');
             setCountries(firstMeta.countries || []);
           }
        if (imageType === 'drone_image') {
             setCenterLon(firstMeta.centerLon || '');
             setCenterLat(firstMeta.centerLat || '');
             setAmslM(firstMeta.amslM || '');
             setAglM(firstMeta.aglM || '');
             setHeadingDeg(firstMeta.headingDeg || '');
             setYawDeg(firstMeta.yawDeg || '');
             setPitchDeg(firstMeta.pitchDeg || '');
             setRollDeg(firstMeta.rollDeg || '');
             setRtkFix(firstMeta.rtkFix || false);
             setStdHM(firstMeta.stdHM || '');
             setStdVM(firstMeta.stdVM || '');
           }
         }
       }
     } else if (isManualModel) {
       // If no metadata extracted in manual mode, ensure all fields are empty
       setTitle('');
       setSource('');
       setEventType('');
       setEpsg('');
       setCountries([]);
       if (imageType === 'drone_image') {
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
       }
       // Set empty metadata array for multi-upload
       if (isMultiUpload) {
         const emptyMetadata = {
           source: '', eventType: '', epsg: '', countries: [],
           centerLon: '', centerLat: '', amslM: '', aglM: '',
           headingDeg: '', yawDeg: '', pitchDeg: '', rollDeg: '',
           rtkFix: false, stdHM: '', stdVM: ''
         };
         setMetadataArray(Array(files.length).fill(null).map(() => ({ ...emptyMetadata })));
       } else {
         setMetadataArray([{
           source: '', eventType: '', epsg: '', countries: [],
           centerLon: '', centerLat: '', amslM: '', aglM: '',
           headingDeg: '', yawDeg: '', pitchDeg: '', rollDeg: '',
           rtkFix: false, stdHM: '', stdVM: ''
         }]);
       }
     }

      // Extract the three parts from parsed or metadata
      // GPT-4 uses: raw_json.metadata.{description, analysis, recommended_actions}
      // Qwen uses: raw_json.parsed.{description, analysis, recommended_actions}
      const parsedData = rawJson?.parsed as Record<string, unknown> | undefined;
      const metadataData = rawJson?.metadata as Record<string, unknown> | undefined;
      
      // Try parsed first (Qwen), then metadata (GPT-4)
      let desc: string | undefined = undefined;
      let anal: string | undefined = undefined;
      let recActions: string | undefined = undefined;
      
      if (parsedData) {
        desc = parsedData.description as string | undefined;
        anal = parsedData.analysis as string | undefined;
        recActions = parsedData.recommended_actions as string | undefined;
      }
      
      // Fallback to metadata if parsed didn't have the fields (GPT-4 format)
      if (!desc && !anal && !recActions && metadataData) {
        desc = metadataData.description as string | undefined;
        anal = metadataData.analysis as string | undefined;
        recActions = metadataData.recommended_actions as string | undefined;
      }
      
      // For manual mode, explicitly set empty strings (don't skip if empty)
      if (isManualModel) {
        setDescription(desc || '');
        setAnalysis(anal || '');
        setRecommendedActions(recActions || '');
      } else {
        // For other modes, set values if they exist
        if (desc !== undefined && desc !== null) {
          setDescription(desc);
        }
        if (anal !== undefined && anal !== null) {
          setAnalysis(anal);
        }
        if (recActions !== undefined && recActions !== null) {
          setRecommendedActions(recActions);
        }
      }
      
      if (capJson.generated) {
        setDraft(capJson.generated as string);
      } else if (isManualModel) {
        // For manual mode, ensure draft is empty if no generated content
        setDraft('');
      }
      
      // For manual mode, set rating to confirmed by default
      if (isManualModel) {
        setIsPerformanceConfirmed(true);
      }
      
      handleStepChange('2a');
  }

  async function handleSubmit() {
    console.log('handleSubmit called with:', { uploadedImageId, title, draft });
    if (!uploadedImageId) return alert("No image to submit");
    
    if (!isPerformanceConfirmed) {
      setShowRatingWarning(true);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
        // Use stored image IDs for multi-image uploads
        const imageIds = uploadedImageIds.length > 0 ? uploadedImageIds : [uploadedImageId!];
        console.log('DEBUG: Submit - Using image IDs:', imageIds);
        console.log('DEBUG: Submit - uploadedImageIds:', uploadedImageIds);
        console.log('DEBUG: Submit - uploadedImageId:', uploadedImageId);
       
       // Update metadata for each image
       for (let i = 0; i < imageIds.length; i++) {
         const imageId = imageIds[i];
         const metadata = metadataArray[i] || {
           source: source || 'OTHER',
           eventType: eventType || 'OTHER',
        epsg: epsg || 'OTHER',
           countries: countries || []
         };
         
         const metadataBody = {
           source: imageType === 'drone_image' ? undefined : (metadata.source || 'OTHER'),
           event_type: metadata.eventType || 'OTHER',
           epsg: metadata.epsg || 'OTHER',
        image_type: imageType,
           countries: metadata.countries || [],
      };
         
         console.log(`Updating metadata for image ${i + 1}:`, metadataBody);
         const metadataRes = await fetch(`/api/images/${imageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadataBody),
      });
      const metadataJson = await readJsonSafely(metadataRes);
         if (!metadataRes.ok) throw new Error((metadataJson.error as string) || `Metadata update failed for image ${i + 1}`);
       }
      
      const combinedContent = `Description: ${description}\n\nAnalysis: ${analysis}\n\nRecommended Actions: ${recommendedActions}`;
      
      const captionBody = {
        title: title,
        edited: combinedContent,
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
     setUploadedImageIds([]);
      handleStepChange(3);
    } catch (err) {
      handleApiError(err, 'Submit');
    } finally {
      setIsSubmitting(false);
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
        resetToStep1();
    } catch (err) {
      handleApiError(err, 'Delete');
    }
  }

  const resetToStep1 = () => {
    setIsPerformanceConfirmed(false);
    setStep(1);
    setFile(null);
    setFiles([]);
    setPreview(null);
         setUploadedImageId(null);
     setUploadedImageIds([]);
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
    setDescription('');
    setAnalysis('');
    setRecommendedActions('');
    setMetadataArray([]);
    setShowFallbackNotification(false);
    setFallbackInfo(null);
    setShowPreprocessingNotification(false);
    setPreprocessingInfo(null);
    setShowPreprocessingModal(false);
    setPreprocessingFile(null);
    setIsPreprocessing(false);
    setPreprocessingProgress('');
    setShowUnsupportedFormatModal(false);
    setUnsupportedFile(null);
    setShowFileSizeWarningModal(false);
    setOversizedFile(null);
    
    // Clear URL parameters to prevent re-triggering contribute workflow
    navigate('/upload', { replace: true });
  };

  // Navigation handling
  const handleNavigation = useCallback((to: string) => {
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

  // Preprocessing handlers
  const handlePreprocessingConfirm = async () => {
    if (!preprocessingFile) return;
    
    setIsPreprocessing(true);
    setPreprocessingProgress('Starting file conversion...');
    
    try {
      const formData = new FormData();
      formData.append('file', preprocessingFile);
      formData.append('preprocess_only', 'true');
      
      setPreprocessingProgress('Converting file format...');
      
      const response = await fetch('/api/images/preprocess', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Preprocessing failed');
      }
      
      const result = await response.json();
      
      setPreprocessingProgress('Finalizing conversion...');
      
      const processedContent = atob(result.processed_content);
      const processedBytes = new Uint8Array(processedContent.length);
      for (let i = 0; i < processedContent.length; i++) {
        processedBytes[i] = processedContent.charCodeAt(i);
      }
      
      const processedFile = new File(
        [processedBytes], 
        result.processed_filename, 
        { type: result.processed_mime_type }
      );
      
      const previewUrl = URL.createObjectURL(processedFile);
      
             // If this is the first file, set it as the single file
       if (files.length === 0) {
         setFile(processedFile);
         setFiles([processedFile]);
       } else {
         // If files already exist, add to the array (multi-upload mode)
         setFiles(prev => [...prev, processedFile]);
       }
       setPreview(previewUrl);
      
      setPreprocessingProgress('Conversion complete!');
      
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

  const handlePreprocessingCancel = () => {
    setShowPreprocessingModal(false);
    setPreprocessingFile(null);
    setIsPreprocessing(false);
    setPreprocessingProgress('');
  };

  // Fetch contributed images from database and convert to File objects
  const fetchContributedImages = async (imageIds: string[]) => {
    setIsLoadingContribution(true);
    try {
      const filePromises = imageIds.map(async (imageId) => {
        // Fetch image data from the API
        const response = await fetch(`/api/images/${imageId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch image ${imageId}`);
        }
        const imageData = await response.json();
        
        // Fetch the actual image file
        const fileResponse = await fetch(`/api/images/${imageId}/file`);
        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch image file ${imageId}`);
        }
        const blob = await fileResponse.blob();
        
        // Create a File object from the blob
        const fileName = imageData.file_key.split('/').pop() || `contributed_${imageId}.png`;
        const file = new File([blob], fileName, { type: blob.type });
        
        return { file, imageData };
      });
      
      const contributedResults = await Promise.all(filePromises);
      const contributedFiles = contributedResults.map(result => result.file);
      const firstImageData = contributedResults[0]?.imageData;
      
      setFiles(contributedFiles);
      
      // Set the image IDs for submit process
      setUploadedImageIds(imageIds);
      if (imageIds.length === 1) {
        setUploadedImageId(imageIds[0]);
      }
      
      // Set the first file as the main file for single upload compatibility
      if (contributedFiles.length >= 1) {
        setFile(contributedFiles[0]);
      }
      
      // Set the image type based on the contributed image's type
      if (firstImageData?.image_type) {
        setImageType(firstImageData.image_type);
      }
      
      // Stay on step 1 to show the images in the file upload section
      
    } catch (error) {
      console.error('Failed to fetch contributed images:', error);
      alert(`Failed to load contributed images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoadingContribution(false);
    }
  };



  // Effects
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
      if (imageTypesData.length > 0 && !searchParams.get('imageType') && !imageType) {
        setImageType(imageTypesData[0].image_type);
      }
    });
  }, [searchParams, imageType]);

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

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Handle contribute parameter - fetch images from database
  useEffect(() => {
    const contribute = searchParams.get('contribute');
    const imageIds = searchParams.get('imageIds');
    
    if (contribute === 'true' && imageIds) {
      const ids = imageIds.split(',').filter(id => id.trim());
      if (ids.length > 0) {
        fetchContributedImages(ids);
      }
    }
  }, [searchParams]);

  // Reset carousel index when entering step 2b
  useEffect(() => {
    if (step === '2b') {
      setCurrentImageIndex(0);
    }
  }, [step]);

  // Render
  return (
    <PageContainer>
      {step !== 3 && (
        <div className="max-w-7xl mx-auto">
          <div className={styles.uploadContainer} data-step={step}>
            {/* Step 1: File Upload */}
          {step === 1 && !searchParams.get('step') && !isLoadingContribution && (
              <FileUploadSection
                files={files}
                file={file}
                preview={preview}
                imageType={imageType}
                isManualMode={isManualMode}
                onFileChange={onFileChange}
                onRemoveImage={removeImage}
                onAddImage={addImage}
                onImageTypeChange={handleImageTypeChange}
                onManualModeChange={setIsManualMode}
                onChangeFile={onChangeFile}
              />
            )}

            {/* Step 1: Contributed Images Display */}
          {step === 1 && searchParams.get('contribute') === 'true' && !isLoadingContribution && files.length > 0 && (
              <FileUploadSection
                files={files}
                file={file}
                preview={preview}
                imageType={imageType}
                isManualMode={isManualMode}
                onFileChange={onFileChange}
                onRemoveImage={removeImage}
                onAddImage={addImage}
                onImageTypeChange={handleImageTypeChange}
                onManualModeChange={setIsManualMode}
                onChangeFile={onChangeFile}
              />
            )}

            {/* Loading States */}
        {isLoading && (
          <div className={styles.loadingContainer}>
            <Spinner className="text-ifrcRed" />
                                <p className={styles.loadingText}>Generating...</p>
          </div>
        )}

        {isLoadingContribution && (
          <div className={styles.loadingContainer}>
            <Spinner className="text-ifrcRed" />
            <p className={styles.loadingText}>Loading contribution...</p>
          </div>
        )}

            {/* Generate Button */}
        {((step === 1 && !isLoading && !isLoadingContribution) || (step === 1 && searchParams.get('contribute') === 'true' && !isLoading && !isLoadingContribution && files.length > 0)) && (
          <div className={styles.generateButtonContainer}>
            {imageUrl ? (
              <Button
                name="generate-from-url"
                    onClick={handleGenerate}
              >
                {isManualMode ? 'Start' : 'Generate Caption'}
              </Button>
            ) : (
              <Button
                name="generate"
                    disabled={files.length === 0}
                onClick={handleGenerate}
              >
                {isManualMode ? 'Start' : 'Generate'}
              </Button>
            )}
          </div>
        )}

            {/* Step 2A: Metadata */}
        {step === '2a' && (
          <div className={styles.step2Layout}>
            <div className={styles.mapColumn}>
                  <ImagePreviewSection
                    files={files}
                    imageUrl={imageUrl}
                    preview={preview}
                    onViewFullSize={(imageData) => {
                      setSelectedImageData(imageData || null);
                      setIsFullSizeModalOpen(true);
                    }}
                  />
            </div>

            <div className={styles.contentColumn}>
              <div className={styles.metadataSectionCard}>
                    <MetadataFormSection
                      files={files}
                      imageType={imageType}
                      title={title}
                      source={source}
                      eventType={eventType}
                      epsg={epsg}
                      countries={countries}
                      centerLon={centerLon}
                      centerLat={centerLat}
                      amslM={amslM}
                      aglM={aglM}
                      headingDeg={headingDeg}
                      yawDeg={yawDeg}
                      pitchDeg={pitchDeg}
                      rollDeg={rollDeg}
                      rtkFix={rtkFix}
                      stdHM={stdHM}
                      stdVM={stdVM}
                      metadataArray={metadataArray}
                      sources={sources}
                      types={types}
                      spatialReferences={spatialReferences}
                      imageTypes={imageTypes}
                      countriesOptions={countriesOptions}
                      onTitleChange={(value) => setTitle(value || '')}
                      onSourceChange={handleSourceChange}
                      onEventTypeChange={handleEventTypeChange}
                      onEpsgChange={handleEpsgChange}
                      onCountriesChange={handleCountriesChange}
                      onCenterLonChange={handleCenterLonChange}
                      onCenterLatChange={handleCenterLatChange}
                      onAmslMChange={handleAmslMChange}
                      onAglMChange={handleAglMChange}
                      onHeadingDegChange={handleHeadingDegChange}
                      onYawDegChange={handleYawDegChange}
                      onPitchDegChange={handlePitchDegChange}
                      onRollDegChange={handleRollDegChange}
                      onRtkFixChange={handleRtkFixChange}
                      onStdHMChange={handleStdHMChange}
                      onStdVMChange={handleStdVMChange}
                      onImageTypeChange={handleImageTypeChange}
                      updateMetadataForImage={updateMetadataForImage}
                    />
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
                           onClick={() => handleStepChange('2b')}
                    >
                      Next
                    </Button>
                  </div>
              </div>
            </div>
          </div>
        )}

            {/* Step 2B: Rating and Generated Text */}
        {step === '2b' && (
          <div className={styles.step2bLayout}>
            {/* Submit Loading State */}
            {isSubmitting && (
              <div className={styles.loadingContainer}>
                <Spinner className="text-ifrcRed" />
                <p className={styles.loadingText}>Submitting...</p>
              </div>
            )}
            
            <div className={`${styles.topRow} ${isPerformanceConfirmed ? styles.ratingHidden : ''}`}>
              <div className={styles.imageSection}>
                    <ImagePreviewSection
                      files={files}
                      imageUrl={imageUrl}
                      preview={preview}
                      onViewFullSize={(imageData) => {
                        setSelectedImageData(imageData || null);
                        setIsFullSizeModalOpen(true);
                      }}
                      currentImageIndex={currentImageIndex}
                      onGoToPrevious={goToPrevious}
                      onGoToNext={goToNext}
                      onGoToImage={goToImage}
                      showCarousel={true}
                    />
              </div>

              {!isPerformanceConfirmed && (
                <div className={styles.metadataSectionCard}>
                      <RatingSection
                        isPerformanceConfirmed={isPerformanceConfirmed}
                        scores={scores}
                        onScoreChange={(key, value) => setScores(prev => ({ ...prev, [key]: value }))}
                        onConfirmRatings={() => setIsPerformanceConfirmed(true)}
                        onEditRatings={() => setIsPerformanceConfirmed(false)}
                      />
                </div>
              )}
            </div>

            <div className={styles.metadataSectionCard}>
                  <GeneratedTextSection
                    description={description}
                    analysis={analysis}
                    recommendedActions={recommendedActions}
                    isManualMode={isManualMode}
                    onDescriptionChange={(value) => setDescription(value || '')}
                    onAnalysisChange={(value) => setAnalysis(value || '')}
                    onRecommendedActionsChange={(value) => setRecommendedActions(value || '')}
                    onBack={() => handleStepChange('2a')}
                    onDelete={handleDelete}
                    onSubmit={handleSubmit}
                    onEditRatings={() => setIsPerformanceConfirmed(false)}
                    isPerformanceConfirmed={isPerformanceConfirmed}
                    isSubmitting={isSubmitting}
                  />
            </div>
          </div>
        )}
        </div>
        </div>
      )}

      {/* Success page */}
      {step === 3 && (
        <div className={styles.successContainer}>
          <Heading level={2} className={styles.successHeading}>Saved!</Heading>
          <p className={styles.successText}>
            {searchParams.get('contribute') === 'true' 
              ? 'Your contribution has been successfully saved.' 
              : 'Your caption has been successfully saved.'
            }
          </p>
          <div className={styles.successButton}>
            <Button
              name="upload-another"
              onClick={() => {
                  resetToStep1();
              }}
            >
              Upload Another
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
             <FullSizeImageModal
         isOpen={isFullSizeModalOpen}
         imageUrl={imageUrl}
         preview={preview}
         selectedImageData={selectedImageData}
         onClose={() => {
           setIsFullSizeModalOpen(false);
           setSelectedImageData(null);
         }}
       />

      <RatingWarningModal
        isOpen={showRatingWarning}
        onClose={() => setShowRatingWarning(false)}
      />

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <NavigationConfirmModal
        isOpen={showNavigationConfirm}
        onConfirm={confirmNavigation}
        onCancel={() => setShowNavigationConfirm(false)}
      />

      <FallbackNotificationModal
        isOpen={showFallbackNotification}
        fallbackInfo={fallbackInfo}
        onClose={() => setShowFallbackNotification(false)}
      />

      <PreprocessingNotificationModal
        isOpen={showPreprocessingNotification}
        preprocessingInfo={preprocessingInfo}
        onClose={() => setShowPreprocessingNotification(false)}
      />

      <PreprocessingModal
        isOpen={showPreprocessingModal}
        isPreprocessing={isPreprocessing}
        preprocessingProgress={preprocessingProgress}
        onConfirm={handlePreprocessingConfirm}
        onCancel={handlePreprocessingCancel}
      />

      <UnsupportedFormatModal
        isOpen={showUnsupportedFormatModal}
        unsupportedFile={unsupportedFile}
        onClose={() => setShowUnsupportedFormatModal(false)}
      />

      <FileSizeWarningModal
        isOpen={showFileSizeWarningModal}
        oversizedFile={oversizedFile}
        onClose={() => setShowFileSizeWarningModal(false)}
        onCancel={() => setShowFileSizeWarningModal(false)}
      />


    </PageContainer>
  );
}
