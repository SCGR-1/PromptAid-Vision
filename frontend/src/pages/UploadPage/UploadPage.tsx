import { useState, useEffect, useRef, useCallback } from 'react';
import type { DragEvent } from 'react';
import {
  PageContainer, Heading, Button,
  SelectInput, MultiSelectInput, Container, IconButton, TextInput, TextArea, Spinner,
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
  const [imageType, setImageType] = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  const [title, setTitle] = useState('');

  const [sources, setSources] = useState<{s_code: string, label: string}[]>([]);
  const [types, setTypes] = useState<{t_code: string, label: string}[]>([]);
  const [spatialReferences, setSpatialReferences] = useState<{epsg: string, srid: string, proj4: string, wkt: string}[]>([]);
  const [imageTypes, setImageTypes] = useState<{image_type: string, label: string}[]>([]);
  const [countriesOptions, setCountriesOptions] = useState<{c_code: string, label: string, r_code: string}[]>([]);

  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
  
  stepRef.current = step;
  uploadedImageIdRef.current = uploadedImageId;

  const handleSourceChange = (value: any) => setSource(String(value));
  const handleEventTypeChange = (value: any) => setEventType(String(value));
  const handleEpsgChange = (value: any) => setEpsg(String(value));
  const handleImageTypeChange = (value: any) => setImageType(String(value));
  const handleCountriesChange = (value: any) => setCountries(Array.isArray(value) ? value.map(String) : []);

  const handleStepChange = (newStep: 1 | '2a' | '2b' | 3) => {
    setStep(newStep);
  };

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
      if (typesData.length > 0) setEventType(typesData[0].t_code);
      if (spatialData.length > 0) setEpsg(spatialData[0].epsg);
      if (imageTypesData.length > 0) setImageType(imageTypesData[0].image_type);
    });
  }, []);



  const handleNavigation = useCallback((to: string) => {
    if (uploadedImageIdRef.current) {
      if (confirm("Leave page? Your uploaded image will be deleted.")) {
        fetch(`/api/images/${uploadedImageIdRef.current}`, { method: "DELETE" })
          .then(() => {
            navigate(to);
          })
          .catch(console.error);
      }
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
    
                if (imageUrlParam) {
        setImageUrl(imageUrlParam);
        
        if (stepParam === '2a' && imageIdParam) {
          setIsLoadingContribution(true);
          setUploadedImageId(imageIdParam);
          fetch(`/api/images/${imageIdParam}`)
            .then(res => res.json())
            .then(data => {
              if (data.image_type) setImageType(data.image_type);
              
              if (data.generated) setDraft(data.generated);
              
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

  const resetToStep1 = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setImageUrl(null);
    
    setDraft('');
    setTitle('');
    setScores({ accuracy: 50, context: 50, usability: 50 });
    setUploadedImageId(null);
  }; 
  const [scores, setScores] = useState({  
    accuracy: 50,
    context:  50,
    usability: 50,
  });

  const [isFullSizeModalOpen, setIsFullSizeModalOpen] = useState(false);


  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  };

  const onFileChange = (file: File | undefined, _name: string) => {
    if (file) setFile(file);
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


  async function readJsonSafely(res: Response): Promise<any> {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { error: text };
    }
  }

  function handleApiError(err: any, operation: string) {
    
    const message = err.message || `Failed to ${operation.toLowerCase()}`;
    alert(message);
  }

  async function handleGenerate() {
    if (!file) return;

    setIsLoading(true);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('source', source);
    fd.append('event_type', eventType);
    fd.append('epsg', epsg);
    fd.append('image_type', imageType);
    countries.forEach((c) => fd.append('countries', c));

    const modelName = localStorage.getItem(SELECTED_MODEL_KEY);
    if (modelName) {
    fd.append('model_name', modelName);
    }

    try {
      const mapRes = await fetch('/api/images/', { method: 'POST', body: fd });
      const mapJson = await readJsonSafely(mapRes);
      if (!mapRes.ok) throw new Error(mapJson.error || 'Upload failed');
      setImageUrl(mapJson.image_url);

      const mapIdVal = mapJson.image_id;
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
            prompt: 'Analyze this crisis map and provide a detailed description of the emergency situation, affected areas, and key information shown in the map.',
            ...(modelName      && { model_name: modelName })
          })
        },
      );
      const capJson = await readJsonSafely(capRes);
      if (!capRes.ok) throw new Error(capJson.error || 'Caption failed');
      setUploadedImageId(mapIdVal);                     


      const extractedMetadata = capJson.raw_json?.extracted_metadata;
      if (extractedMetadata) {
        const metadata = extractedMetadata.metadata || extractedMetadata;
        if (metadata.title) setTitle(metadata.title);
        if (metadata.source) setSource(metadata.source);
        if (metadata.type) setEventType(metadata.type);
        if (metadata.epsg) setEpsg(metadata.epsg);
        if (metadata.countries && Array.isArray(metadata.countries)) {
          setCountries(metadata.countries);
        }
      }

      setDraft(capJson.generated);
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
      // 1) Create a NEW image from server-side URL fetch
      const res = await fetch('/api/contribute/from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: imageUrl,
          source,
          event_type: eventType,
          epsg,
          image_type: imageType,
          countries,
        }),
      });
      const json = await readJsonSafely(res);
      if (!res.ok) throw new Error(json.error || 'Upload failed');
  
      const newId = json.image_id as string;
      setUploadedImageId(newId);
      setImageUrl(json.image_url);
  
      const modelName = localStorage.getItem(SELECTED_MODEL_KEY) || undefined;
      const capRes = await fetch(`/api/images/${newId}/caption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          title: 'Generated Caption',
          prompt:
            'Analyze this crisis map and provide a detailed description of the emergency situation, affected areas, and key information shown in the map.',
          ...(modelName && { model_name: modelName }),
        }),
      });
      const capJson = await readJsonSafely(capRes);
      if (!capRes.ok) throw new Error(capJson.error || 'Caption failed');
  
      const extractedMetadata = capJson.raw_json?.extracted_metadata;
      if (extractedMetadata) {
        const metadata = extractedMetadata.metadata || extractedMetadata;
        if (metadata.title) setTitle(metadata.title);
        if (metadata.source) setSource(metadata.source);
        if (metadata.type) setEventType(metadata.type);
        if (metadata.epsg) setEpsg(metadata.epsg);
        if (metadata.countries && Array.isArray(metadata.countries)) {
          setCountries(metadata.countries);
        }
      }
  
      setDraft(capJson.generated || '');
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
    
    try {
      const metadataBody = {
        source: source,
        event_type: eventType,
        epsg: epsg,
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
      if (!metadataRes.ok) throw new Error(metadataJson.error || "Metadata update failed");
      
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
      if (!captionRes.ok) throw new Error(captionJson.error || "Caption update failed");
      
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
    
    if (confirm("Delete this image? This cannot be undone.")) {
      try {
        console.log('Deleting image with ID:', uploadedImageId);
        const res = await fetch(`/api/images/${uploadedImageId}`, {
          method: "DELETE",
        });
        
        if (!res.ok) {
          const json = await readJsonSafely(res);
          throw new Error(json.error || `Delete failed with status ${res.status}`);
        }
        
        // If this was a contribution, navigate to explore page
        if (searchParams.get('isContribution') === 'true') {
          navigate('/explore');
        } else {
          resetToStep1();
        }
      } catch (err) {
        handleApiError(err, 'Delete');
      }
    }
  }



  return (
    <PageContainer>
      {step !== 3 && (
        <Container
          heading="Upload Your Image"
          headingLevel={2}
          withHeaderBorder
          withInternalPadding
          className="max-w-7xl mx-auto"
        >
          <div className={styles.uploadContainer} data-step={step}>
          {/* Drop-zone */}
          {step === 1 && !searchParams.get('step') && (
            <div className="space-y-6">
              <p className="text-gray-700 leading-relaxed max-w-2xl mx-auto">
                This app evaluates how well multimodal AI models turn emergency maps
                into meaningful text. Upload your map, let the AI generate a
                description, then review and rate the result based on your expertise.
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
                    <p className={styles.dropZoneText}>Drag &amp; Drop a file here</p>
                    <p className={styles.dropZoneSubtext}>or</p>
                  </>
                )}
              
              {/* File-picker button - always visible */}
              <label className="inline-block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={e => onFileChange(e.target.files?.[0], "file")}
                />
                <Button 
                  name="upload" 
                  variant="secondary"
                  size={1}
                  onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                >
                  {file ? 'Change File' : 'Browse Device'}
                </Button>
              </label>
              </div>
            </div>
          )}

        {/* Loading state */}
        {isLoading && (
          <div className={styles.loadingContainer}>
            <Spinner className="text-ifrcRed" />
            <p className={styles.loadingText}>Generating caption...</p>
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
                    <SelectInput
                      label="Event Type"
                      name="event_type"
                      value={eventType}
                      onChange={handleEventTypeChange}
                      options={types}
                      keySelector={(o) => o.t_code}
                      labelSelector={(o) => o.label}
                      required
                    />
                    <SelectInput
                      label="EPSG"
                      name="epsg"
                      value={epsg}
                      onChange={handleEpsgChange}
                      options={spatialReferences}
                      keySelector={(o) => o.epsg}
                      labelSelector={(o) => `${o.srid} (EPSG:${o.epsg})`}
                      required
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
                  </div>
                </Container>
              </div>

              {/* ────── AI‑GENERATED CAPTION ────── */}
              <div className={styles.metadataSectionCard}>
                <Container
                  heading="AI‑Generated Caption"
                  headingLevel={3}
                  withHeaderBorder
                  withInternalPadding
                >
                  <div className="text-left">
                    <TextArea
                      name="caption"
                      value={draft}
                      onChange={(value) => setDraft(value || '')}
                      rows={5}
                      placeholder="AI-generated caption will appear here..."
                    />
                  </div>
                </Container>
              </div>

              {/* ────── SUBMIT BUTTON ────── */}
              <div className={styles.submitSection}>
                <Button
                  name="back"
                  variant="secondary"
                  onClick={() => handleStepChange('2a')}
                >
                  ← Back to Metadata
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

        </div>
        </Container>
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
