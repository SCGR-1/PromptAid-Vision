import { PageContainer, Heading, Button } from '@ifrc-go/ui';
import { useNavigate } from 'react-router-dom';
import { useFilterContext } from '../contexts/FilterContext';
import styles from './HelpPage.module.css';

export default function HelpPage() {
  const navigate = useNavigate();
  const { setShowReferenceExamples } = useFilterContext();

  const handleUploadNow = () => {
    navigate('/upload');
  };

  const handleSeeExamples = () => {
    setShowReferenceExamples(true);
    navigate('/explore');
  };

  const handleViewVlmDetails = () => {
    navigate('/analytics?view=crisis_maps');
  };

  return (
    <PageContainer className="py-10">
      <div className={styles.helpContainer}>
        <div className="space-y-8">
          <div className={styles.helpSection}>
            <div className={styles.sectionHeader}>
              <Heading level={3} className={styles.sectionTitle}>Introduction</Heading>
            </div>
            <div className={styles.sectionContent}>
              In collaboration with the IFRC, PromptAid Vision is a tool that generates textual descriptions of crisis maps/crisis drone images utiliing Visual language models.
              This prototype is for collecting data for the fine-tuning of our own models. We aim to utilize AI tools to support national societies with rapid decision making during 
              emergencies. 
            </div>
            <div className={styles.buttonContainer}>
              <Button
                name="upload-now"
                variant="secondary"
                onClick={handleUploadNow}
              >
                Upload now →
              </Button>
            </div>
          </div>

          <div className={styles.helpSection}>
            <div className={styles.sectionHeader}>
              <Heading level={3} className={styles.sectionTitle}>Guidelines</Heading>
            </div>
            <div className={styles.sectionContent}>
              To make the process smoother, please follow the guidelines below:
              <ul className={styles.guidelinesList}>
                <li>Avoid uploading images that are not crisis maps/crisis drone images.</li>
                <li>Confirm the image details prior to modifying the description.</li>
                <li>Before the modification, please read the description generated and provide a rating via the rating sliders.</li>
                <li>Click the "Submit" button to save the description.</li>
              </ul>
            </div>
            <div className={styles.buttonContainer}>
              <Button
                name="see-examples"
                variant="secondary"
                onClick={handleSeeExamples}
              >
                See examples →
              </Button>
            </div>
          </div>

          <div className={styles.helpSection}>
            <div className={styles.sectionHeader}>
              <Heading level={3} className={styles.sectionTitle}>VLMs</Heading>
            </div>
            <div className={styles.sectionContent}>
              PromptAid Vision uses a variety of Visual Language Models (VLMs). A random VLM is selected for each upload. Therefore feel free to delete
              and reupload. You can view performance details here:
            </div>
            <div className={styles.buttonContainer}>
              <Button
                name="view-vlm-details"
                variant="secondary"
                onClick={handleViewVlmDetails}
              >
                View VLM details →
              </Button>
            </div>
          </div>

          <div className={styles.helpSection}>
            <div className={styles.sectionHeader}>
              <Heading level={3} className={styles.sectionTitle}>Dataset</Heading>
            </div>
            <div className={styles.sectionContent}>
              All users are able to export the dataset. You could apply filters when exporting, and it have the option to organize based on model fine-tuning formats.
            </div>
            <div className={styles.buttonContainer}>
              <Button
                name="export-dataset"
                variant="secondary"
                onClick={() => {
                  setShowReferenceExamples(false);
                  navigate('/explore');
                  setTimeout(() => {
                    const exportButton = document.querySelector('[name="export-dataset"]') as HTMLButtonElement;
                    if (exportButton) {
                      exportButton.click();
                    }
                  }, 100);
                }}
              >
                Export dataset →
              </Button>
            </div>
          </div>

          <div className={styles.helpSection}>
            <div className={styles.sectionHeader}>
              <Heading level={3} className={styles.sectionTitle}>Contact us</Heading>
            </div>
            <div className={styles.sectionContent}>
              Need help or have questions about PromptAid Vision? Our team is here to support you.
            </div>
            <div className={styles.buttonContainer}>
              <Button
                name="contact-support"
                variant="secondary"
                disabled={true}
              >
                Get in touch →
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
