import type { DragEvent } from 'react';
import { Button, Container, SegmentInput, IconButton } from '@ifrc-go/ui';
import { UploadCloudLineIcon, ArrowRightLineIcon, DeleteBinLineIcon } from '@ifrc-go/icons';
import { Link } from 'react-router-dom';
import styles from '../../pages/UploadPage/UploadPage.module.css';

interface FileUploadSectionProps {
  files: File[];
  file: File | null;
  preview: string | null;
  imageType: string;
  isManualMode: boolean;
  onFileChange: (file: File | undefined) => void;
  onRemoveImage: (index: number) => void;
  onAddImage: () => void;
  onImageTypeChange: (value: string | undefined) => void;
  onManualModeChange: (value: boolean) => void;
  onChangeFile?: (file: File | undefined) => void;
}

export default function FileUploadSection({
  files,
  file,
  preview,
  imageType,
  isManualMode,
  onFileChange,
  onRemoveImage,
  onAddImage,
  onImageTypeChange,
  onManualModeChange,
  onChangeFile,
}: FileUploadSectionProps) {
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      onFileChange(dropped);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-700 leading-relaxed max-w-2xl mx-auto">
        This app evaluates how well multimodal AI models analyze and describe
        crisis maps and drone imagery. Upload an image and the AI will generate a description.
        Then you can review and rate the result based on your expertise.
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
            onChange={(value) => onImageTypeChange(value as string)}
            options={[
              { key: 'crisis_map', label: 'Crisis Maps' },
              { key: 'drone_image', label: 'Drone Imagery' }
            ]}
            keySelector={(o) => o.key}
            labelSelector={(o) => o.label}
          />
        </Container>
      </div>

      {/* Manual / Generate Mode Selection */}
      <div className="flex justify-center">
        <Container withInternalPadding className="bg-transparent border-none shadow-none">
          <SegmentInput
            name="mode"
            value={isManualMode ? 'manual' : 'generate'}
            onChange={(value) => onManualModeChange(value === 'manual')}
            options={[
              { key: 'manual', label: 'Manual' },
              { key: 'generate', label: 'Generate' }
            ]}
            keySelector={(o) => o.key as 'manual' | 'generate'}
            labelSelector={(o) => o.label}
          />
        </Container>
      </div>
      
             <div
         className={`${styles.dropZone} ${file ? styles.hasFile : ''}`}
         onDragOver={(e) => e.preventDefault()}
         onDrop={onDrop}
       >
         {files.length > 1 ? (
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
             {files.map((file, index) => (
               <div key={index} className="relative">
                 <img
                   src={URL.createObjectURL(file)}
                   alt={`Image ${index + 1}`}
                   className="w-full h-32 object-cover rounded"
                 />
                 <IconButton
                   name="remove-image"
                   variant="tertiary"
                   onClick={() => onRemoveImage(index)}
                   title="Remove image"
                   ariaLabel="Remove image"
                   className="absolute top-2 right-2 bg-white/90 hover:bg-white shadow-md hover:shadow-lg border border-gray-200 hover:border-red-300 transition-all duration-200 backdrop-blur-sm"
                 >
                   <DeleteBinLineIcon className="w-4 h-4" />
                 </IconButton>
                 <div className="text-xs text-center mt-1">{file.name}</div>
               </div>
             ))}
           </div>
         ) : file && preview ? (
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
       
         <div className="flex gap-2">
           <label className="inline-block cursor-pointer">
             <input
               type="file"
               className="sr-only"
               accept=".jpg,.jpeg,.png,.tiff,.tif,.heic,.heif,.webp,.gif,.pdf"
               onChange={e => {
                 if (file && onChangeFile) {
                   // If there's already a file, use onChangeFile to replace it
                   onChangeFile(e.target.files?.[0]);
                 } else {
                   // If no file exists, use onFileChange to add it
                   onFileChange(e.target.files?.[0]);
                 }
               }}
             />
             <Button 
               name="upload" 
               variant="secondary"
               size={1}
               onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
             >
               {file ? 'Change Image' : 'Browse Files'}
             </Button>
           </label>
           
           {file && files.length < 5 && (
             <Button 
               name="add-image" 
               variant="secondary"
               size={1}
               onClick={onAddImage}
             >
               Add Image
             </Button>
           )}
           

         </div>
       </div>
    </div>
  );
}
