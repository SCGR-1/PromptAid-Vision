import { useCallback, useState, useEffect } from 'react';
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
import { Link, useNavigate } from 'react-router-dom';

export default function UploadPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [preview, setPreview] = useState<string | null>(null);
  /* ---------------- local state ----------------- */
  const navigate = useNavigate();

  const PH_SOURCE   = "_TBD_SOURCE";
  const PH_REGION   = "_TBD_REGION";
  const PH_CATEGORY = "_TBD_CATEGORY";

  const [file, setFile] = useState<File | null>(null);
  //const [source,    setSource]    = useState('');
  //const [region,    setRegion]    = useState('');
  //const [category,  setCategory]  = useState('');
  const [source,   setSource]   = useState(PH_SOURCE);
  const [region,   setRegion]   = useState(PH_REGION);
  const [category, setCategory] = useState(PH_CATEGORY);
  const [countries, setCountries] = useState<string[]>([]);
  const [captionId, setCaptionId] = useState<string | null>(null);

  // Wrapper functions to handle OptionKey to string conversion
  const handleSourceChange = (value: any) => setSource(String(value));
  const handleRegionChange = (value: any) => setRegion(String(value));
  const handleCategoryChange = (value: any) => setCategory(String(value));
  const handleCountriesChange = (value: any) => setCountries(Array.isArray(value) ? value.map(String) : []);

  const [draft, setDraft] = useState(''); 
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

  /* ---- generate handler --------------------------------------------- */
  async function handleGenerate() {
    if (!file) return;

    const fd = new FormData();
    fd.append('file', file);
    fd.append('source', source);
    fd.append('region', region);
    fd.append('category', category);
    countries.forEach((c) => fd.append('countries', c));

    try {
      /* 1) upload */
      const mapRes  = await fetch('/api/maps', { method: 'POST', body: fd });
      const mapJson = await readJsonSafely(mapRes);
      if (!mapRes.ok) throw new Error(mapJson.error || 'Upload failed');
    
      /* 2) caption */
      const capRes = await fetch(
        `/api/maps/${mapJson.mapId}/caption`, 
        { method: 'POST' },
      );
      const capJson = await readJsonSafely(capRes);
      if (!capRes.ok) throw new Error(capJson.error || 'Caption failed');
    
      /* 3) continue workflow */
      setCaptionId(capJson.captionId);
      setDraft(capJson.generated);
      setStep(2);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  /* ------------------------------------------------------------------- */
  return (
    <PageContainer>
      <div className="mx-auto max-w-3xl text-center px-4 py-10">
        {/* Title & intro copy */}
        {step === 1 && <>
          <Heading level={2}>Upload Your Crisis Map</Heading>
          <p className="mt-3 text-gray-700 leading-relaxed">
            This app evaluates how well multimodal AI models turn emergency maps
            into meaningful text. Upload your map, let the AI generate a
            description, then review and rate the result based on your expertise.
          </p>
          {/* “More »” link  */}
          <div className="mt-2">
            <Link
              to="/help"
              className="text-ifrcRed text-xs hover:underline flex items-center gap-1"
            >
              More <ArrowRightLineIcon className="w-3 h-3" />
            </Link>
          </div>
        </>}

        {/* Show uploaded image in step 2 */}
        {step === 2 && preview &&(
          <div className="mt-6 flex justify-center">
            <img
              src={preview}
              alt="Uploaded map preview"
              className="max-h-80 rounded shadow"
            />
          </div>
        )}

        {/* Drop-zone */}
        {step === 1 && (
          <div
            className="mt-10 border-2 border-dashed border-gray-300 bg-gray-50 rounded-xl p-10 flex flex-col items-center gap-4 hover:bg-gray-100 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            <UploadCloudLineIcon className="w-10 h-10 text-ifrcRed" />

            {file ? (
              <p className="text-sm font-medium text-gray-800">
                Selected file: {file.name}
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-600">Drag &amp; Drop a file here</p>
                <p className="text-xs text-gray-500">or</p>

                {/* File-picker button */}
                <RawFileInput name="file" accept="image/*" onChange={onFileChange}>
                  <Button name="upload" size={1}>
                    Upload
                  </Button>
                </RawFileInput>
              </>
            )}
          </div>
        )}

        {/* Generate button */}
        {step === 1 && (
          <Button
            name="generate"
            className="mt-8"
            disabled={!file}
            onClick={handleGenerate}
          >
            Generate
          </Button>
        )}


{step === 2 && (
  <div className="space-y-10">
    {/* ────── METADATA FORM ────── */}
    <div className="grid gap-4 text-left sm:grid-cols-2">
      <SelectInput
        label="Source"
        name="source"
        value={source}
        onChange={handleSourceChange}
        options={[
          { value: 'UNOSAT', label: 'UNOSAT' },
          { value: 'FIELD',  label: 'Field HQ' },
        ]}
        keySelector={(o) => o.value}
        labelSelector={(o) => o.label}
        required
      />
      <SelectInput
        label="Region"
        name="region"
        value={region}
        onChange={handleRegionChange}
        options={[
          { value: 'AFR',  label: 'Africa' },
          { value: 'AMR',  label: 'Americas' },
          { value: 'APA',  label: 'Asia‑Pacific' },
          { value: 'EUR',  label: 'Europe' },
          { value: 'MENA', label: 'Middle East & N Africa' },
        ]}
        keySelector={(o) => o.value}
        labelSelector={(o) => o.label}
        required
      />
      <SelectInput
        label="Category"
        name="category"
        value={category}
        onChange={handleCategoryChange}
        options={[
          { value: 'FLOOD',      label: 'Flood' },
          { value: 'WILDFIRE',   label: 'Wildfire' },
          { value: 'EARTHQUAKE', label: 'Earthquake' },
        ]}
        keySelector={(o) => o.value}
        labelSelector={(o) => o.label}
        required
      />
      <MultiSelectInput
        label="Countries (optional)"
        name="countries"
        value={countries}
        onChange={handleCountriesChange}
        options={[
          { value: 'PH', label: 'Philippines' },
          { value: 'ID', label: 'Indonesia' },
          { value: 'VN', label: 'Vietnam' },
        ]}
        keySelector={(o) => o.value}
        labelSelector={(o) => o.label}
        placeholder="Select one or more"
      />
    </div>

    {/* ────── RATING SLIDERS ────── */}
    <div className="text-left">
      <Heading level={3}>How well did the AI perform on the task?</Heading>
      {(['accuracy', 'context', 'usability'] as const).map((k) => (
        <div key={k} className="mt-6 flex items-center gap-4">
          <label className="block text-sm font-medium capitalize w-28">{k}</label>
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
          <span className="ml-2 w-10 text-right tabular-nums">{scores[k]}</span>
        </div>
      ))}
    </div>

    {/* ────── AI‑GENERATED CAPTION ────── */}
    <div className="text-left">
      <Heading level={3}>AI‑Generated Caption</Heading>
      <textarea
        className="w-full border rounded p-3 font-mono mt-2"
        rows={5}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
    </div>

    {/* ────── SUBMIT BUTTON ────── */}
    <Button
      name="submit"
      className="mt-10"
      onClick={() =>
        alert('Stub saved – wire PUT /api/captions/:id later')
      }
    >
      Submit
    </Button>
  </div>
)}
        
        
      </div>
    </PageContainer>
  );
}
