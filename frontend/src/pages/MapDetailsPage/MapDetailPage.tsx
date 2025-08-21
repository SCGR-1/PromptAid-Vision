import { PageContainer, Container, Button, Spinner, SegmentInput, TextInput, SelectInput, MultiSelectInput } from '@ifrc-go/ui';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeftLineIcon, ChevronRightLineIcon, DeleteBinLineIcon } from '@ifrc-go/icons';
import styles from './MapDetailPage.module.css';
import { useFilterContext } from '../../contexts/FilterContext';
import { useAdmin } from '../../contexts/AdminContext';

// Helper function to get the correct API base URL for the current environment
const getApiBaseUrl = () => {
  // Check if we're in the deployed environment (Hugging Face Spaces)
  if (window.location.hostname.includes('hf.space')) {
    return '/app/api';
  }
  // Local development
  return '/api';
};

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
  const { isAuthenticated } = useAdmin();
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
  
  // Add delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Add flag to prevent auto-navigation during delete operations
  const [isDeleting, setIsDeleting] = useState(false);
  
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
      const response = await fetch(`${getApiBaseUrl()}/images/${id}`);
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
    if (!map || loading || isDeleting) return; // Skip if deleting
    
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
      const apiUrl = `${getApiBaseUrl()}/images`;
      fetch(apiUrl)
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
  }, [map, search, srcFilter, catFilter, regionFilter, countryFilter, imageTypeFilter, showReferenceExamples, mapId, navigate, loading, isDeleting]);

  // Ensure navigation availability is checked when component mounts
  useEffect(() => {
    if (mapId && !loading) {
      console.log('🚀 Component mounted, checking navigation availability...');
      checkNavigationAvailability(mapId);
    }
  }, [mapId, loading]);

  const checkNavigationAvailability = async (currentId: string) => {
    try {
      console.log('🔍 Checking navigation availability for:', currentId);
      const apiUrl = `${getApiBaseUrl()}/images`;
      console.log('🌐 Using API URL:', apiUrl);
      const response = await fetch(apiUrl);
      console.log('📡 API response status:', response.status);
      
      if (response.ok) {
        const images = await response.json();
        console.log('📊 Total images from API:', images.length);
        
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
        
        console.log('🔍 Filtered images count:', filteredImages.length);
        console.log('🔍 Current filters:', { search, srcFilter, catFilter, regionFilter, countryFilter, imageTypeFilter, showReferenceExamples });
        
        const currentIndex = filteredImages.findIndex((img: { image_id: string }) => img.image_id === currentId);
        console.log('📍 Current index:', currentIndex);
        
        const hasPrev = filteredImages.length > 1 && currentIndex > 0;
        const hasNext = filteredImages.length > 1 && currentIndex < filteredImages.length - 1;
        
        console.log('⬅️ Has previous:', hasPrev, '➡️ Has next:', hasNext);
        
        setHasPrevious(hasPrev);
        setHasNext(hasNext);
      } else {
        console.error('❌ API response not ok:', response.status, response.statusText);
        // Fallback: set navigation to true if we can't determine
        setHasPrevious(true);
        setHasNext(true);
      }
    } catch (error) {
      console.error('❌ Failed to check navigation availability:', error);
      // Fallback: set navigation to true if we can't determine
      setHasPrevious(true);
      setHasNext(true);
    }
  };

  const navigateToItem = async (direction: 'previous' | 'next') => {
    if (isNavigating) return;
    
    try {
      const apiUrl = `${getApiBaseUrl()}/images`;
      console.log('🌐 Navigation using API URL:', apiUrl);
      const response = await fetch(apiUrl);
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
      fetch(`${getApiBaseUrl()}/sources`).then(r => r.json()),
      fetch(`${getApiBaseUrl()}/types`).then(r => r.json()),
      fetch(`${getApiBaseUrl()}/image-types`).then(r => r.json()),
      fetch(`${getApiBaseUrl()}/regions`).then(r => r.json()),
      fetch(`${getApiBaseUrl()}/countries`).then(r => r.json()),
    ]).then(([sourcesData, typesData, imageTypesData, regionsData, countriesData]) => {
      setSources(sourcesData);
      setTypes(typesData);
      setImageTypes(imageTypesData);
      setRegions(regionsData);
      setCountries(countriesData);
    }).catch(console.error);
  }, []);

  const [isGenerating, setIsGenerating] = useState(false);
  
  // Add delete function
  const handleDelete = async () => {
    if (!map) return;
    
    setShowDeleteConfirm(true);
  };

  const toggleStarred = async () => {
    if (!map) return;
    
    try {
      const response = await fetch(`${getApiBaseUrl()}/images/${map.image_id}`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          starred: !map.starred
        })
      });
      
      if (response.ok) {
        // Update local state
        setMap(prev => prev ? { ...prev, starred: !prev.starred } : null);
      } else {
        console.error('Failed to toggle starred status');
      }
    } catch (error) {
      console.error('Error toggling starred status:', error);
    }
  };

  const confirmDelete = async () => {
    if (!map) return;
    
    setIsDeleting(true); // Set flag to true
    try {
      console.log('Deleting image with ID:', map.image_id);
      const res = await fetch(`${getApiBaseUrl()}/images/${map.image_id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const json = await res.json();
        throw new Error((json.error as string) || `Delete failed with status ${res.status}`);
      }
      
      setShowDeleteConfirm(false);
      
      // Navigate to next item in filtered list instead of explore page
      try {
        const apiUrl = `${getApiBaseUrl()}/images`;
        const response = await fetch(apiUrl);
        if (response.ok) {
          const images = await response.json();
          
          // Filter images based on current filter criteria (same logic as navigateToItem)
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
          
          // Remove the current item from the filtered list since it was deleted
          const remainingImages = filteredImages.filter((img: any) => img.image_id !== map.image_id);
          
          console.log('Delete navigation debug:', {
            originalFilteredCount: filteredImages.length,
            remainingCount: remainingImages.length,
            currentIndex: filteredImages.findIndex((img: any) => img.image_id === map.image_id),
            remainingImages: remainingImages.map((img: any) => ({ id: img.image_id, title: img.title }))
          });
          
          if (remainingImages.length > 0) {
            // Find the current item's position in the original filtered list
            const currentIndex = filteredImages.findIndex((img: any) => img.image_id === map.image_id);
            
            // Navigate to the next item, or the previous if we're at the end
            let targetIndex: number;
            if (currentIndex === filteredImages.length - 1) {
              // We were at the last item, go to the previous one
              targetIndex = currentIndex - 1;
            } else {
              // Go to the next item
              targetIndex = currentIndex;
            }
            
            console.log('Navigation target:', { currentIndex, targetIndex, targetId: remainingImages[targetIndex]?.image_id });
            
            // Make sure the target index is valid
            if (targetIndex >= 0 && targetIndex < remainingImages.length) {
              console.log('Navigating to:', remainingImages[targetIndex].image_id);
              navigate(`/map/${remainingImages[targetIndex].image_id}`);
            } else {
              // Fallback to first remaining item
              console.log('Fallback navigation to first item:', remainingImages[0].image_id);
              navigate(`/map/${remainingImages[0].image_id}`);
            }
          } else {
            // No more items in filtered list, go to explore page
            console.log('No remaining items, going to explore page');
            navigate('/explore');
          }
        } else {
          // Fallback to explore page if API call fails
          navigate('/explore');
        }
      } catch (error) {
        console.error('Failed to navigate to next item:', error);
        // Fallback to explore page
        navigate('/explore');
      } finally {
        setIsDeleting(false); // Reset flag
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowDeleteConfirm(false);
    }
  };
  
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
      const res = await fetch(`${getApiBaseUrl()}/contribute/from-url`, {
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
      const capRes = await fetch(`${getApiBaseUrl()}/images/${newId}/caption`, {
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

            {/* Reference Examples Filter - Admin Only */}
            {isAuthenticated && (
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
            )}

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
                    heading={
                      <div className="flex items-center gap-2">
                        <span>{filteredMap.title || "Map Image"}</span>
                        {isAuthenticated && filteredMap.starred && (
                          <span className="text-red-500 text-xl" title="Starred image">★</span>
                        )}
                      </div>
                    }
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
                      {/* Debug: Navigation state */}
                      {/* hasPrevious: {hasPrevious ? 'true' : 'false'}, hasNext: {hasNext ? 'true' : 'false'} */}
                      
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
                      
                      {/* Delete Button - Admin Only */}
                      {isAuthenticated && (
                        <Container withInternalPadding className="rounded-md p-2">
                          <Button
                            name="delete"
                            variant="tertiary"
                            size={1}
                            className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 hover:border-red-300"
                            onClick={handleDelete}
                            title="Delete"
                            aria-label="Delete saved image"
                          >
                            <DeleteBinLineIcon className="w-4 h-4" />
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
                      
                      {/* Star Toggle Button - Admin Only */}
                      {isAuthenticated && (
                        <Container withInternalPadding className="rounded-md p-2">
                          <Button
                            name="toggle-star"
                            variant="tertiary"
                            size={1}
                            className={`${
                              map?.starred 
                                ? 'bg-red-100 hover:bg-red-200 text-red-800 border-2 border-red-400' 
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-2 border-gray-300'
                            } w-16 h-8 rounded-full transition-all duration-200 flex items-center justify-center`}
                            onClick={toggleStarred}
                            title={map?.starred ? 'Unstar image' : 'Star image'}
                            aria-label={map?.starred ? 'Unstar image' : 'Star image'}
                          >
                            <span className={`text-lg transition-all duration-200 ${map?.starred ? 'text-red-600' : 'text-gray-500'}`}>
                              {map?.starred ? '★' : '☆'}
                            </span>
                          </Button>
                        </Container>
                      )}
                      
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
                      
                      {/* Fallback navigation buttons if hasPrevious/hasNext are not working */}
                      {!hasPrevious && !hasNext && (
                        <>
                          <Container withInternalPadding className="rounded-md p-2">
                            <Button
                              name="fallback-previous"
                              variant="tertiary"
                              size={1}
                              className="bg-white/90 hover:bg-white shadow-lg border border-gray-200 hover:scale-110"
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
                          
                          <Container withInternalPadding className="rounded-md p-2">
                            <Button
                              name="fallback-next"
                              variant="tertiary"
                              size={1}
                              className="bg-white/90 hover:bg-white shadow-lg border border-gray-200 hover:scale-110"
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
                        </>
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className={styles.fullSizeModalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div className={styles.fullSizeModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.ratingWarningContent}>
              <h3 className={styles.ratingWarningTitle}>Delete Image?</h3>
              <p className={styles.ratingWarningText}>
                This action cannot be undone. Are you sure you want to delete this saved image and all related data?
              </p>
              <div className={styles.ratingWarningButtons}>
                <Button
                  name="confirm-delete"
                  variant="secondary"
                  onClick={confirmDelete}
                >
                  Delete
                </Button>
                <Button
                  name="cancel-delete"
                  variant="tertiary"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
} 