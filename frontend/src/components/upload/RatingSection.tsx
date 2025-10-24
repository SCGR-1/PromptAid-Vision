import { Button, Container } from '@ifrc-go/ui';
import styles from '../../pages/UploadPage/UploadPage.module.css';

interface RatingSectionProps {
  isPerformanceConfirmed: boolean;
  scores: {
    accuracy: number;
    context: number;
    usability: number;
  };
  onScoreChange: (key: 'accuracy' | 'context' | 'usability', value: number) => void;
  onConfirmRatings: () => void;
  onEditRatings: () => void;
}

export default function RatingSection({
  isPerformanceConfirmed,
  scores,
  onScoreChange,
  onConfirmRatings,
}: RatingSectionProps) {
  // Don't render anything if ratings are confirmed
  if (isPerformanceConfirmed) {
    return null;
  }

  return (
    <Container
      heading="AI Performance Rating"
      headingLevel={3}
      withHeaderBorder
      withInternalPadding
    >
      <div className={styles.ratingContent}>
        <p className={styles.ratingDescription}>How well did the AI perform on the task?</p>
        {(['accuracy', 'context', 'usability'] as const).map((k) => (
          <div key={k} className={styles.ratingSlider}>
            <label className={styles.ratingLabel}>{k}</label>
            <input
              type="range"
              min={0}
              max={100}
              value={scores[k]}
              onChange={(e) => onScoreChange(k, Number(e.target.value))}
              className={styles.ratingInput}
            />
            <span className={styles.ratingValue}>{scores[k]}</span>
          </div>
        ))}
        <div className={styles.confirmButtonContainer}>
          <Button
            name="confirm-ratings"
            variant="secondary"
            onClick={onConfirmRatings}
          >
            Confirm Ratings
          </Button>
        </div>
      </div>
    </Container>
  );
}
