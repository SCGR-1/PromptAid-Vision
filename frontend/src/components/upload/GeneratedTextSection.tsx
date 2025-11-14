import { useState, useEffect } from 'react';
import { Container, TextArea, Button, IconButton } from '@ifrc-go/ui';
import { DeleteBinLineIcon } from '@ifrc-go/icons';
import styles from '../../pages/UploadPage/UploadPage.module.css';

interface GeneratedTextSectionProps {
  description: string;
  analysis: string;
  recommendedActions: string;
  isManualMode?: boolean;
  onDescriptionChange: (value: string | undefined) => void;
  onAnalysisChange: (value: string | undefined) => void;
  onRecommendedActionsChange: (value: string | undefined) => void;
  onBack: () => void;
  onDelete: () => void;
  onSubmit: () => void;
  onEditRatings?: () => void;
  isPerformanceConfirmed?: boolean;
  isSubmitting?: boolean;
}

export default function GeneratedTextSection({
  description,
  analysis,
  recommendedActions,
  isManualMode = false,
  onDescriptionChange,
  onAnalysisChange,
  onRecommendedActionsChange,
  onBack,
  onDelete,
  onSubmit,
  onEditRatings,
  isPerformanceConfirmed = false,
  isSubmitting = false,
}: GeneratedTextSectionProps) {
  // Local state to maintain the textarea value and cursor position
  const [textareaValue, setTextareaValue] = useState('');
  
  // Update local state when props change (e.g., when AI generates new content)
  useEffect(() => {
    // For manual mode, don't show placeholders - use empty strings
    if (isManualMode) {
      const formattedText = `Description:\n${description}\n\nAnalysis:\n${analysis}\n\nRecommended Actions:\n${recommendedActions}`;
      setTextareaValue(formattedText);
    } else {
      const formattedText = `Description:\n${description || 'AI-generated description will appear here...'}\n\nAnalysis:\n${analysis || 'AI-generated analysis will appear here...'}\n\nRecommended Actions:\n${recommendedActions || 'AI-generated recommended actions will appear here...'}`;
      setTextareaValue(formattedText);
    }
  }, [description, analysis, recommendedActions, isManualMode]);

  const handleTextChange = (value: string | undefined) => {
    if (value !== undefined) {
      setTextareaValue(value);
      
      // Parse the text and update the individual sections
      const lines = value.split('\n');
      const descIndex = lines.findIndex(line => line.startsWith('Description:'));
      const analysisIndex = lines.findIndex(line => line.startsWith('Analysis:'));
      const actionsIndex = lines.findIndex(line => line.startsWith('Recommended Actions:'));
      
      if (descIndex !== -1 && analysisIndex !== -1 && actionsIndex !== -1) {
        const newDescription = lines.slice(descIndex + 1, analysisIndex).join('\n').trim();
        const newAnalysis = lines.slice(analysisIndex + 1, actionsIndex).join('\n').trim();
        const newRecommendedActions = lines.slice(actionsIndex + 1).join('\n').trim();
        
        // Update parent state only if values have changed
        if (newDescription !== description) {
          onDescriptionChange(newDescription);
        }
        if (newAnalysis !== analysis) {
          onAnalysisChange(newAnalysis);
        }
        if (newRecommendedActions !== recommendedActions) {
          onRecommendedActionsChange(newRecommendedActions);
        }
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
            value={textareaValue}
            onChange={handleTextChange}
            rows={12}
            placeholder={isManualMode ? "" : "AI-generated content will appear here..."}
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
          disabled={isSubmitting}
        >
          Submit
        </Button>
      </div>
    </Container>
  );
}
