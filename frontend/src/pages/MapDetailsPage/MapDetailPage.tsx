import { PageContainer, Container, Button, Spinner, SegmentInput, TextInput, SelectInput, MultiSelectInput } from '@ifrc-go/ui';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { ChevronLeftLineIcon, ChevronRightLineIcon } from '@ifrc-go/icons';
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
  const [countries, setCountries] = useState<{c_code: string, label: string, r_code: string}[]>([]);
  
  // Carousel state
  const [hasPrevious, setHasPrevious] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Search and filter state
  const [search, setSearch] = useState('');
  const [srcFilter, setSrcFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');

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

    fetchMapData(mapId);
  }, [mapId]);

  const fetchMapData = async (id: string) => {
    setIsNavigating(true);
    setLoading(true);
    
    try {
      const response = await fetch(`/api/images/${id}`);
      if (!response.ok) {
        throw new Error('Map not found');
      }
      const data = await response.json();
      setMap(data);
      
      // Check for previous/next items
      await checkNavigationAvailability(id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsNavigating(false);
    }
  };

  const checkNavigationAvailability = async (currentId: string) => {
    try {
      // Fetch all image IDs to determine navigation
      const response = await fetch('/api/images');
      if (response.ok) {
        const images = await response.json();
        const currentIndex = images.findIndex((img: any) => img.image_id === currentId);
        
        setHasPrevious(images.length > 1 && currentIndex > 0);
        setHasNext(images.length > 1 && currentIndex < images.length - 1);
      }
    } catch (error) {
      console.error('Failed to check navigation availability:', error);
    }
  };

  const navigateToItem = async (direction: 'previous' | 'next') => {
    if (isNavigating) return;
    
    try {
      const response = await fetch('/api/images');
      if (!response.ok) return;
      
      const images = await response.json();
      const currentIndex = images.findIndex((img: any) => img.image_id === mapId);
      
      let targetIndex: number;
      if (direction === 'previous') {
        // Wrap around to the last item if at the beginning
        targetIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
      } else {
        // Wrap around to the first item if at the end
        targetIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
      }
      
      const targetId = images[targetIndex].image_id;
      navigate(`/map/${targetId}`);
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/sources').then(r => r.json()),
      fetch('/api/types').then(r => r.json()),
      fetch('/api/image-types').then(r => r.json()),
      fetch('/api/regions').then(r => r.json()),
      fetch('/api/countries').then(r => r.json()),
    ]).then(([sourcesData, typesData, imageTypesData, regionsData, countriesData]) => {
      setSources(sourcesData);
      setTypes(typesData);
      setImageTypes(imageTypesData);
      setRegions(regionsData);
      setCountries(countriesData);
    }).catch(console.error);
  }, []);

  const [isGenerating, setIsGenerating] = useState(false);
  
  // Filter the current map based on search and filter criteria
  const filteredMap = useMemo(() => {
    if (!map) return null;
    
    // Check if map matches search criteria
    const matchesSearch = !search || 
      map.title?.toLowerCase().includes(search.toLowerCase()) ||
      map.generated?.toLowerCase().includes(search.toLowerCase()) ||
      map.source?.toLowerCase().includes(search.toLowerCase()) ||
      map.event_type?.toLowerCase().includes(search.toLowerCase());
    
    // Check if map matches filter criteria
    const matchesSource = !srcFilter || map.source === srcFilter;
    const matchesCategory = !catFilter || map.event_type === catFilter;
    const matchesRegion = !regionFilter || 
      map.countries.some(country => country.r_code === regionFilter);
    const matchesCountry = !countryFilter || 
      map.countries.some(country => country.c_code === countryFilter);
    
    return matchesSearch && matchesSource && matchesCategory && matchesRegion && matchesCountry ? map : null;
  }, [map, search, srcFilter, catFilter, regionFilter, countryFilter]);

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

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2 flex-1 min-w-[300px]">
              <TextInput
                name="search"
                placeholder="Search examples..."
                value={search}
                onChange={(v) => setSearch(v || '')}
              />
            </Container>

            <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2">
              <SelectInput
                name="source"
                placeholder="All Sources"
                options={sources}
                value={srcFilter || null}
                onChange={(v) => setSrcFilter(v as string || '')}
                keySelector={(o) => o.s_code}
                labelSelector={(o) => o.label}
                required={false}
              />
            </Container>

            <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2">
              <SelectInput
                name="category"
                placeholder="All Categories"
                options={types}
                value={catFilter || null}
                onChange={(v) => setCatFilter(v as string || '')}
                keySelector={(o) => o.t_code}
                labelSelector={(o) => o.label}
                required={false}
              />
            </Container>

            <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2">
              <SelectInput
                name="region"
                placeholder="All Regions"
                options={regions}
                value={regionFilter || null}
                onChange={(v) => setRegionFilter(v as string || '')}
                keySelector={(o) => o.r_code}
                labelSelector={(o) => o.label}
                required={false}
              />
            </Container>

            <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2">
              <MultiSelectInput
                name="country"
                placeholder="All Countries"
                options={countries}
                value={countryFilter ? [countryFilter] : []}
                onChange={(v) => setCountryFilter((v as string[])[0] || '')}
                keySelector={(o) => o.c_code}
                labelSelector={(o) => o.label}
              />
            </Container>
          </div>
        </div>

        {view === 'mapDetails' ? (
          <div className="relative">
            {filteredMap ? (
              <>
                <div className={styles.gridLayout}>
                  {/* Image Section */}
                  <Container
                    heading={filteredMap.title || "Map Image"}
                    headingLevel={2}
                    withHeaderBorder
                    withInternalPadding
                    spacing="comfortable"
                  >
                    <div className={styles.imageContainer}>
                      {filteredMap.image_url ? (
                        <img
                          src={filteredMap.image_url}
                          alt={filteredMap.file_key}
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
                          {sources.find(s => s.s_code === filteredMap.source)?.label || filteredMap.source}
                        </span>
                        <span className={styles.metadataTag}>
                          {types.find(t => t.t_code === filteredMap.event_type)?.label || filteredMap.event_type}
                        </span>
                        <span className={styles.metadataTag}>
                          {imageTypes.find(it => it.image_type === filteredMap.image_type)?.label || filteredMap.image_type}
                        </span>
                        {filteredMap.countries && filteredMap.countries.length > 0 && (
                          <>
                            <span className={styles.metadataTag}>
                              {regions.find(r => r.r_code === filteredMap.countries[0].r_code)?.label || 'Unknown Region'}
                            </span>
                            <span className={styles.metadataTag}>
                              {filteredMap.countries.map(country => country.label).join(', ')}
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
                        {filteredMap.generated ? (
                          <div className={styles.captionText}>
                            <p>{filteredMap.edited || filteredMap.generated}</p>
                          </div>
                        ) : (
                          <p>— no caption yet —</p>
                        )}
                      </div>
                    </Container>
                  </div>
                </div>

                {/* Contribute Section with Navigation Arrows */}
                <div className="flex items-center justify-center mt-8">
                  <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      {hasPrevious && (
                        <Container withInternalPadding className="rounded-md p-2">
                          <Button
                            name="previous-item"
                            variant="tertiary"
                            size={1}
                            className={`bg-white/90 hover:bg-white shadow-lg border border-gray-200 ${
                              isNavigating ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'
                            }`}
                            onClick={() => navigateToItem('previous')}
                            disabled={isNavigating}
                          >
                            <div className="flex items-center gap-1">
                              <div className="flex -space-x-1">
                                <ChevronLeftLineIcon className="w-4 h-4" />
                                <ChevronLeftLineIcon className="w-4 h-4" />
                              </div>
                              <span className="font-semibold">Previous</span>
                            </div>
                          </Button>
                        </Container>
                      )}
                      
                      <Container withInternalPadding className="rounded-md p-2">
                        <Button
                          name="contribute"
                          onClick={handleContribute}
                          disabled={isGenerating}
                        >
                          {isGenerating ? 'Generating...' : 'Contribute'}
                        </Button>
                      </Container>
                      
                      {hasNext && (
                        <Container withInternalPadding className="rounded-md p-2">
                          <Button
                            name="next-item"
                            variant="tertiary"
                            size={1}
                            className={`bg-white/90 hover:bg-white shadow-lg border border-gray-200 ${
                              isNavigating ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'
                            }`}
                            onClick={() => navigateToItem('next')}
                            disabled={isNavigating}
                          >
                            <div className="flex items-center gap-1">
                              <span className="font-semibold">Next</span>
                              <div className="flex -space-x-1">
                                <ChevronRightLineIcon className="w-4 h-4" />
                                <ChevronRightLineIcon className="w-4 h-4" />
                              </div>
                            </div>
                          </Button>
                        </Container>
                      )}
                    </div>
                  </Container>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-xl font-semibold text-gray-600 mb-4">
                  No matches found
                </div>
                <div className="mt-4">
                  <Button
                    name="clear-filters"
                    variant="secondary"
                    onClick={() => {
                      setSearch('');
                      setSrcFilter('');
                      setCatFilter('');
                      setRegionFilter('');
                      setCountryFilter('');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Container>
    </PageContainer>
  );
} 