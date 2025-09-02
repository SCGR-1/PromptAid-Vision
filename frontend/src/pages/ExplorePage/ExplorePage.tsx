import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageContainer, Container, SegmentInput, Spinner, Button } from '@ifrc-go/ui';
import { useFilterContext } from '../../hooks/useFilterContext';
import FilterBar from '../../components/FilterBar';
import styles from './ExplorePage.module.css';
import ExportModal from '../../components/ExportModal';

interface ImageWithCaptionOut {
  image_id: string;
  title: string;
  prompt: string;
  model: string;
  schema_id: string;
  raw_json: Record<string, unknown>;
  generated: string;
  edited?: string;
  accuracy?: number;
  context?: number;
  usability?: number;
  starred: boolean;
  created_at?: string;
  updated_at?: string;
  file_key: string;
  image_url: string;
  source: string;
  event_type: string;
  epsg: string;
  image_type: string;
  countries: {c_code: string, label: string, r_code: string}[];
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<'explore' | 'mapDetails'>('explore');
  const [captions, setCaptions] = useState<ImageWithCaptionOut[]>([]);
  
  const {
    search, 
    srcFilter, 
    catFilter, 
    regionFilter, 
    countryFilter, 
    imageTypeFilter, 
    showReferenceExamples
  } = useFilterContext();
  
  const [sources, setSources] = useState<{s_code: string, label: string}[]>([]);
  const [types, setTypes] = useState<{t_code: string, label: string}[]>([]);
  const [regions, setRegions] = useState<{r_code: string, label: string}[]>([]);
  const [countries, setCountries] = useState<{c_code: string, label: string, r_code: string}[]>([]);
  const [imageTypes, setImageTypes] = useState<{image_type: string, label: string}[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const viewOptions = [
    { key: 'explore' as const, label: 'List' },
    { key: 'mapDetails' as const, label: 'Carousel' }
  ];

  const fetchCaptions = () => {
    setIsLoadingContent(true);
    fetch('/api/captions/legacy')
      .then(r => {
        if (!r.ok) {
          console.error('ExplorePage: Legacy endpoint failed, trying regular images endpoint');
          // Fallback to regular images endpoint
          return fetch('/api/images').then(r2 => {
            if (!r2.ok) {
              throw new Error(`HTTP ${r2.status}: ${r2.statusText}`);
            }
            return r2.json();
          });
        }
        return r.json();
      })
      .then(data => {
        console.log('ExplorePage: API response data:', data);
        
        if (Array.isArray(data)) {
          const imagesWithCaptions = data.filter((item: { title?: string; generated?: string; model?: string; image_id?: string }) => {
            const hasCaption = item.generated && item.model;
            const hasImageId = item.image_id && item.image_id !== 'undefined' && item.image_id !== 'null';
            
            if (!hasImageId) {
              console.error('ExplorePage: Item missing valid image_id:', item);
            }
            
            return hasCaption && hasImageId;
          });
          
          console.log('ExplorePage: Filtered images with captions:', imagesWithCaptions.length);
          setCaptions(imagesWithCaptions);
        } else {
          console.error('ExplorePage: API response is not an array:', data);
          setCaptions([]);
        }
      })
      .catch(() => {
        setCaptions([]);
      })
      .finally(() => {
        setIsLoadingContent(false);
      });
  };

  useEffect(() => {
    fetchCaptions();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchCaptions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const exportParam = searchParams.get('export');

    if (exportParam === 'true') {
      setShowExportModal(true);
      if (search || srcFilter || catFilter || regionFilter || countryFilter || imageTypeFilter || showReferenceExamples) {

      } else {

      }
      // Clean up the URL
      navigate('/explore', { replace: true });
    }
  }, [location.search, navigate, search, srcFilter, catFilter, regionFilter, countryFilter, imageTypeFilter, showReferenceExamples]);

  useEffect(() => {

    setIsLoadingFilters(true);
    
    Promise.all([
      fetch('/api/sources').then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      }),
      fetch('/api/types').then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      }),
      fetch('/api/regions').then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      }),
      fetch('/api/countries').then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      }),
      fetch('/api/image-types').then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      }),
    ]).then(([sourcesData, typesData, regionsData, countriesData, imageTypesData]) => {
      setSources(sourcesData);
      setTypes(typesData);
      setRegions(regionsData);
      setCountries(countriesData);
      setImageTypes(imageTypesData);
    }).catch(() => {
    }).finally(() => {
      setIsLoadingFilters(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return captions.filter(c => {
      const matchesSearch = !search || 
        c.title?.toLowerCase().includes(search.toLowerCase()) ||
        c.generated?.toLowerCase().includes(search.toLowerCase()) ||
        c.source?.toLowerCase().includes(search.toLowerCase()) ||
        c.event_type?.toLowerCase().includes(search.toLowerCase());
      
      const matchesSource = !srcFilter || c.source === srcFilter;
      const matchesCategory = !catFilter || c.event_type === catFilter;
      const matchesRegion = !regionFilter || 
        c.countries.some(country => country.r_code === regionFilter);
      const matchesCountry = !countryFilter || 
        c.countries.some(country => country.c_code === countryFilter);
      const matchesImageType = !imageTypeFilter || c.image_type === imageTypeFilter;
      const matchesReferenceExamples = !showReferenceExamples || c.starred === true;
      
      return matchesSearch && matchesSource && matchesCategory && matchesRegion && matchesCountry && matchesImageType && matchesReferenceExamples;
    });
  }, [captions, search, srcFilter, catFilter, regionFilter, countryFilter, imageTypeFilter, showReferenceExamples]);

  const exportDataset = async (images: ImageWithCaptionOut[], mode: 'standard' | 'fine-tuning' = 'fine-tuning') => {
    if (images.length === 0) {
      alert('No images to export');
      return;
    }

    setIsExporting(true);
    setExportSuccess(false);

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Separate images by type
      const crisisMaps = images.filter(img => img.image_type === 'crisis_map');
      const droneImages = images.filter(img => img.image_type === 'drone_image');
      
      if (crisisMaps.length > 0) {
        const crisisFolder = zip.folder('crisis_maps_dataset');
        const crisisImagesFolder = crisisFolder?.folder('images');
        
        if (crisisImagesFolder) {
          const crisisImagePromises = crisisMaps.map(async (image, index) => {
            try {
              const response = await fetch(`/api/images/${image.image_id}/file`);
              if (!response.ok) throw new Error(`Failed to fetch image ${image.image_id}`);
              
              const blob = await response.blob();
              const fileExtension = image.file_key.split('.').pop() || 'jpg';
              const fileName = `${String(index + 1).padStart(4, '0')}.${fileExtension}`;
              
              crisisImagesFolder.file(fileName, blob);
              return { success: true, fileName, image };
            } catch (error) {
              console.error(`Failed to process image ${image.image_id}:`, error);
              return { success: false, fileName: '', image };
            }
          });

          const crisisImageResults = await Promise.all(crisisImagePromises);
          const successfulCrisisImages = crisisImageResults.filter(result => result.success);

          if (mode === 'fine-tuning') {
            const crisisTrainData: any[] = [];
            const crisisTestData: any[] = [];
            const crisisValData: any[] = [];

            const crisisImagesBySource = new Map<string, any[]>();
            successfulCrisisImages.forEach(result => {
              const source = result.image.source || 'unknown';
              if (!crisisImagesBySource.has(source)) {
                crisisImagesBySource.set(source, []);
              }
              crisisImagesBySource.get(source)!.push(result);
            });

            crisisImagesBySource.forEach((images, _source) => {
              const totalImages = images.length;
              const trainCount = Math.floor(totalImages * (80 / 100));
              const testCount = Math.floor(totalImages * (10 / 100));

              const shuffledImages = [...images].sort(() => Math.random() - 0.5);

              crisisTrainData.push(...shuffledImages.slice(0, trainCount).map(result => ({
                image: `images/${result.fileName}`,
                caption: result.image.edited || result.image.generated || '',
                metadata: {
                  image_id: result.image.image_id,
                  title: result.image.title,
                  source: result.image.source,
                  event_type: result.image.event_type,
                  image_type: result.image.image_type,
                  countries: result.image.countries,
                  starred: result.image.starred
                }
              })));

              crisisTestData.push(...shuffledImages.slice(trainCount, trainCount + testCount).map(result => ({
                image: `images/${result.fileName}`,
                caption: result.image.edited || result.image.generated || '',
                metadata: {
                  image_id: result.image.image_id,
                  title: result.image.title,
                  source: result.image.source,
                  event_type: result.image.event_type,
                  image_type: result.image.image_type,
                  countries: result.image.countries,
                  starred: result.image.starred
                }
              })));

              crisisValData.push(...shuffledImages.slice(trainCount + testCount).map(result => ({
                image: `images/${result.fileName}`,
                caption: result.image.edited || result.image.generated || '',
                metadata: {
                  image_id: result.image.image_id,
                  title: result.image.title,
                  source: result.image.source,
                  event_type: result.image.event_type,
                  image_type: result.image.image_type,
                  countries: result.image.countries,
                  starred: result.image.starred
                }
              })));
            });

            // Add JSONL files to crisis folder
            if (crisisFolder) {
              crisisFolder.file('train.jsonl', JSON.stringify(crisisTrainData, null, 2));
              crisisFolder.file('test.jsonl', JSON.stringify(crisisTestData, null, 2));
              crisisFolder.file('val.jsonl', JSON.stringify(crisisValData, null, 2));
            }
          } else {
            successfulCrisisImages.forEach((result, index) => {
              const jsonData = {
                image: `images/${result.fileName}`,
                caption: result.image.edited || result.image.generated || '',
                metadata: {
                  image_id: result.image.image_id,
                  title: result.image.title,
                  source: result.image.source,
                  event_type: result.image.event_type,
                  image_type: result.image.image_type,
                  countries: result.image.countries,
                  starred: result.image.starred
                }
              };
              
              if (crisisFolder) {
                crisisFolder.file(`${String(index + 1).padStart(4, '0')}.json`, JSON.stringify(jsonData, null, 2));
              }
            });
          }
        }
      }
      
      // Create drone_images dataset
      if (droneImages.length > 0) {
        const droneFolder = zip.folder('drone_images_dataset');
        const droneImagesFolder = droneFolder?.folder('images');
        
        if (droneImagesFolder) {
          const droneImagePromises = droneImages.map(async (image, index) => {
            try {
              const response = await fetch(`/api/images/${image.image_id}/file`);
              if (!response.ok) throw new Error(`Failed to fetch image ${image.image_id}`);
              
              const blob = await response.blob();
              const fileExtension = image.file_key.split('.').pop() || 'jpg';
              const fileName = `${String(index + 1).padStart(4, '0')}.${fileExtension}`;
              
              droneImagesFolder.file(fileName, blob);
              return { success: true, fileName, image };
            } catch (error) {
              console.error(`Failed to process image ${image.image_id}:`, error);
              return { success: false, fileName: '', image };
            }
          });

          const droneImageResults = await Promise.all(droneImagePromises);
          const successfulDroneImages = droneImageResults.filter(result => result.success);

          if (mode === 'fine-tuning') {
            const droneTrainData: any[] = [];
            const droneTestData: any[] = [];
            const droneValData: any[] = [];

            const droneImagesByEventType = new Map<string, any[]>();
            successfulDroneImages.forEach(result => {
              const eventType = result.image.event_type || 'unknown';
              if (!droneImagesByEventType.has(eventType)) {
                droneImagesByEventType.set(eventType, []);
              }
              droneImagesByEventType.get(eventType)!.push(result);
            });

            droneImagesByEventType.forEach((images, _eventType) => {
              const totalImages = images.length;
              const trainCount = Math.floor(totalImages * (80 / 100));
              const testCount = Math.floor(totalImages * (10 / 100));

              const shuffledImages = [...images].sort(() => Math.random() - 0.5);

              droneTrainData.push(...shuffledImages.slice(0, trainCount).map(result => ({
                image: `images/${result.fileName}`,
                caption: result.image.edited || result.image.generated || '',
                metadata: {
                  image_id: result.image.image_id,
                  title: result.image.title,
                  source: result.image.source,
                  event_type: result.image.event_type,
                  image_type: result.image.image_type,
                  countries: result.image.countries,
                  starred: result.image.starred
                }
              })));

              droneTestData.push(...shuffledImages.slice(trainCount, trainCount + testCount).map(result => ({
                image: `images/${result.fileName}`,
                caption: result.image.edited || result.image.generated || '',
                metadata: {
                  image_id: result.image.image_id,
                  title: result.image.title,
                  source: result.image.source,
                  event_type: result.image.event_type,
                  image_type: result.image.image_type,
                  countries: result.image.countries,
                  starred: result.image.starred
                }
              })));

              droneValData.push(...shuffledImages.slice(trainCount + testCount).map(result => ({
                image: `images/${result.fileName}`,
                caption: result.image.edited || result.image.generated || '',
                metadata: {
                  image_id: result.image.image_id,
                  title: result.image.title,
                  source: result.image.source,
                  event_type: result.image.event_type,
                  image_type: result.image.image_type,
                  countries: result.image.countries,
                  starred: result.image.starred
                }
              })));
            });

            if (droneFolder) {
              droneFolder.file('train.jsonl', JSON.stringify(droneTrainData, null, 2));
              droneFolder.file('test.jsonl', JSON.stringify(droneTestData, null, 2));
              droneFolder.file('val.jsonl', JSON.stringify(droneValData, null, 2));
            }
          } else {
            successfulDroneImages.forEach((result, index) => {
              const jsonData = {
                image: `images/${result.fileName}`,
                caption: result.image.edited || result.image.generated || '',
                metadata: {
                  image_id: result.image.image_id,
                  title: result.image.title,
                  source: result.image.source,
                  event_type: result.image.event_type,
                  image_type: result.image.image_type,
                  countries: result.image.countries,
                  starred: result.image.starred
                }
              };
              
              if (droneFolder) {
                droneFolder.file(`${String(index + 1).padStart(4, '0')}.json`, JSON.stringify(jsonData, null, 2));
              }
            });
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `datasets_${mode}_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const totalImages = (crisisMaps.length || 0) + (droneImages.length || 0);
      console.log(`Exported ${mode} datasets with ${totalImages} total images:`);
      if (crisisMaps.length > 0) console.log(`- Crisis maps: ${crisisMaps.length} images`);
      if (droneImages.length > 0) console.log(`- Drone images: ${droneImages.length} images`);
      
      setExportSuccess(true);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export dataset. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <PageContainer>
      {isLoadingContent ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Spinner className="text-ifrcRed" />
            <div>Loading examples...</div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto">
          <div className={styles.tabSelector}>
            <SegmentInput
              name="explore-view"
              value={view}
              onChange={(value) => {
                if (value === 'explore' || value === 'mapDetails') {
                  setView(value);
                  if (value === 'mapDetails' && captions.length > 0) {
                    if (captions[0]?.image_id && captions[0].image_id !== 'undefined' && captions[0].image_id !== 'null') {
                    navigate(`/map/${captions[0].image_id}`);
                  } else {
                    console.error('Invalid image_id for navigation:', captions[0]?.image_id);
                  }
                  }
                }
              }}
              options={viewOptions}
              keySelector={(o) => o.key}
              labelSelector={(o) => o.label}
            />
            
            {/* Export Dataset Button */}
            <Button
              name="export-dataset"
              variant="secondary"
              onClick={() => setShowExportModal(true)}
            >
              Export
            </Button>
          </div>

          {view === 'explore' ? (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
              {/* Layer 1: Search, Reference Examples, Clear Filters */}
              <div className="flex flex-wrap items-center gap-4">
                <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2 flex-1 min-w-[300px]">
                  <FilterBar
                    sources={sources}
                    types={types}
                    regions={regions}
                    countries={countries}
                    imageTypes={imageTypes}
                    isLoadingFilters={isLoadingFilters}
                  />
                </Container>
              </div>
            </div>

            {/* Results Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {filtered.length} of {captions.length} examples
                </p>
              </div>

              {/* Loading State */}
              {isLoadingContent && (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <Spinner className="text-ifrcRed" />
                    <div>Loading examples...</div>
                  </div>
                </div>
              )}

              {/* Content */}
              {!isLoadingContent && (
                <div className="space-y-4">
                  {filtered.map(c => (
                    <div key={c.image_id} className={styles.mapItem} onClick={() => {
                      console.log('ExplorePage: Clicking on image with ID:', c.image_id);
                      console.log('ExplorePage: Image data:', c);
                      
                      if (c.image_id && c.image_id !== 'undefined' && c.image_id !== 'null') {
                        console.log('ExplorePage: Navigating to:', `/map/${c.image_id}`);
                        console.log('ExplorePage: Full navigation URL:', `/#/map/${c.image_id}`);
                        navigate(`/map/${c.image_id}`);
                      } else {
                        console.error('Invalid image_id for navigation:', c.image_id);
                        console.error('Full item data:', JSON.stringify(c, null, 2));
                        // Show a visual error in production
                        alert(`Cannot navigate: Invalid image ID (${c.image_id})`);
                      }
                    }}>
                      <div className={styles.mapItemImage} style={{ width: '120px', height: '80px' }}>
                        {c.image_url ? (
                          <>
                            {console.log('ExplorePage: Rendering image with URL:', c.image_url)}
                            <img 
                              src={c.image_url} 
                              alt={c.file_key}
                              onError={(e) => {
                                console.error('ExplorePage: Image failed to load:', c.image_url);
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML = 'Img';
                              }}
                              onLoad={() => console.log('ExplorePage: Image loaded successfully:', c.image_url)}
                            />
                          </>
                        ) : (
                          <>
                            {console.log('ExplorePage: No image_url provided for item:', c)}
                            'Img'
                          </>
                        )}
                      </div>
                      <div className={styles.mapItemContent}>
                        <h3 className={styles.mapItemTitle}>
                          <div className="flex items-center gap-2">
                            <span>{c.title || 'Untitled'}</span>
                            {c.starred && (
                              <span className="text-red-500 text-lg" title="Starred image">★</span>
                            )}
                          </div>
                        </h3>
                        <div className={styles.mapItemMetadata}>
                          <div className={styles.metadataTags}>
                            {c.image_type !== 'drone_image' && (
                              <span className={styles.metadataTagSource}>
                                {sources.find(s => s.s_code === c.source)?.label || c.source}
                              </span>
                            )}
                            <span className={styles.metadataTagType}>
                              {types.find(t => t.t_code === c.event_type)?.label || c.event_type}
                            </span>
                            <span className={styles.metadataTag}>
                              {imageTypes.find(it => it.image_type === c.image_type)?.label || c.image_type}
                            </span>
                            {c.countries && c.countries.length > 0 && (
                              <>
                                <span className={styles.metadataTag}>
                                  {regions.find(r => r.r_code === c.countries[0].r_code)?.label || 'Unknown Region'}
                                </span>
                                <span className={styles.metadataTag}>
                                  {c.countries.map(country => country.label).join(', ')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {!filtered.length && (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No examples found.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center py-12">
              <p className="text-gray-500">Map Details view coming soon...</p>
              <p className="text-sm text-gray-400 mt-2">This will show detailed information about individual maps</p>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Export Selection Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => {
          setShowExportModal(false);
          setExportSuccess(false);
          setIsExporting(false);
        }}
        onExport={(mode, selectedTypes) => {
          const filteredByType = filtered.filter(img => selectedTypes.includes(img.image_type));
          exportDataset(filteredByType, mode);
        }}
        filteredCount={filtered.length}
        totalCount={captions.length}
        hasFilters={!!(search || srcFilter || catFilter || regionFilter || countryFilter || imageTypeFilter || showReferenceExamples)}
        crisisMapsCount={filtered.filter(img => img.image_type === 'crisis_map').length}
        droneImagesCount={filtered.filter(img => img.image_type === 'drone_image').length}
        isLoading={isExporting}
        exportSuccess={exportSuccess}
      />
    </PageContainer>
  );
}
