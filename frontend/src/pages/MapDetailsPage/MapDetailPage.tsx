import { PageContainer, Container, Button, Spinner, SegmentInput } from '@ifrc-go/ui';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import styles from './MapDetailPage.module.css';

interface MapOut {
  image_id: string;
  file_key: string;
  sha256: string;
  source: string;
  event_type: string;
  epsg: string;
  image_type: string;
  image_url: string;
  countries: Array<{
    c_code: string;
    label: string;
    r_code: string;
  }>;
  title?: string;
  prompt?: string;
  model?: string;
  schema_id?: string;
  raw_json?: any;
  generated?: string;
  edited?: string;
  accuracy?: number;
  context?: number;
  usability?: number;
  starred?: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function MapDetailPage() {
  const { mapId } = useParams<{ mapId: string }>();
  const navigate = useNavigate();
  const [view, setView] = useState<'explore' | 'mapDetails'>('mapDetails');
  const [map, setMap] = useState<MapOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<{s_code: string, label: string}[]>([]);
  const [types, setTypes] = useState<{t_code: string, label: string}[]>([]);
  const [imageTypes, setImageTypes] = useState<{image_type: string, label: string}[]>([]);
  const [regions, setRegions] = useState<{r_code: string, label: string}[]>([]);

  const viewOptions = [
    { key: 'explore' as const, label: 'Explore' },
    { key: 'mapDetails' as const, label: 'Map Details' }
  ];

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

  useEffect(() => {
    Promise.all([
      fetch('/api/sources').then(r => r.json()),
      fetch('/api/types').then(r => r.json()),
      fetch('/api/image-types').then(r => r.json()),
      fetch('/api/regions').then(r => r.json()),
    ]).then(([sourcesData, typesData, imageTypesData, regionsData]) => {
      setSources(sourcesData);
      setTypes(typesData);
      setImageTypes(imageTypesData);
      setRegions(regionsData);
    }).catch(console.error);
  }, []);

  const [isGenerating, setIsGenerating] = useState(false);

  const handleContribute = async () => {
    if (!map) return;
    
    setIsGenerating(true);
    
    try {
      const res = await fetch('/api/contribute/from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: map.image_url,
          source: map.source,
          event_type: map.event_type,
          epsg: map.epsg,
          image_type: map.image_type,
          countries: map.countries.map(c => c.c_code),
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create contribution');
      }
      
      const json = await res.json();
      const newId = json.image_id as string;
      
      const modelName = localStorage.getItem('selectedVlmModel');
      const capRes = await fetch(`/api/images/${newId}/caption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          title: 'Generated Caption',
          prompt: 'Analyze this crisis map and provide a detailed description of the emergency situation, affected areas, and key information shown in the map.',
          ...(modelName && { model_name: modelName }),
        }),
      });
      
      if (!capRes.ok) {
        const errorData = await capRes.json();
        throw new Error(errorData.error || 'Failed to generate caption');
      }
      
      const url = `/upload?imageUrl=${encodeURIComponent(json.image_url)}&isContribution=true&step=2a&imageId=${newId}`;
      navigate(url);
      
    } catch (error: any) {
      console.error('Contribution failed:', error);
      alert(`Contribution failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
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
      <Container
        heading="Explore"
        headingLevel={2}
        withHeaderBorder
        withInternalPadding
        className="max-w-7xl mx-auto"
      >
        <div className={styles.tabSelector}>
          <SegmentInput
            name="map-details-view"
            value={view}
            onChange={(value) => {
              if (value === 'mapDetails' || value === 'explore') {
                setView(value);
                if (value === 'explore') {
                  navigate('/explore');
                }
              }
            }}
            options={viewOptions}
            keySelector={(o) => o.key}
            labelSelector={(o) => o.label}
          />
        </div>

        {view === 'mapDetails' ? (
          <>
            <div className={styles.gridLayout}>
              {/* Image Section */}
              <Container
                heading={map.title || "Map Image"}
                headingLevel={2}
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
                  heading="Tags"
                  headingLevel={3}
                  withHeaderBorder
                  withInternalPadding
                  spacing="comfortable"
                >
                  <div className={styles.metadataTags}>
                    <span className={styles.metadataTag}>
                      {sources.find(s => s.s_code === map.source)?.label || map.source}
                    </span>
                    <span className={styles.metadataTag}>
                      {types.find(t => t.t_code === map.event_type)?.label || map.event_type}
                    </span>
                    <span className={styles.metadataTag}>
                      {imageTypes.find(it => it.image_type === map.image_type)?.label || map.image_type}
                    </span>
                    {map.countries && map.countries.length > 0 && (
                      <>
                        <span className={styles.metadataTag}>
                          {regions.find(r => r.r_code === map.countries[0].r_code)?.label || 'Unknown Region'}
                        </span>
                        <span className={styles.metadataTag}>
                          {map.countries.map(country => country.label).join(', ')}
                        </span>
                      </>
                    )}
                  </div>
                </Container>

                <Container
                  heading="Description"
                  headingLevel={3}
                  withHeaderBorder
                  withInternalPadding
                  spacing="comfortable"
                >
                  <div className={styles.captionContainer}>
                    {map.generated ? (
                      <div className={styles.captionText}>
                        <p>{map.edited || map.generated}</p>
                      </div>
                    ) : (
                      <p>— no caption yet —</p>
                    )}
                  </div>
                </Container>
              </div>
            </div>

            {/* Contribute Section */}
            <div className="flex justify-center mt-8">
              <Button
                name="contribute"
                onClick={handleContribute}
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Contribute'}
              </Button>
            </div>
          </>
        ) : null}
      </Container>
    </PageContainer>
  );
} 