import { Button, Spinner } from '@ifrc-go/ui';
import styles from '../../pages/UploadPage/UploadPage.module.css';

interface FullSizeImageModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  preview: string | null;
  selectedImageData?: { file: File; index: number } | null;
  onClose: () => void;
  isLoading?: boolean;
}

export function FullSizeImageModal({ isOpen, imageUrl, preview, selectedImageData, onClose, isLoading = false }: FullSizeImageModalProps) {
  if (!isOpen) return null;

  // Determine which image to show
  let imageSrc: string | undefined;
  let imageAlt: string;

  if (selectedImageData) {
    // Show specific image from multi-upload
    imageSrc = URL.createObjectURL(selectedImageData.file);
    imageAlt = `Image ${selectedImageData.index + 1}: ${selectedImageData.file.name}`;
  } else {
    // Show single image (backward compatibility)
    imageSrc = imageUrl || preview || undefined;
    imageAlt = "Full size map";
  }

  return (
    <div className={styles.fullSizeModalOverlay} onClick={onClose}>
      <div className={styles.fullSizeModalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.fullSizeModalHeader}>
          <Button
            name="close-modal"
            variant="tertiary"
            size={1}
            onClick={onClose}
          >
            ✕
          </Button>
        </div>
        <div className={styles.fullSizeModalImage}>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-2">
                <Spinner className="w-6 h-6" />
                <span>Loading image...</span>
              </div>
            </div>
          ) : (
            <img
              src={imageSrc}
              alt={imageAlt}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface RatingWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RatingWarningModal({ isOpen, onClose }: RatingWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.fullSizeModalOverlay} onClick={onClose}>
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
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ isOpen, onConfirm, onCancel }: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.fullSizeModalOverlay} onClick={onCancel}>
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
              onClick={onConfirm}
            >
              Delete
            </Button>
            <Button
              name="cancel-delete"
              variant="tertiary"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface NavigationConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function NavigationConfirmModal({ isOpen, onConfirm, onCancel }: NavigationConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.fullSizeModalOverlay} onClick={onCancel}>
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
              onClick={onConfirm}
            >
              Leave Page
            </Button>
            <Button
              name="cancel-navigation"
              variant="tertiary"
              onClick={onCancel}
            >
              Stay
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FallbackNotificationModalProps {
  isOpen: boolean;
  fallbackInfo: {
    originalModel: string;
    fallbackModel: string;
    reason: string;
  } | null;
  onClose: () => void;
}

export function FallbackNotificationModal({ isOpen, fallbackInfo, onClose }: FallbackNotificationModalProps) {
  if (!isOpen || !fallbackInfo) return null;

  return (
    <div className={styles.fullSizeModalOverlay} onClick={onClose}>
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
              onClick={onClose}
            >
              Got it
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PreprocessingNotificationModalProps {
  isOpen: boolean;
  preprocessingInfo: {
    original_filename: string;
    processed_filename: string;
    original_mime_type: string;
    processed_mime_type: string;
    was_preprocessed: boolean;
    error?: string;
  } | null;
  onClose: () => void;
}

export function PreprocessingNotificationModal({ isOpen, preprocessingInfo, onClose }: PreprocessingNotificationModalProps) {
  if (!isOpen || !preprocessingInfo) return null;

  return (
    <div className={styles.fullSizeModalOverlay} onClick={onClose}>
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
              onClick={onClose}
            >
              Got it
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PreprocessingModalProps {
  isOpen: boolean;
  preprocessingFile: File | null;
  isPreprocessing: boolean;
  preprocessingProgress: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PreprocessingModal({ 
  isOpen, 
  preprocessingFile, 
  isPreprocessing, 
  preprocessingProgress, 
  onConfirm, 
  onCancel 
}: PreprocessingModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.fullSizeModalOverlay} onClick={isPreprocessing ? undefined : onCancel}>
      <div className={styles.fullSizeModalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.ratingWarningContent}>
          <h3 className={styles.ratingWarningTitle}>File Conversion Required</h3>
          <p className={styles.ratingWarningText}>
            The file you selected will be converted to PNG format.
            This ensures optimal compatibility and processing by our AI models.
          </p>
          {!isPreprocessing && (
            <div className={styles.ratingWarningButtons}>
              <Button
                name="confirm-preprocessing"
                variant="secondary"
                onClick={onConfirm}
              >
                Convert File
              </Button>
              <Button
                name="cancel-preprocessing"
                variant="tertiary"
                onClick={onCancel}
              >
                Cancel
              </Button>
            </div>
          )}
          {isPreprocessing && (
            <div className={styles.preprocessingProgress}>
              <p>{preprocessingProgress}</p>
              <Spinner className="text-ifrcRed" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface UnsupportedFormatModalProps {
  isOpen: boolean;
  unsupportedFile: File | null;
  onClose: () => void;
}

export function UnsupportedFormatModal({ isOpen, unsupportedFile, onClose }: UnsupportedFormatModalProps) {
  if (!isOpen || !unsupportedFile) return null;

  return (
    <div className={styles.fullSizeModalOverlay} onClick={onClose}>
      <div className={styles.fullSizeModalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.ratingWarningContent}>
          <h3 className={styles.ratingWarningTitle}>Unsupported File Format</h3>
          <p className={styles.ratingWarningText}>
            The file <strong>{unsupportedFile.name}</strong> is not supported for upload.
            <br /><br />
            <strong>Supported formats:</strong>
            <br />• Images: JPEG, PNG, TIFF, HEIC, WebP, GIF
            <br />• Documents: PDF (will be converted to image)
            <br /><br />
            <strong>Recommendation:</strong> Convert your file to JPEG or PNG format for best compatibility.
          </p>
          <div className={styles.ratingWarningButtons}>
            <Button
              name="close-unsupported"
              variant="secondary"
              onClick={onClose}
            >
              Got it
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FileSizeWarningModalProps {
  isOpen: boolean;
  oversizedFile: File | null;
  onClose: () => void;
  onCancel: () => void;
}

export function FileSizeWarningModal({ isOpen, oversizedFile, onClose, onCancel }: FileSizeWarningModalProps) {
  if (!isOpen || !oversizedFile) return null;

  return (
    <div className={styles.lightModalOverlay} onClick={onCancel}>
      <div className={styles.fullSizeModalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.ratingWarningContent}>
          <h3 className={styles.ratingWarningTitle}>File Size Warning</h3>
          <p className={styles.ratingWarningText}>
            The file <strong>{oversizedFile.name}</strong> is large ({(oversizedFile.size / (1024 * 1024)).toFixed(1)}MB).
            <br /><br />
            <strong>Warning:</strong> This file size might exceed the limits of the AI models we use.
            <br /><br />
            You can still proceed, but consider using a smaller file if you encounter issues.
          </p>
          <div className={styles.ratingWarningButtons}>
            <Button
              name="continue-size-warning"
              variant="secondary"
              onClick={onClose}
            >
              Continue
            </Button>
            <Button
              name="cancel-size-warning"
              variant="tertiary"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
