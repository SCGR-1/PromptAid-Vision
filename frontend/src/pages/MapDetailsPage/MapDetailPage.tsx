import { PageContainer, Button, Container, Spinner } from '@ifrc-go/ui';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import styles from './MapDetailPage.module.css';

interface MapOut {
  image_id: string;
  file_key: string;
  image_url: string;
  source: string;
  event_type: string;
  epsg: string;
  image_type: string;
  countries?: Array<{
    c_code: string;
    label: string;
    r_code: string;
  }>;
  captions?: Array<{
    title: string;
    generated: string;
    edited?: string;
            cap_id?: string;
  }>;
}

export default function MapDetailPage() {
  const { mapId } = useParams<{ mapId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const captionId = searchParams.get('captionId');
  const [map, setMap] = useState<MapOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    if (!mapId) {
      setError('Map ID is required');
      setLoading(false);
      return;
    }

    fetch(`/api/images/${mapId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Map not found');
        }
        return response.json();
      })
      .then(data => {
        setMap(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [mapId]);

  const handleContribute = () => {
    if (!map) return;
    
    const url = captionId ? 
      `/upload?mapId=${map.image_id}&step=2&captionId=${captionId}` : 
      `/upload?mapId=${map.image_id}&step=2`;
    navigate(url);
  };

  if (loading) {
    return (
      <PageContainer>
        <div className={styles.loadingContainer}>
          <div className="flex flex-col items-center gap-4">
            <Spinner className="text-ifrcRed" />
            <div>Loading map details...</div>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error || !map) {
    return (
      <PageContainer>
        <div className={styles.errorContainer}>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="text-4xl">⚠️</div>
            <div className="text-xl font-semibold">Unable to load map</div>
            <div>{error || 'Map not found'}</div>
            <Button
              name="back-to-explore"
              variant="secondary"
              onClick={() => navigate('/explore')}
            >
              Return to Explore
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className={styles.backButton}>
        <Button
          name="back"
          variant="secondary"
          onClick={() => navigate('/explore')}
        >
          ← Back to Explore
        </Button>
      </div>

      <div className={styles.gridLayout}>
        {/* Image Section */}
        <Container
          heading="Map Image"
          headingLevel={3}
          withHeaderBorder
          withInternalPadding
          spacing="comfortable"
        >
          <div className={styles.imageContainer}>
            {map.image_url ? (
              <img
                src={map.image_url}
                alt={map.file_key}
              />
            ) : (
              <div className={styles.imagePlaceholder}>
                No image available
              </div>
            )}
          </div>
        </Container>

        {/* Details Section */}
        <div className={styles.detailsSection}>
          <Container
            heading="Title"
            headingLevel={3}
            withHeaderBorder
            withInternalPadding
            spacing="comfortable"
          >
            <div className="text-gray-700">
              {map.captions && map.captions.length > 0 ? map.captions[0].title : '— no title —'}
            </div>
          </Container>

          <Container
            heading="Metadata"
            headingLevel={3}
            withHeaderBorder
            withInternalPadding
            spacing="comfortable"
          >
            <div className={styles.metadataTags}>
              <span className={styles.metadataTag}>
                {map.source}
              </span>
              <span className={styles.metadataTag}>
                {map.event_type}
              </span>
              <span className={styles.metadataTag}>
                {map.epsg}
              </span>
              <span className={styles.metadataTag}>
                {map.image_type}
              </span>
            </div>
          </Container>

          <Container
            heading="Generated Caption"
            headingLevel={3}
            withHeaderBorder
            withInternalPadding
            spacing="comfortable"
          >
            <div className={styles.captionContainer}>
              {map.captions && map.captions.length > 0 ? (
                map.captions.map((caption, index) => (
                  <div 
                    key={index} 
                    className={`${styles.captionText} ${
                      captionId && map.captions && map.captions[index] && 
                      'cap_id' in map.captions[index] && 
                      map.captions[index].cap_id === captionId ? 
                      styles.highlightedCaption : ''
                    }`}
                  >
                    <p>{caption.edited || caption.generated}</p>
                    {captionId && map.captions && map.captions[index] && 
                     'cap_id' in map.captions[index] && 
                     map.captions[index].cap_id === captionId && (
                      <div className={styles.captionHighlight}>
                        ← This is the caption you selected
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p>— no caption yet —</p>
              )}
            </div>
          </Container>
        </div>
      </div>

      {/* Contribute Section */}
      <div className={styles.contributeSection}>
        <Button
          name="contribute"
          onClick={handleContribute}
          className={styles.contributeButton}
        >
          Contribute
        </Button>
      </div>
    </PageContainer>
  );
} 