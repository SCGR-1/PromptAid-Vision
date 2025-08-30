import React, { useState } from 'react';
import { Button, SegmentInput, Checkbox } from '@ifrc-go/ui';
import styles from './ExportModal.module.css';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (mode: 'standard' | 'fine-tuning', selectedTypes: string[]) => void;
  filteredCount: number;
  totalCount: number;
  hasFilters: boolean;
  crisisMapsCount: number;
  droneImagesCount: number;
  isLoading?: boolean;
  variant?: 'bulk' | 'single';
  onNavigateToList?: () => void;
  onNavigateAndExport?: () => void;
}

export default function ExportModal({
  isOpen,
  onClose,
  onExport,
  filteredCount,
  totalCount,
  hasFilters,
  crisisMapsCount,
  droneImagesCount,
  isLoading = false,
  variant = 'bulk',
  onNavigateToList,
  onNavigateAndExport
}: ExportModalProps) {
  const [exportMode, setExportMode] = useState<'standard' | 'fine-tuning'>('standard');
  const [trainSplit, setTrainSplit] = useState(80);
  const [testSplit, setTestSplit] = useState(10);
  const [valSplit, setValSplit] = useState(10);
  const [crisisMapsSelected, setCrisisMapsSelected] = useState(true);
  const [droneImagesSelected, setDroneImagesSelected] = useState(true);

  const handleExport = () => {
    if (variant === 'single') {
      // For single item export, just export immediately
      onExport(exportMode, ['crisis_map', 'drone_image']); // Export regardless of type
      return;
    }

    // For bulk export, check selections
    if (!crisisMapsSelected && !droneImagesSelected) {
      alert('Please select at least one image type to export.');
      return;
    }
    
    const selectedTypes: string[] = [];
    if (crisisMapsSelected) selectedTypes.push('crisis_map');
    if (droneImagesSelected) selectedTypes.push('drone_image');
    
    onExport(exportMode, selectedTypes);
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  // Single item export UI
  if (variant === 'single') {
    return (
      <div className={styles.fullSizeModalOverlay} onClick={handleClose}>
        <div className={styles.fullSizeModalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.ratingWarningContent}>
            <h3 className={styles.ratingWarningTitle}>Export Single Item</h3>
            
            <div className={styles.singleExportMessage}>
              <p>This only exports the 1 item currently on display.</p>
              <p>You may export the entire dataset from the "list view" here:</p>
            </div>
            
            <div className={styles.navigateButtonContainer}>
              <Button
                name="navigate-to-list"
                variant="secondary"
                onClick={onNavigateAndExport}
              >
                Navigate to List View
              </Button>
            </div>
            
            <div className={styles.ratingWarningButtons}>
              <Button
                name="continue-export"
                onClick={handleExport}
              >
                Continue
              </Button>
              <Button
                name="cancel-export"
                variant="tertiary"
                onClick={handleClose}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Bulk export UI (original functionality)
  return (
    <div className={styles.fullSizeModalOverlay} onClick={handleClose}>
      <div className={styles.fullSizeModalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.ratingWarningContent}>
          <h3 className={styles.ratingWarningTitle}>Export Dataset</h3>
          
          {/* Export Mode Switch */}
          <div className={styles.exportModeSection}>
            <SegmentInput
              name="export-mode"
              value={exportMode}
              onChange={(value) => {
                if (value === 'standard' || value === 'fine-tuning') {
                  setExportMode(value);
                }
              }}
              options={[
                { key: 'standard' as const, label: 'Standard' },
                { key: 'fine-tuning' as const, label: 'Fine-tuning' }
              ]}
              keySelector={(o) => o.key}
              labelSelector={(o) => o.label}
            />
          </div>
          
          {/* Train/Test/Val Split Configuration - Only show for Fine-tuning mode */}
          {exportMode === 'fine-tuning' && (
            <div className={styles.splitConfigSection}>
              <div className={styles.splitConfigTitle}>Dataset Split Configuration</div>
              <div className={styles.splitInputsContainer}>
                <div className={styles.splitInputGroup}>
                  <label htmlFor="train-split" className={styles.splitInputLabel}>Train (%)</label>
                  <input
                    id="train-split"
                    type="number"
                    min="0"
                    max="100"
                    value={trainSplit}
                    onChange={(e) => {
                      const newTrain = parseInt(e.target.value) || 0;
                      const remaining = 100 - newTrain;
                      if (remaining >= 0) {
                        setTrainSplit(newTrain);
                        if (testSplit + valSplit > remaining) {
                          setTestSplit(Math.floor(remaining / 2));
                          setValSplit(remaining - Math.floor(remaining / 2));
                        }
                      }
                    }}
                    className={styles.splitInput}
                  />
                </div>
                
                <div className={styles.splitInputGroup}>
                  <label htmlFor="test-split" className={styles.splitInputLabel}>Test (%)</label>
                  <input
                    id="test-split"
                    type="number"
                    min="0"
                    max="100"
                    value={testSplit}
                    onChange={(e) => {
                      const newTest = parseInt(e.target.value) || 0;
                      const remaining = 100 - trainSplit - newTest;
                      if (remaining >= 0) {
                        setTestSplit(newTest);
                        setValSplit(remaining);
                      }
                    }}
                    className={styles.splitInput}
                  />
                </div>
                
                <div className={styles.splitInputGroup}>
                  <label htmlFor="val-split" className={styles.splitInputLabel}>Val (%)</label>
                  <input
                    id="val-split"
                    type="number"
                    min="0"
                    max="100"
                    value={valSplit}
                    onChange={(e) => {
                      const newVal = parseInt(e.target.value) || 0;
                      const remaining = 100 - trainSplit - newVal;
                      if (remaining >= 0) {
                        setValSplit(newVal);
                        setTestSplit(remaining);
                      }
                    }}
                    className={styles.splitInput}
                  />
                </div>
              </div>
              
              {trainSplit + testSplit + valSplit !== 100 && (
                <div className={styles.splitTotal}>
                  <span className={styles.splitTotalError}>Must equal 100%</span>
                </div>
              )}
            </div>
          )}
          
          <div className={styles.checkboxesContainer}>
            <div className="flex items-center gap-3">
              <Checkbox
                name="crisis-maps"
                label={`Crisis Maps (${crisisMapsCount} images)`}
                value={crisisMapsSelected}
                onChange={(value, _name) => setCrisisMapsSelected(value)}
                disabled={isLoading}
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Checkbox
                name="drone-images"
                label={`Drone Images (${droneImagesCount} images)`}
                value={droneImagesSelected}
                onChange={(value, _name) => setDroneImagesSelected(value)}
                disabled={isLoading}
              />
            </div>
          </div>
          
          <div className={styles.ratingWarningButtons}>
            <Button
              name="confirm-export"
              onClick={handleExport}
            >
              Export Selected
            </Button>
            <Button
              name="cancel-export"
              variant="tertiary"
              onClick={handleClose}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
