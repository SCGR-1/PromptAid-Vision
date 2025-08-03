import { useCallback, useState, useEffect, useRef } from 'react';
import type { DragEvent } from 'react';
import {
  PageContainer, Heading, Button,
  SelectInput, MultiSelectInput,
  RawFileInput,
} from '@ifrc-go/ui';
import {
  UploadCloudLineIcon,
  ArrowRightLineIcon,
} from '@ifrc-go/icons';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export default function UploadPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const stepRef = useRef(step);
  const uploadedImageIdRef = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  /* ---------------- local state ----------------- */

  const [file, setFile] = useState<File | null>(null);
  //const [source,    setSource]    = useState('');
  //const [type,  setType]  = useState('');
  const [source,   setSource]   = useState('');
  const [type, setType] = useState('');
  const [epsg, setEpsg] = useState('');
  const [imageType, setImageType] = useState('');
  const [countries, setCountries] = useState<string[]>([]);

  // Metadata options from database
  const [sources, setSources] = useState<{s_code: string, label: string}[]>([]);
  const [types, setTypes] = useState<{t_code: string, label: string}[]>([]);
  const [spatialReferences, setSpatialReferences] = useState<{epsg: string, srid: string, proj4: string, wkt: string}[]>([]);
  const [imageTypes, setImageTypes] = useState<{image_type: string, label: string}[]>([]);
  const [countriesOptions, setCountriesOptions] = useState<{c_code: string, label: string, r_code: string}[]>([]);

  // Track uploaded image data for potential deletion
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
  const [uploadedCaptionId, setUploadedCaptionId] = useState<string | null>(null);
  
  // Keep refs updated with current values
  stepRef.current = step;
  uploadedImageIdRef.current = uploadedImageId;

  // Wrapper functions to handle OptionKey to string conversion
  const handleSourceChange = (value: any) => setSource(String(value));
  const handleTypeChange = (value: any) => setType(String(value));
  const handleEpsgChange = (value: any) => setEpsg(String(value));
  const handleImageTypeChange = (value: any) => setImageType(String(value));
  const handleCountriesChange = (value: any) => setCountries(Array.isArray(value) ? value.map(String) : []);

  // Fetch metadata options on component mount
  useEffect(() => {
    Promise.all([
      fetch('/api/sources').then(r => r.json()),
      fetch('/api/types').then(r => r.json()),
      fetch('/api/spatial-references').then(r => r.json()),
      fetch('/api/image-types').then(r => r.json()),
      fetch('/api/countries').then(r => r.json())
    ]).then(([sourcesData, typesData, spatialData, imageTypesData, countriesData]) => {
      setSources(sourcesData);
      setTypes(typesData);
      setSpatialReferences(spatialData);
      setImageTypes(imageTypesData);
      setCountriesOptions(countriesData);
      
      // Set default values from the first available options
      if (sourcesData.length > 0) setSource(sourcesData[0].s_code);
      if (typesData.length > 0) setType(typesData[0].t_code);
      if (spatialData.length > 0) setEpsg(spatialData[0].epsg);
      if (imageTypesData.length > 0) setImageType(imageTypesData[0].image_type);
    });
  }, []);

  // Cleanup effect for navigation away - delete if user hasn't submitted yet
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Delete if user is in step 1 or 2 (hasn't submitted yet)
      // Only preserve if user has successfully submitted (step 3)
      if (uploadedImageIdRef.current && stepRef.current !== 3) {
        fetch(`/api/images/${uploadedImageIdRef.current}`, { method: "DELETE" }).catch(console.error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Only cleanup on component unmount if user hasn't submitted yet
      if (uploadedImageIdRef.current && stepRef.current !== 3) {
        fetch(`/api/images/${uploadedImageIdRef.current}`, { method: "DELETE" }).catch(console.error);
      }
    };
  }, []); // No dependencies - handler will always use current ref values

  const [captionId, setCaptionId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string|null>(null);
  const [draft, setDraft] = useState('');
  
  // Handle URL parameters for direct step 2 navigation
  useEffect(() => {
    const mapId = searchParams.get('mapId');
    const stepParam = searchParams.get('step');
    
    if (mapId && stepParam === '2') {
      // Load the map data and start at step 2
      fetch(`/api/images/${mapId}`)
        .then(response => response.json())
        .then(mapData => {
          setImageUrl(mapData.image_url);
          setSource(mapData.source);
          setType(mapData.type);
          setEpsg(mapData.epsg);
          setImageType(mapData.image_type);
          
          // Generate caption for the existing map
          return fetch(`/api/images/${mapId}/caption`, { 
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              title: 'Generated Caption',
              prompt: 'Describe this crisis map in detail'
            })
          });
        })
        .then(capResponse => capResponse.json())
        .then(capData => {
          setCaptionId(capData.cap_id);
          setDraft(capData.edited || capData.generated);
          setStep(2);
        })
        .catch(err => {
          console.error('Failed to load map data:', err);
          alert('Failed to load map data. Please try again.');
        });
    }
  }, [searchParams]);

  // Handle navigation with confirmation
  const handleNavigation = () => {
    if (step === 2) {
      if (confirm("Changes will not be saved. Do you want to delete the uploaded image?")) {
        // Delete the uploaded image if user confirms
        if (uploadedImageId) {
          fetch(`/api/images/${uploadedImageId}`, { method: "DELETE" }).catch(console.error);
        }
        resetToStep1();
      }
    }
  };

  const resetToStep1 = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setImageUrl(null);
    setCaptionId(null);
    setDraft('');
    setScores({ accuracy: 50, context: 50, usability: 50 });
    setUploadedImageId(null);
    setUploadedCaptionId(null);
  }; 
  const [scores, setScores] = useState({  
    accuracy: 50,
    context:  50,
    usability: 50,
  });

  /* ---- drag-and-drop + file-picker handlers -------------------------- */
  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }, []);

  const onFileChange = useCallback((file: File | undefined, _name: string) => {
    if (file) setFile(file);
  }, []);

  // blob URL / preview
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
    const text = await res.text();        // get raw body
    try {
      return text ? JSON.parse(text) : {};  // valid JSON or empty object
    } catch {
      return { error: text };             // plain text fallback
    }
  }

  function handleApiError(err: any, operation: string) {
    console.error(`${operation} failed:`, err);
    const message = err.message || `Failed to ${operation.toLowerCase()}`;
    alert(message);
  }

  /* ---- generate handler --------------------------------------------- */
  async function handleGenerate() {
    if (!file) return;

    const fd = new FormData();
    fd.append('file', file);
    fd.append('source', source);
    fd.append('type', type);
    fd.append('epsg', epsg);
    fd.append('image_type', imageType);
    countries.forEach((c) => fd.append('countries', c));

    try {
      /* 1) upload */
      const mapRes = await fetch('/api/images/', { method: 'POST', body: fd });
      const mapJson = await readJsonSafely(mapRes);
      if (!mapRes.ok) throw new Error(mapJson.error || 'Upload failed');
      setImageUrl(mapJson.image_url);

      const mapIdVal = mapJson.image_id;
      if (!mapIdVal) throw new Error('Upload failed: image_id not found');
      setUploadedImageId(mapIdVal);
    
      /* 2) caption */
      const capRes = await fetch(
        `/api/images/${mapIdVal}/caption`, 
        { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            title: 'Generated Caption',
            prompt: 'Describe this crisis map in detail'
          })
        },
      );
      const capJson = await readJsonSafely(capRes);
      if (!capRes.ok) throw new Error(capJson.error || 'Caption failed');
      setCaptionId(capJson.cap_id);
      setUploadedCaptionId(capJson.cap_id);
      console.log(capJson);

      /* 3) continue workflow */
      setDraft(capJson.generated);
      setStep(2);
    } catch (err) {
      handleApiError(err, 'Upload');
    }
  }

  /* ---- submit handler --------------------------------------------- */
  async function handleSubmit() {
    if (!captionId) return alert("No caption to submit");
    
    try {
      // 1. Update image metadata
      const metadataBody = {
        source: source,
        type: type,
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
      
      // 2. Update caption
      const captionBody = {
        edited: draft || '', // Use draft if available, otherwise empty string
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
      
      // Clear uploaded IDs since submission was successful
      setUploadedImageId(null);
      setUploadedCaptionId(null);
      setStep(3);
    } catch (err) {
      handleApiError(err, 'Submit');
    }
  }

  /* ---- delete handler --------------------------------------------- */
  async function handleDelete() {
    if (!uploadedImageId) return;
    
    if (confirm("Are you sure you want to delete this uploaded image? This action cannot be undone.")) {
      try {
        // Delete the image (this will cascade delete the caption)
        const res = await fetch(`/api/images/${uploadedImageId}`, {
          method: "DELETE",
        });
        
        if (!res.ok) {
          const json = await readJsonSafely(res);
          throw new Error(json.error || "Delete failed");
        }
        
        // Reset to step 1
        resetToStep1();
      } catch (err) {
        handleApiError(err, 'Delete');
      }
    }
  }

  /* ------------------------------------------------------------------- */
  return (
    <PageContainer>
      <div
        className="mx-auto max-w-screen-lg text-center px-2 sm:px-4 py-6 sm:py-10 overflow-x-hidden"
        data-step={step}
      >
        {/* Title & intro copy */}
        {step === 1 && <>
          <Heading level={2}>Upload Your Crisis Map</Heading>
          <p className="mt-3 text-gray-700 leading-relaxed">
            This app evaluates how well multimodal AI models turn emergency maps
            into meaningful text. Upload your map, let the AI generate a
            description, then review and rate the result based on your expertise.
          </p>
          {/* “More »” link  */}
          <div className="mt-2 flex justify-center">
            <Link
              to="/help"
              className="text-ifrcRed text-xs hover:underline flex items-center gap-1"
            >
              More <ArrowRightLineIcon className="w-3 h-3" />
            </Link>
          </div>
        </>}



        {/* Drop-zone */}
        {step === 1 && (
          <div
            className="mt-6 sm:mt-10 border-2 border-dashed border-gray-300 bg-gray-50 rounded-xl py-12 px-8 flex flex-col items-center gap-6 hover:bg-gray-100 transition-colors max-w-md mx-auto min-h-[300px] justify-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            <UploadCloudLineIcon className="w-10 h-10 text-ifrcRed" />

            {file ? (
              <p className="text-sm font-medium text-gray-800">
                Selected file: {file.name}
              </p>
            ) : (
              <p className="text-sm text-gray-600">Drag &amp; Drop a file here</p>
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
                size={1}
                onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
              >
                {file ? 'Change File' : 'Upload'}
              </Button>
            </label>
          </div>
        )}

        {/* Generate button */}
        {step === 1 && (
          <div className="flex justify-center mt-12">
            <Button
              name="generate"
              disabled={!file}
              onClick={handleGenerate}
            >
              Generate
            </Button>
          </div>
        )}

{step === 2 && imageUrl && (
  <div className="mt-6 flex justify-center">
    <div className="w-full max-w-screen-lg max-h-80 overflow-hidden bg-red-50">
             <img
         src={preview || undefined}
         alt="Uploaded map preview"
         className="w-full h-full object-contain rounded shadow"
       />
    </div>
  </div>
)}

{step === 2 && (
  <div className="space-y-10">
    {/* ────── METADATA FORM ────── */}
    <div className="grid gap-4 text-left grid-cols-1 lg:grid-cols-2">
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
        label="Type"
        name="type"
        value={type}
        onChange={handleTypeChange}
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

    {/* ────── RATING SLIDERS ────── */}
    <div className="text-left">
      <Heading level={3}>How well did the AI perform on the task?</Heading>
      {(['accuracy', 'context', 'usability'] as const).map((k) => (
        <div key={k} className="mt-6 flex items-center gap-2 sm:gap-4">
          <label className="block text-sm font-medium capitalize w-20 sm:w-28 flex-shrink-0">{k}</label>
          <input
            type="range"
            min={0}
            max={100}
            value={scores[k]}
            onChange={(e) =>
              setScores((s) => ({ ...s, [k]: Number(e.target.value) }))
            }
            className="w-full accent-ifrcRed"
          />
          <span className="ml-2 w-8 sm:w-10 text-right tabular-nums flex-shrink-0">{scores[k]}</span>
        </div>
      ))}
    </div>

    {/* ────── AI‑GENERATED CAPTION ────── */}
    <div className="text-left">
      <Heading level={3}>AI‑Generated Caption</Heading>
      <textarea
        className="w-full border rounded p-2 sm:p-3 font-mono mt-2"
        rows={5}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
    </div>

    {/* ────── SUBMIT BUTTON ────── */}
    <div className="flex justify-center gap-4 mt-10">
      <Button
        name="delete"
        variant="secondary"
        onClick={handleDelete}
      >
        Delete
      </Button>
      <Button
        name="submit"
        onClick={handleSubmit}
      >
        Submit
      </Button>
    </div>
          </div>
      )}

      {/* Success page */}
      {step === 3 && (
        <div className="text-center space-y-6">
          <Heading level={2}>Saved!</Heading>
          <p className="text-gray-700">Your caption has been successfully saved.</p>
          <div className="flex justify-center mt-6">
            <Button
              name="upload-another"
              onClick={resetToStep1}
            >
              Upload Another
            </Button>
          </div>
        </div>
      )}
      
      
    </div>
  </PageContainer>
);
}
