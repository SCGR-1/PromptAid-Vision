import { Container, TextArea, Button, IconButton } from '@ifrc-go/ui';
import { DeleteBinLineIcon } from '@ifrc-go/icons';
import styles from '../../pages/UploadPage/UploadPage.module.css';

interface GeneratedTextSectionProps {
  description: string;
  analysis: string;
  recommendedActions: string;
  onDescriptionChange: (value: string | undefined) => void;
  onAnalysisChange: (value: string | undefined) => void;
  onRecommendedActionsChange: (value: string | undefined) => void;
  onBack: () => void;
  onDelete: () => void;
  onSubmit: () => void;
  onEditRatings?: () => void;
  isPerformanceConfirmed?: boolean;
}

export default function GeneratedTextSection({
  description,
  analysis,
  recommendedActions,
  onDescriptionChange,
  onAnalysisChange,
  onRecommendedActionsChange,
  onBack,
  onDelete,
  onSubmit,
  onEditRatings,
  isPerformanceConfirmed = false,
}: GeneratedTextSectionProps) {
  const handleTextChange = (value: string | undefined) => {
    if (value) {
      const lines = value.split('\n');
      const descIndex = lines.findIndex(line => line.startsWith('Description:'));
      const analysisIndex = lines.findIndex(line => line.startsWith('Analysis:'));
      const actionsIndex = lines.findIndex(line => line.startsWith('Recommended Actions:'));
      
      if (descIndex !== -1 && analysisIndex !== -1 && actionsIndex !== -1) {
        onDescriptionChange(lines.slice(descIndex + 1, analysisIndex).join('\n').trim());
        onAnalysisChange(lines.slice(analysisIndex + 1, actionsIndex).join('\n').trim());
        onRecommendedActionsChange(lines.slice(actionsIndex + 1).join('\n').trim());
      }
    }
  };

  return (
    <Container
      heading="Generated Text"
      headingLevel={3}
      withHeaderBorder
      withInternalPadding
    >
      <div className="text-left space-y-4">
        <div>
          <TextArea
            name="generatedContent"
            value={`Description:\n${description || 'AI-generated description will appear here...'}\n\nAnalysis:\n${analysis || 'AI-generated analysis will appear here...'}\n\nRecommended Actions:\n${recommendedActions || 'AI-generated recommended actions will appear here...'}`}
            onChange={handleTextChange}
            rows={12}
            placeholder="AI-generated content will appear here..."
          />
        </div>
      </div>
      
      {/* ────── SUBMIT BUTTONS ────── */}
      <div className={styles.submitSection}>
        <Button
          name="back"
          variant="secondary"
          onClick={onBack}
        >
          Back
        </Button>
        {isPerformanceConfirmed && onEditRatings && (
          <Button
            name="edit-ratings"
            variant="secondary"
            onClick={onEditRatings}
          >
            Edit Ratings
          </Button>
        )}
        <IconButton
          name="delete"
          variant="tertiary"
          onClick={onDelete}
          title="Delete"
          ariaLabel="Delete uploaded image"
        >
          <DeleteBinLineIcon />
        </IconButton>
        <Button
          name="submit"
          onClick={onSubmit}
        >
          Submit
        </Button>
      </div>
    </Container>
  );
}
