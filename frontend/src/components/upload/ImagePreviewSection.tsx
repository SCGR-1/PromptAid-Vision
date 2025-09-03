import { Button, Container } from '@ifrc-go/ui';
import { ChevronLeftLineIcon, ChevronRightLineIcon } from '@ifrc-go/icons';
import styles from '../../pages/UploadPage/UploadPage.module.css';

interface ImagePreviewSectionProps {
  files: File[];
  imageUrl: string | null;
  preview: string | null;
  onViewFullSize: (imageData?: { file: File; index: number }) => void;
  // Carousel props for step 2b
  currentImageIndex?: number;
  onGoToPrevious?: () => void;
  onGoToNext?: () => void;
  onGoToImage?: (index: number) => void;
  showCarousel?: boolean;
}

export default function ImagePreviewSection({
  files,
  imageUrl,
  preview,
  onViewFullSize,
  currentImageIndex = 0,
  onGoToPrevious,
  onGoToNext,
  onGoToImage,
  showCarousel = false,
}: ImagePreviewSectionProps) {
  // If carousel is enabled and multiple files, show carousel
  if (showCarousel && files.length > 1) {
    return (
      <Container heading="Uploaded Images" headingLevel={3} withHeaderBorder withInternalPadding>
        <div className={styles.carouselContainer}>
          <div className={styles.carouselImageWrapper}>
            {files[currentImageIndex] ? (
              <img
                src={URL.createObjectURL(files[currentImageIndex])}
                alt={`Image ${currentImageIndex + 1}`}
                className={styles.carouselImage}
              />
            ) : (
              <div className={styles.imagePlaceholder}>
                No image available
              </div>
            )}
          </div>
          
          {/* Carousel Navigation */}
          <div className={styles.carouselNavigation}>
            <Button
              name="previous-image"
              variant="tertiary"
              size={1}
              onClick={onGoToPrevious}
              className={styles.carouselButton}
            >
              <ChevronLeftLineIcon className="w-4 h-4" />
            </Button>
            
            <div className={styles.carouselIndicators}>
              {files.map((_, index) => (
                <button
                  key={index}
                  onClick={() => onGoToImage?.(index)}
                  className={`${styles.carouselIndicator} ${
                    index === currentImageIndex ? styles.carouselIndicatorActive : ''
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            
            <Button
              name="next-image"
              variant="tertiary"
              size={1}
              onClick={onGoToNext}
              className={styles.carouselButton}
            >
              <ChevronRightLineIcon className="w-4 h-4" />
            </Button>
          </div>
          
          {/* View Image Button for Carousel */}
          <div className={styles.viewImageButtonContainer}>
            <Button
              name="view-full-size-carousel"
              variant="secondary"
              size={1}
              onClick={() => onViewFullSize({ file: files[currentImageIndex], index: currentImageIndex })}
              disabled={!files[currentImageIndex]}
            >
              View Image
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  // Original implementation for single image or non-carousel mode
  if (files.length > 1) {
    return (
      <div className="space-y-6">
        {files.map((file, index) => (
          <Container key={index} heading={`Image ${index + 1}: ${file.name}`} headingLevel={3} withHeaderBorder withInternalPadding>
            <div className={styles.uploadedMapContainer}>
              <div className={styles.uploadedMapImage}>
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Image ${index + 1}`}
                />
              </div>
              <div className={styles.viewFullSizeButton}>
                <Button
                  name={`view-full-size-${index}`}
                  variant="secondary"
                  size={1}
                  onClick={() => onViewFullSize({ file, index })}
                >
                  View Image
                </Button>
              </div>
            </div>
          </Container>
        ))}
      </div>
    );
  }

  return (
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
            onClick={() => onViewFullSize()}
          >
            View Image
          </Button>
        </div>
      </div>
    </Container>
  );
}
