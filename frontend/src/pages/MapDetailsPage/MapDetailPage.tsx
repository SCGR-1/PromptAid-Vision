import { PageContainer, Container, Button, Spinner, SegmentInput, TextInput, SelectInput, MultiSelectInput } from '@ifrc-go/ui';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeftLineIcon, ChevronRightLineIcon } from '@ifrc-go/icons';
import styles from './MapDetailPage.module.css';
import { useFilterContext } from '../../contexts/FilterContext';

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
  raw_json?: Record<string, unknown>;
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
  
  const [hasPrevious, setHasPrevious] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Use shared filter context instead of local state
  const {
    search, setSearch,
    srcFilter, setSrcFilter,
    catFilter, setCatFilter,
    regionFilter, setRegionFilter,
    countryFilter, setCountryFilter,
    imageTypeFilter, setImageTypeFilter,
    showReferenceExamples, setShowReferenceExamples,
    clearAllFilters
  } = useFilterContext();

  const viewOptions = [
    { key: 'explore' as const, label: 'List' },
    { key: 'mapDetails' as const, label: 'Carousel' }
  ];

  const fetchMapData = useCallback(async (id: string) => {
    setIsNavigating(true);
    setLoading(true);
    
    try {
      const response = await fetch(`/api/images/${id}`);
      if (!response.ok) {
        throw new Error('Map not found');
      }
      const data = await response.json();
      setMap(data);
      
      await checkNavigationAvailability(id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
      setIsNavigating(false);
    }
  }, []);

  useEffect(() => {
    if (!mapId) {
      setError('Map ID is required');
      setLoading(false);
      return;
    }

    fetchMapData(mapId);
  }, [mapId, fetchMapData]);

  // Auto-navigate to first matching item when filters change
  useEffect(() => {
    if (!map || loading) return;
    
    // Check if current map matches current filters
    const currentMapMatches = () => {
      const matchesSearch = !search || 
        map.title?.toLowerCase().includes(search.toLowerCase()) ||
        map.generated?.toLowerCase().includes(search.toLowerCase()) ||
        map.source?.toLowerCase().includes(search.toLowerCase()) ||
        map.event_type?.toLowerCase().includes(search.toLowerCase());
      
      const matchesSource = !srcFilter || map.source === srcFilter;
      const matchesCategory = !catFilter || map.event_type === catFilter;
      const matchesRegion = !regionFilter || 
        map.countries.some(country => country.r_code === regionFilter);
      const matchesCountry = !countryFilter || 
        map.countries.some(country => country.c_code === countryFilter);
      const matchesImageType = !imageTypeFilter || map.image_type === imageTypeFilter;
      const matchesReferenceExamples = !showReferenceExamples || map.starred === true;
      
      return matchesSearch && matchesSource && matchesCategory && matchesRegion && matchesCountry && matchesImageType && matchesReferenceExamples;
    };

    if (!currentMapMatches()) {
      // Find first matching item and navigate to it
      fetch('/api/images')
        .then(r => r.json())
        .then(images => {
          const firstMatching = images.find((img: any) => {
            const matchesSearch = !search || 
              img.title?.toLowerCase().includes(search.toLowerCase()) ||
              img.generated?.toLowerCase().includes(search.toLowerCase()) ||
              img.source?.toLowerCase().includes(search.toLowerCase()) ||
              img.event_type?.toLowerCase().includes(search.toLowerCase());
            
            const matchesSource = !srcFilter || img.source === srcFilter;
            const matchesCategory = !catFilter || img.event_type === catFilter;
            const matchesRegion = !regionFilter || 
              img.countries?.some((country: any) => country.r_code === regionFilter);
            const matchesCountry = !countryFilter || 
              img.countries?.some((country: any) => country.c_code === countryFilter);
            const matchesImageType = !imageTypeFilter || img.image_type === imageTypeFilter;
            const matchesReferenceExamples = !showReferenceExamples || img.starred === true;
            
            return matchesSearch && matchesSource && matchesCategory && matchesRegion && matchesCountry && matchesImageType && matchesReferenceExamples;
          });
          
          if (firstMatching && firstMatching.image_id !== mapId) {
            navigate(`/map/${firstMatching.image_id}`);
          }
        })
        .catch(console.error);
    }
  }, [map, search, srcFilter, catFilter, regionFilter, countryFilter, imageTypeFilter, showReferenceExamples, mapId, navigate, loading]);

  const checkNavigationAvailability = async (currentId: string) => {
    try {
      const response = await fetch('/api/images');
      if (response.ok) {
        const images = await response.json();
        
        // Filter images based on current filter criteria
        const filteredImages = images.filter((img: any) => {
          const matchesSearch = !search || 
            img.title?.toLowerCase().includes(search.toLowerCase()) ||
            img.generated?.toLowerCase().includes(search.toLowerCase()) ||
            img.source?.toLowerCase().includes(search.toLowerCase()) ||
            img.event_type?.toLowerCase().includes(search.toLowerCase());
          
          const matchesSource = !srcFilter || img.source === srcFilter;
          const matchesCategory = !catFilter || img.event_type === catFilter;
          const matchesRegion = !regionFilter || 
            img.countries?.some((country: any) => country.r_code === regionFilter);
          const matchesCountry = !countryFilter || 
            img.countries?.some((country: any) => country.c_code === countryFilter);
          const matchesImageType = !imageTypeFilter || img.image_type === imageTypeFilter;
          const matchesReferenceExamples = !showReferenceExamples || img.starred === true;
          
          return matchesSearch && matchesSource && matchesCategory && matchesRegion && matchesCountry && matchesImageType && matchesReferenceExamples;
        });
        
        const currentIndex = filteredImages.findIndex((img: { image_id: string }) => img.image_id === currentId);
        
        setHasPrevious(filteredImages.length > 1 && currentIndex > 0);
        setHasNext(filteredImages.length > 1 && currentIndex < filteredImages.length - 1);
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
      
      // Filter images based on current filter criteria
      const filteredImages = images.filter((img: any) => {
        const matchesSearch = !search || 
          img.title?.toLowerCase().includes(search.toLowerCase()) ||
          img.generated?.toLowerCase().includes(search.toLowerCase()) ||
          img.source?.toLowerCase().includes(search.toLowerCase()) ||
          img.event_type?.toLowerCase().includes(search.toLowerCase());
        
        const matchesSource = !srcFilter || img.source === srcFilter;
        const matchesCategory = !catFilter || img.event_type === catFilter;
        const matchesRegion = !regionFilter || 
          img.countries?.some((country: any) => country.r_code === regionFilter);
        const matchesCountry = !countryFilter || 
          img.countries?.some((country: any) => country.c_code === countryFilter);
        const matchesImageType = !imageTypeFilter || img.image_type === imageTypeFilter;
        const matchesReferenceExamples = !showReferenceExamples || img.starred === true;
        
        return matchesSearch && matchesSource && matchesCategory && matchesRegion && matchesCountry && matchesImageType && matchesReferenceExamples;
      });
      
      const currentIndex = filteredImages.findIndex((img: { image_id: string }) => img.image_id === mapId);
      
      let targetIndex: number;
      if (direction === 'previous') {
        targetIndex = currentIndex === 0 ? filteredImages.length - 1 : currentIndex - 1;
      } else {
        targetIndex = currentIndex === filteredImages.length - 1 ? 0 : currentIndex + 1;
      }
      
      const targetId = filteredImages[targetIndex].image_id;
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
  
  const filteredMap = useMemo(() => {
    if (!map) return null;
    
    if (!search && !srcFilter && !catFilter && !regionFilter && !countryFilter && !imageTypeFilter && !showReferenceExamples) {
      return map;
    }
    
    const matchesSearch = !search || 
      map.title?.toLowerCase().includes(search.toLowerCase()) ||
      map.generated?.toLowerCase().includes(search.toLowerCase()) ||
      map.source?.toLowerCase().includes(search.toLowerCase()) ||
      map.event_type?.toLowerCase().includes(search.toLowerCase());
    
    const matchesSource = !srcFilter || map.source === srcFilter;
    const matchesCategory = !catFilter || map.event_type === catFilter;
    const matchesRegion = !regionFilter || 
      map.countries.some(country => country.r_code === regionFilter);
    const matchesCountry = !countryFilter || 
      map.countries.some(country => country.c_code === countryFilter);
    const matchesImageType = !imageTypeFilter || map.image_type === imageTypeFilter;
    const matchesReferenceExamples = !showReferenceExamples || map.starred === true;
    
    return matchesSearch && matchesSource && matchesCategory && matchesRegion && matchesCountry && matchesImageType && matchesReferenceExamples ? map : null;
  }, [map, search, srcFilter, catFilter, regionFilter, countryFilter, imageTypeFilter, showReferenceExamples]);

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
          prompt: 'DEFAULT_CRISIS_MAP',
          ...(modelName && { model_name: modelName }),
        }),
      });
      
      if (!capRes.ok) {
        const errorData = await capRes.json();
        throw new Error(errorData.error || 'Failed to generate caption');
      }
      
              const url = `/upload?imageUrl=${encodeURIComponent(json.image_url)}&isContribution=true&step=2a&imageId=${newId}&imageType=${map.image_type}`;
        navigate(url);
      
    } catch (error: unknown) {
      console.error('Contribution failed:', error);
      alert(`Contribution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      <div className="max-w-7xl mx-auto">
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
        <div className="mb-6 space-y-4">
          {/* Layer 1: Search, Reference Examples, Clear Filters */}
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
              <Button
                name="reference-examples"
                variant={showReferenceExamples ? "primary" : "secondary"}
                onClick={() => setShowReferenceExamples(!showReferenceExamples)}
                className="whitespace-nowrap"
              >
                <span className="mr-2">
                  {showReferenceExamples ? (
                    <span className="text-yellow-400">★</span>
                  ) : (
                    <span className="text-yellow-400">☆</span>
                  )}
                </span>
                Reference Examples
              </Button>
            </Container>

            <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2">
              <Button
                name="clear-filters"
                variant="secondary"
                onClick={clearAllFilters}
              >
                Clear Filters
              </Button>
            </Container>
          </div>

          {/* Layer 2: 5 Filter Bars */}
          <div className="flex flex-wrap items-center gap-4">
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

            <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2">
              <SelectInput
                name="imageType"
                placeholder="All Image Types"
                options={imageTypes}
                value={imageTypeFilter || null}
                onChange={(v) => setImageTypeFilter(v as string || '')}
                keySelector={(o) => o.image_type}
                labelSelector={(o) => o.label}
                required={false}
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
                        {filteredMap.image_type !== 'drone_image' && (
                          <span className={styles.metadataTag}>
                            {sources.find(s => s.s_code === filteredMap.source)?.label || filteredMap.source}
                          </span>
                        )}
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
                          {isGenerating ? (
                            <span>Generating...</span>
                          ) : (
                            'Contribute'
                          )}
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
                    onClick={clearAllFilters}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
} 