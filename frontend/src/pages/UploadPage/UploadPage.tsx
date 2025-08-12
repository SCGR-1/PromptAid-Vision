import { useCallback, useState, useEffect, useRef } from 'react';
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
import { Link, useSearchParams } from 'react-router-dom';
import styles from './UploadPage.module.css';

const SELECTED_MODEL_KEY = 'selectedVlmModel';

export default function UploadPage() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<1 | '2a' | '2b' | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
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
    ]).then(([sourcesData, typesData, spatialData, imageTypesData, countriesData]) => {
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

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (uploadedImageIdRef.current && stepRef.current !== 3) {
        fetch(`/api/images/${uploadedImageIdRef.current}`, { method: "DELETE" }).catch(console.error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (uploadedImageIdRef.current && stepRef.current !== 3) {
        fetch(`/api/images/${uploadedImageIdRef.current}`, { method: "DELETE" }).catch(console.error);
      }
    };
  }, []);

  const [captionId, setCaptionId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string|null>(null);
  const [draft, setDraft] = useState('');
  
  useEffect(() => {
    const mapId = searchParams.get('mapId');
    const stepParam = searchParams.get('step');
    const captionIdParam = searchParams.get('captionId');
    
    if (mapId && stepParam === '2') {
      fetch(`/api/images/${mapId}`)
        .then(response => response.json())
        .then(mapData => {
          setImageUrl(mapData.image_url);
          setSource(mapData.source);
          setEventType(mapData.event_type);
          setEpsg(mapData.epsg);
          setImageType(mapData.image_type);
          
          setUploadedImageId(mapId);
          
          if (captionIdParam) {
            setCaptionId(captionIdParam);
            const existingCaption = mapData.captions?.find((c: any) => c.cap_id === captionIdParam);
            if (existingCaption) {
              setDraft(existingCaption.edited || existingCaption.generated);
              setTitle(existingCaption.title || 'Generated Caption');
            }
            
            if (mapData.countries && Array.isArray(mapData.countries)) {
              setCountries(mapData.countries.map((c: any) => c.c_code));
            }
            
            handleStepChange('2a');
          } else {
            setCaptionId(null);
            setDraft('');
            setTitle('');

            
            if (mapData.countries && Array.isArray(mapData.countries)) {
              setCountries(mapData.countries.map((c: any) => c.c_code));
            }
            
            handleStepChange('2a');
          }
        })
        .catch(err => {
          alert('Failed to load map data. Please try again.');
        });
    }
  }, [searchParams]);

  const resetToStep1 = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setImageUrl(null);
    setCaptionId(null);
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


  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }, []);

  const onFileChange = useCallback((file: File | undefined, _name: string) => {
    if (file) setFile(file);
  }, []);

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
      setCaptionId(capJson.cap_id);

      const extractedMetadata = capJson.raw_json?.extracted_metadata;
      if (extractedMetadata) {
        if (extractedMetadata.title) setTitle(extractedMetadata.title);
        if (extractedMetadata.source) setSource(extractedMetadata.source);
        if (extractedMetadata.type) setEventType(extractedMetadata.type);
        if (extractedMetadata.epsg) setEpsg(extractedMetadata.epsg);
        if (extractedMetadata.countries && Array.isArray(extractedMetadata.countries)) {
          setCountries(extractedMetadata.countries);
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

  async function handleSubmit() {
    if (!captionId) return alert("No caption to submit");
    
    try {
      const metadataBody = {
        source: source,
        event_type: eventType,
        epsg: epsg,
        image_type: imageType,
        countries: countries,
      };
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
      const captionRes = await fetch(`/api/captions/${captionId}`, {
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
    if (!uploadedImageId) {
      
      alert('No caption to delete. Please try refreshing the page.');
      return;
    }
    
    if (confirm("Are you sure you want to delete this caption? This action cannot be undone.")) {
      try {
        const captionsResponse = await fetch(`/api/images/${uploadedImageId}/captions`);
        let hasOtherCaptions = false;
        
        if (captionsResponse.ok) {
          const captions = await captionsResponse.json();
          hasOtherCaptions = captions.some((cap: any) => cap.cap_id !== captionId);
        }
        
        if (hasOtherCaptions) {
          if (captionId) {
            const capRes = await fetch(`/api/captions/${captionId}`, {
              method: "DELETE",
            });
            if (!capRes.ok) {
              throw new Error('Failed to delete caption');
            }
          }
        } else {
          const res = await fetch(`/api/images/${uploadedImageId}`, {
            method: "DELETE",
          });
          
          if (!res.ok) {
            const json = await readJsonSafely(res);
    
            throw new Error(json.error || `Delete failed with status ${res.status}`);
          }
        }
        
        resetToStep1();
      } catch (err) {

        handleApiError(err, 'Delete');
      }
    }
  }

  const handleProcessCaption = useCallback(async () => {
    if (!uploadedImageId) {
      alert('No image ID available to create a new caption.');
      return;
    }

    setIsLoading(true);

    try {
      if (captionId) {
        const captionBody = {
          title: title,
          edited: draft || '',
        };
        const captionRes = await fetch(`/api/captions/${captionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(captionBody),
        });
        if (!captionRes.ok) throw new Error('Failed to update caption');
      } else {
        const capRes = await fetch(
          `/api/images/${uploadedImageId}/caption`, 
          { 
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              title: 'New Contribution Caption',
              prompt: 'Describe this crisis map in detail',
              ...(localStorage.getItem(SELECTED_MODEL_KEY) && {
                model_name: localStorage.getItem(SELECTED_MODEL_KEY)!
              })
            })
          }
        );
        const capJson = await readJsonSafely(capRes);
        if (!capRes.ok) throw new Error(capJson.error || 'Caption failed');

        setCaptionId(capJson.cap_id);
        setDraft(capJson.generated);
      }
      
      handleStepChange('2b');
    } catch (err) {
      handleApiError(err, 'Create New Caption');
    } finally {
      setIsLoading(false);
    }
  }, [uploadedImageId, title, captionId, draft]);

  return (
    <PageContainer>
      <div className={styles.uploadContainer} data-step={step}>
        {/* Drop-zone */}
        {step === 1 && (
          <Container
            heading="Upload Your Image"
            headingLevel={2}
            withHeaderBorder
            withInternalPadding
            headingClassName="text-center"
          >
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
          </Container>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className={styles.loadingContainer}>
            <Spinner className="text-ifrcRed" />
            <p className={styles.loadingText}>Generating caption...</p>
          </div>
        )}

        {/* Generate button */}
        {step === 1 && !isLoading && (
          <div className={styles.generateButtonContainer}>
            <Button
              name="generate"
              disabled={!file}
              onClick={handleGenerate}
            >
              Generate
            </Button>
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
                      onClick={() => {
                        if (imageUrl && !file) {
                          handleProcessCaption();
                        } else {
                          handleStepChange('2b');
                        }
                      }}
                    >
                      {imageUrl && !file ? 
                        (captionId ? 'Edit Caption' : 'Create New Caption') : 
                        'Next'
                      }
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

        {/* Success page */}
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
    </PageContainer>
  );
}
