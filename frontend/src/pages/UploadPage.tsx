import { useCallback, useState } from 'react';
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
  /* ---------------- local state ----------------- */
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [source,    setSource]    = useState('');
  const [region,    setRegion]    = useState('');
  const [category,  setCategory]  = useState('');
  const [countries, setCountries] = useState<string[]>([]);

  // Wrapper functions to handle OptionKey to string conversion
  const handleSourceChange = (value: any) => setSource(String(value));
  const handleRegionChange = (value: any) => setRegion(String(value));
  const handleCategoryChange = (value: any) => setCategory(String(value));
  const handleCountriesChange = (value: any) => setCountries(Array.isArray(value) ? value.map(String) : []);

  /* ---- drag-and-drop + file-picker handlers -------------------------- */
  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }, []);

  const onFileChange = useCallback((file: File | undefined, _name: string) => {
    if (file) setFile(file);
  }, []);

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
      const res = await fetch('/api/maps', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      navigate(`/review/${json.mapId}`);
    } catch (err) {
      // basic alert for now; replace with toast later
      alert((err as Error).message);
    }
  }

  /* ------------------------------------------------------------------- */
  return (
    <PageContainer>
      <div className="mx-auto max-w-3xl text-center px-4 py-10">
        {/* Title & intro copy */}
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

        {/* ----- metadata form ----------------------------------------- */}
        <div className="grid gap-4 mt-8 text-left sm:grid-cols-2">
          <SelectInput
            label="Source"
            name="source"
            value={source}
            onChange={handleSourceChange}
            options={[
              { value: 'UNOSAT', label: 'UNOSAT' },
              { value: 'FIELD', label: 'Field HQ' },
            ]}
            keySelector={(option) => option.value}
            labelSelector={(option) => option.label}
            required
          />
          <SelectInput
            label="Region"
            name="region"
            value={region}
            onChange={handleRegionChange}
            options={[
              { value: 'AFR', label: 'Africa' },
              { value: 'AMR', label: 'Americas' },
              { value: 'APA', label: 'Asia-Pacific' },
              { value: 'EUR', label: 'Europe' },
              { value: 'MENA', label: 'Middle East & North Africa' },
            ]}
            keySelector={(option) => option.value}
            labelSelector={(option) => option.label}
            required
          />
          <SelectInput
            label="Category"
            name="category"
            value={category}
            onChange={handleCategoryChange}
            options={[
              { value: 'FLOOD', label: 'Flood' },
              { value: 'WILDFIRE', label: 'Wildfire' },
              { value: 'EARTHQUAKE', label: 'Earthquake' },
            ]}
            keySelector={(option) => option.value}
            labelSelector={(option) => option.label}
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
            keySelector={(option) => option.value}
            labelSelector={(option) => option.label}
            placeholder="Select one or more"
          />
        </div>

        {/* Drop-zone */}
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

        {/* Generate button */}
        <Button
          name="generate"
          className="mt-8"
          disabled={!file || !source || !region || !category}
          onClick={handleGenerate}
        >
          Generate
        </Button>
      </div>
    </PageContainer>
  );
}
