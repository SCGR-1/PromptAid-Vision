import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer, TextInput, SelectInput, MultiSelectInput, Container, SegmentInput, Spinner, Button, Checkbox } from '@ifrc-go/ui';
import { useFilterContext } from '../../contexts/FilterContext';
import styles from './ExplorePage.module.css';

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
  const [view, setView] = useState<'explore' | 'mapDetails'>('explore');
  const [captions, setCaptions] = useState<ImageWithCaptionOut[]>([]);
  
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
  
  const [sources, setSources] = useState<{s_code: string, label: string}[]>([]);
  const [types, setTypes] = useState<{t_code: string, label: string}[]>([]);
  const [regions, setRegions] = useState<{r_code: string, label: string}[]>([]);
  const [countries, setCountries] = useState<{c_code: string, label: string, r_code: string}[]>([]);
  const [imageTypes, setImageTypes] = useState<{image_type: string, label: string}[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportModalStage, setExportModalStage] = useState<'filters' | 'export'>('filters');
  const [exportMode, setExportMode] = useState<'standard' | 'fine-tuning'>('standard');
  const [trainSplit, setTrainSplit] = useState(80);
  const [testSplit, setTestSplit] = useState(10);
  const [valSplit, setValSplit] = useState(10);
  const [crisisMapsSelected, setCrisisMapsSelected] = useState(true);
  const [droneImagesSelected, setDroneImagesSelected] = useState(true);

  const viewOptions = [
    { key: 'explore' as const, label: 'List' },
    { key: 'mapDetails' as const, label: 'Carousel' }
  ];

  const fetchCaptions = () => {
    setIsLoadingContent(true);
    fetch('/api/captions')
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          const imagesWithCaptions = data.filter((item: { title?: string; generated?: string; model?: string }) => {
            const hasCaption = item.generated && item.model;
            return hasCaption;
          });
          setCaptions(imagesWithCaptions);
        } else {
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
              const response = await fetch(image.image_url);
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
              const trainCount = Math.floor(totalImages * (trainSplit / 100));
              const testCount = Math.floor(totalImages * (testSplit / 100));

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
              const response = await fetch(image.image_url);
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
              const trainCount = Math.floor(totalImages * (trainSplit / 100));
              const testCount = Math.floor(totalImages * (testSplit / 100));

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
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export dataset. Please try again.');
    }
  };

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto">
        <div className={styles.tabSelector}>
          <SegmentInput
            name="explore-view"
            value={view}
            onChange={(value) => {
              if (value === 'explore' || value === 'mapDetails') {
                setView(value);
                if (value === 'mapDetails' && captions.length > 0) {
                  navigate(`/map/${captions[0].image_id}`);
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
            onClick={() => {
              setShowExportModal(true);
              if (search || srcFilter || catFilter || regionFilter || countryFilter || imageTypeFilter || showReferenceExamples) {
                setExportModalStage('filters');
              } else {
                setExportModalStage('export');
              }
            }}
          >
            Export Dataset
          </Button>
        </div>

        {view === 'explore' ? (
          <div className="space-y-6">
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

                {/* Reference Examples Filter - Available to all users */}
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
                    placeholder={isLoadingFilters ? "Loading..." : "All Sources"}
                    options={sources}
                    value={srcFilter || null}
                    onChange={(v) => setSrcFilter(v as string || '')}
                    keySelector={(o) => o.s_code}
                    labelSelector={(o) => o.label}
                    required={false}
                    disabled={isLoadingFilters}
                  />
                </Container>

                <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2">
                  <SelectInput
                    name="category"
                    placeholder={isLoadingFilters ? "Loading..." : "All Categories"}
                    options={types}
                    value={catFilter || null}
                    onChange={(v) => setCatFilter(v as string || '')}
                    keySelector={(o) => o.t_code}
                    labelSelector={(o) => o.label}
                    required={false}
                    disabled={isLoadingFilters}
                  />
                </Container>

                <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2">
                  <SelectInput
                    name="region"
                    placeholder={isLoadingFilters ? "Loading..." : "All Regions"}
                    options={regions}
                    value={regionFilter || null}
                    onChange={(v) => setRegionFilter(v as string || '')}
                    keySelector={(o) => o.r_code}
                    labelSelector={(o) => o.label}
                    required={false}
                    disabled={isLoadingFilters}
                  />
                </Container>

                <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2">
                  <MultiSelectInput
                    name="country"
                    placeholder={isLoadingFilters ? "Loading..." : "All Countries"}
                    options={countries}
                    value={countryFilter ? [countryFilter] : []}
                    onChange={(v) => setCountryFilter((v as string[])[0] || '')}
                    keySelector={(o) => o.c_code}
                    labelSelector={(o) => o.label}
                    disabled={isLoadingFilters}
                  />
                </Container>

                <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2">
                  <SelectInput
                    name="imageType"
                    placeholder={isLoadingFilters ? "Loading..." : "All Image Types"}
                    options={imageTypes}
                    value={imageTypeFilter || null}
                    onChange={(v) => setImageTypeFilter(v as string || '')}
                    keySelector={(o) => o.image_type}
                    labelSelector={(o) => o.label}
                    required={false}
                    disabled={isLoadingFilters}
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
                    <div key={c.image_id} className={styles.mapItem} onClick={() => navigate(`/map/${c.image_id}`)}>
                      <div className={styles.mapItemImage} style={{ width: '120px', height: '80px' }}>
                        {c.image_url ? (
                          <img 
                            src={c.image_url} 
                            alt={c.file_key}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.parentElement!.innerHTML = 'Img';
                            }}
                          />
                        ) : (
                          'Img'
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

      {/* Export Selection Modal */}
      {showExportModal && (
        <div className={styles.fullSizeModalOverlay} onClick={() => setShowExportModal(false)}>
          <div className={styles.fullSizeModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.ratingWarningContent}>
              {exportModalStage === 'filters' ? (
                <>
                  <h3 className={styles.ratingWarningTitle}>Export Dataset</h3>
                  
                  {/* Filter Status Message */}
                  <div className={styles.filterStatusContainer}>
                    {(search || srcFilter || catFilter || regionFilter || countryFilter || imageTypeFilter || showReferenceExamples) ? (
                      <>
                        <div className={styles.filterStatusMessage}>
                          Filters are being applied
                        </div>
                        <div className={styles.filterStatusCount}>
                          {filtered.length} of {captions.length} examples
                        </div>
                        <div className={styles.activeFiltersList}>
                          {search && <span className={styles.activeFilter}>Search: "{search}"</span>}
                          {srcFilter && <span className={styles.activeFilter}>Source: {sources.find(s => s.s_code === srcFilter)?.label || srcFilter}</span>}
                          {catFilter && <span className={styles.activeFilter}>Category: {types.find(t => t.t_code === catFilter)?.label || catFilter}</span>}
                          {regionFilter && <span className={styles.activeFilter}>Region: {regions.find(r => r.r_code === regionFilter)?.label || regionFilter}</span>}
                          {countryFilter && <span className={styles.activeFilter}>Country: {countries.find(c => c.c_code === countryFilter)?.label || countryFilter}</span>}
                          {imageTypeFilter && <span className={styles.activeFilter}>Type: {imageTypes.find(it => it.image_type === imageTypeFilter)?.label || imageTypeFilter}</span>}
                          {showReferenceExamples && <span className={styles.activeFilter}>Reference Examples Only</span>}
                        </div>
                        <div className={styles.filterStatusActions}>
                          <Button
                            name="clear-filters-modal"
                            variant="secondary"
                            size={1}
                            onClick={clearAllFilters}
                          >
                            Clear Filters
                          </Button>
                          <Button
                            name="continue-with-filters"
                            variant="primary"
                            size={1}
                            onClick={() => setExportModalStage('export')}
                          >
                            Continue
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={styles.filterStatusCount}>
                          {captions.length} examples available
                        </div>
                        <Button
                          name="continue-no-filters"
                          variant="primary"
                          size={1}
                          onClick={() => setExportModalStage('export')}
                        >
                          Continue
                        </Button>
                      </>
                    )}
                  </div>
                  
                  <div className={styles.ratingWarningButtons}>
                    <Button
                      name="cancel-export"
                      variant="tertiary"
                      onClick={() => {
                        setShowExportModal(false);
                        setExportModalStage('filters');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
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
                    label={`Crisis Maps (${filtered.filter(img => img.image_type === 'crisis_map').length} images)`}
                    value={crisisMapsSelected}
                    onChange={(value, _name) => setCrisisMapsSelected(value)}
                    disabled={isLoadingFilters}
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <Checkbox
                    name="drone-images"
                    label={`Drone Images (${filtered.filter(img => img.image_type === 'drone_image').length} images)`}
                    value={droneImagesSelected}
                    onChange={(value, _name) => setDroneImagesSelected(value)}
                    disabled={isLoadingFilters}
                  />
                </div>
              </div>
              
                                <div className={styles.ratingWarningButtons}>
                    {(search || srcFilter || catFilter || regionFilter || countryFilter || imageTypeFilter || showReferenceExamples) && (
                      <Button
                        name="back-to-filters"
                        variant="secondary"
                        onClick={() => setExportModalStage('filters')}
                      >
                        Back to Filters
                      </Button>
                    )}
                <Button
                  name="confirm-export"
                  onClick={() => {
                    if (!crisisMapsSelected && !droneImagesSelected) {
                      alert('Please select at least one image type to export.');
                      return;
                    }
                    
                    const selectedTypes: string[] = [];
                    if (crisisMapsSelected) selectedTypes.push('crisis_map');
                    if (droneImagesSelected) selectedTypes.push('drone_image');
                    
                    const filteredByType = filtered.filter(img => selectedTypes.includes(img.image_type));
                    exportDataset(filteredByType, exportMode);
                    setShowExportModal(false);
                    setExportModalStage('filters');
                  }}
                >
                  Export Selected
                </Button>
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
