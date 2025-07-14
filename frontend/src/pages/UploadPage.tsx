/*  UploadPage.tsx  ------------------------------------------------------ */
import { useCallback, useState } from 'react';
import type { DragEvent } from 'react';
import {
  PageContainer,
  Heading,
  Button,
  RawFileInput,   // thin wrapper around <input type="file">
  Container,
} from '@ifrc-go/ui';
import {
  UploadCloudLineIcon,
  ArrowRightLineIcon,
} from '@ifrc-go/icons';
import { Link } from 'react-router-dom';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);

  /* ---- drag-and-drop + file-picker handlers -------------------------- */
  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }, []);

  const onFileChange = useCallback<
    React.ChangeEventHandler<HTMLInputElement>
  >((e) => {
    const chosen = e.target.files?.[0];
    if (chosen) setFile(chosen);
  }, []);

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

        {/* Drop-zone */}
        <div
          className="mt-10 border-2 border-dashed border-gray-300 bg-gray-50
                     rounded-xl p-10 flex flex-col items-center gap-4
                     hover:bg-gray-100 transition-colors"
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
              <p className="text-sm text-gray-600">
                Drag &amp; Drop a file here
              </p>
              <p className="text-xs text-gray-500">or</p>

              {/* File-picker button */}
              <input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                  Upload
                </button>
              </label>
            </>
          )}
        </div>

        {/* Generate button */}
        <Button
          name="generate"
          className="mt-8"
          disabled={!file}
          onClick={() => {
            /* TODO: POST /maps, then POST /maps/{id}/caption */
          }}
        >
          Generate
        </Button>
      </div>
    </PageContainer>
  );
}
