import { PageContainer, Container, Button, Spinner, SegmentInput, TextInput, SelectInput, MultiSelectInput, Checkbox } from '@ifrc-go/ui';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeftLineIcon, ChevronRightLineIcon, DeleteBinLineIcon } from '@ifrc-go/icons';
import styles from './MapDetailPage.module.css';
import { useFilterContext } from '../../contexts/FilterContext';
import { useAdmin } from '../../contexts/AdminContext';

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
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMode, setExportMode] = useState<'standard' | 'fine-tuning'>('standard');
  const [trainSplit, setTrainSplit] = useState(80);
  const [testSplit, setTestSplit] = useState(10);
  const [valSplit, setValSplit] = useState(10);
  const [crisisMapsSelected, setCrisisMapsSelected] = useState(true);
  const [droneImagesSelected, setDroneImagesSelected] = useState(true);
  
  const [isDeleting, setIsDeleting] = useState(false);
  
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
    if (!map || loading || isDeleting) return;
    
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
  }, [map, search, srcFilter, catFilter, regionFilter, countryFilter, imageTypeFilter, showReferenceExamples, mapId, navigate, loading, isDeleting]);

  const checkNavigationAvailability = async (currentId: string) => {
    try {
      const response = await fetch('/api/images');
      if (response.ok) {
        const images = await response.json();
        
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
    
    setIsNavigating(true);
    try {
      const response = await fetch('/api/images');
      if (response.ok) {
        const images = await response.json();
        
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
        
        if (currentIndex === -1) {
          console.error('Current image not found in filtered list');
          return;
        }
        
        let targetIndex: number;
        if (direction === 'previous') {
          targetIndex = currentIndex > 0 ? currentIndex - 1 : filteredImages.length - 1;
        } else {
          targetIndex = currentIndex < filteredImages.length - 1 ? currentIndex + 1 : 0;
        }
        
        const targetImage = filteredImages[targetIndex];
        if (targetImage) {
          navigate(`/map/${targetImage.image_id}`);
        }
      }
    } catch (error) {
      console.error('Failed to navigate to item:', error);
    } finally {
      setIsNavigating(false);
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
  
  // delete function
  const handleDelete = async () => {
    if (!map) return;
    
    setShowDeleteConfirm(true);
  };

  const toggleStarred = async () => {
    if (!map) return;
    
    try {
      const response = await fetch(`/api/images/${map.image_id}`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          starred: !map.starred
        })
      });
      
      if (response.ok) {
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
    
    setIsDeleting(true);
    try {
      console.log('Deleting image with ID:', map.image_id);
      const response = await fetch(`/api/images/${map.image_id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setMap(prev => prev ? { ...prev, starred: !prev.starred } : null);
        setShowDeleteConfirm(false);
        
        try {
          const response = await fetch('/api/images');
          if (response.ok) {
            const images = await response.json();
            
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
            
            const remainingImages = filteredImages.filter((img: any) => img.image_id !== map.image_id);
            
            if (remainingImages.length > 0) {
              const currentIndex = filteredImages.findIndex((img: any) => img.image_id === map.image_id);
              
              let targetIndex: number;
              if (currentIndex === filteredImages.length - 1) {
                targetIndex = currentIndex - 1;
              } else {
                targetIndex = currentIndex;
              }
              
              console.log('Navigation target:', { currentIndex, targetIndex, targetId: remainingImages[targetIndex]?.image_id });
              
              if (targetIndex >= 0 && targetIndex < remainingImages.length) {
                console.log('Navigating to:', remainingImages[targetIndex].image_id);
                navigate(`/map/${remainingImages[targetIndex].image_id}`);
              } else {
                console.log('Fallback navigation to first item:', remainingImages[0].image_id);
                navigate(`/map/${remainingImages[0].image_id}`);
              }
            } else {
              console.log('No remaining items, going to explore page');
              navigate('/explore');
            }
          } else {
            navigate('/explore');
          }
        } catch (error) {
          console.error('Failed to navigate to next item:', error);
          navigate('/explore');
        } finally {
          setIsDeleting(false);
        }
      } else {
        console.error('Delete failed');
        setIsDeleting(false);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      setIsDeleting(false);
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
 
  const createImageData = (map: any, fileName: string) => ({
    image: `images/${fileName}`,
    caption: map.edited || map.generated || '',
    metadata: {
      image_id: map.image_id,
      title: map.title,
      source: map.source,
      event_type: map.event_type,
      image_type: map.image_type,
      countries: map.countries,
      starred: map.starred
    }
  });

  const exportDataset = async (mode: 'standard' | 'fine-tuning') => {
    if (!map) return;
    
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      if (map.image_type === 'crisis_map') {
        const crisisFolder = zip.folder('crisis_maps_dataset');
        const crisisImagesFolder = crisisFolder?.folder('images');
        
        if (crisisImagesFolder) {
          try {
            const response = await fetch(map.image_url);
            if (!response.ok) throw new Error(`Failed to fetch image ${map.image_id}`);
            
            const blob = await response.blob();
            const fileExtension = map.file_key.split('.').pop() || 'jpg';
            const fileName = `0001.${fileExtension}`;
            
            crisisImagesFolder.file(fileName, blob);
            
            if (mode === 'fine-tuning') {
              const trainData: any[] = [];
              const testData: any[] = [];
              const valData: any[] = [];

              if (String(map?.image_type) === 'crisis_map') {
                const random = Math.random();
                if (random < trainSplit / 100) {
                  trainData.push(createImageData(map, '0001'));
                } else if (random < (trainSplit + testSplit) / 100) {
                  testData.push(createImageData(map, '0001'));
                } else {
                  valData.push(createImageData(map, '0001'));
                }
              } else if (String(map?.image_type) === 'drone_image') {
                const random = Math.random();
                if (random < trainSplit / 100) {
                  trainData.push(createImageData(map, '0001'));
                } else if (random < (trainSplit + testSplit) / 100) {
                  testData.push(createImageData(map, '0001'));
                } else {
                  valData.push(createImageData(map, '0001'));
                }
              }

              if (crisisFolder) {
                crisisFolder.file('train.jsonl', JSON.stringify(trainData, null, 2));
                crisisFolder.file('test.jsonl', JSON.stringify(testData, null, 2));
                crisisFolder.file('val.jsonl', JSON.stringify(valData, null, 2));
              }
            } else {
              const jsonData = {
                image: `images/${fileName}`,
                caption: map.edited || map.generated || '',
                metadata: {
                  image_id: map.image_id,
                  title: map.title,
                  source: map.source,
                  event_type: map.event_type,
                  image_type: map.image_type,
                  countries: map.countries,
                  starred: map.starred
                }
              };
              
              if (crisisFolder) {
                crisisFolder.file('0001.json', JSON.stringify(jsonData, null, 2));
              }
            }
          } catch (error) {
            console.error(`Failed to process image ${map.image_id}:`, error);
            throw error;
          }
        }
      } else if (map.image_type === 'drone_image') {
        const droneFolder = zip.folder('drone_images_dataset');
        const droneImagesFolder = droneFolder?.folder('images');
        
        if (droneImagesFolder) {
          try {
            const response = await fetch(map.image_url);
            if (!response.ok) throw new Error(`Failed to fetch image ${map.image_id}`);
            
            const blob = await response.blob();
            const fileExtension = map.file_key.split('.').pop() || 'jpg';
            const fileName = `0001.${fileExtension}`;
            
            droneImagesFolder.file(fileName, blob);
            
            if (mode === 'fine-tuning') {
              const trainData: any[] = [];
              const testData: any[] = [];
              const valData: any[] = [];

              if (String(map?.image_type) === 'crisis_map') {
                const random = Math.random();
                if (random < trainSplit / 100) {
                  trainData.push(createImageData(map, '0001'));
                } else if (random < (trainSplit + testSplit) / 100) {
                  testData.push(createImageData(map, '0001'));
                } else {
                  valData.push(createImageData(map, '0001'));
                }
              } else if (String(map?.image_type) === 'drone_image') {
                const random = Math.random();
                if (random < trainSplit / 100) {
                  trainData.push(createImageData(map, '0001'));
                } else if (random < (trainSplit + testSplit) / 100) {
                  testData.push(createImageData(map, '0001'));
                } else {
                  valData.push(createImageData(map, '0001'));
                }
              }

              if (droneFolder) {
                droneFolder.file('train.jsonl', JSON.stringify(trainData, null, 2));
                droneFolder.file('test.jsonl', JSON.stringify(testData, null, 2));
                droneFolder.file('val.jsonl', JSON.stringify(valData, null, 2));
              }
            } else {
              const jsonData = {
                image: `images/${fileName}`,
                caption: map.edited || map.generated || '',
                metadata: {
                  image_id: map.image_id,
                  title: map.title,
                  source: map.source,
                  event_type: map.event_type,
                  image_type: map.image_type,
                  countries: map.countries,
                  starred: map.starred
                }
              };
              
              if (droneFolder) {
                droneFolder.file('0001.json', JSON.stringify(jsonData, null, 2));
              }
            }
          } catch (error) {
            console.error(`Failed to process image ${map.image_id}:`, error);
            throw error;
          }
        }
      } else {
        const genericFolder = zip.folder('generic_dataset');
        const genericImagesFolder = genericFolder?.folder('images');
        
        if (genericImagesFolder) {
          try {
            const response = await fetch(map.image_url);
            if (!response.ok) throw new Error(`Failed to fetch image ${map.image_id}`);
            
            const blob = await response.blob();
            const fileExtension = map.file_key.split('.').pop() || 'jpg';
            const fileName = `0001.${fileExtension}`;
            
            genericImagesFolder.file(fileName, blob);
            
            if (mode === 'fine-tuning') {
              const trainData: any[] = [];
              const testData: any[] = [];
              const valData: any[] = [];

              if (String(map?.image_type) === 'crisis_map') {
                const random = Math.random();
                if (random < trainSplit / 100) {
                  trainData.push(createImageData(map, '0001'));
                } else if (random < (trainSplit + testSplit) / 100) {
                  testData.push(createImageData(map, '0001'));
                } else {
                  valData.push(createImageData(map, '0001'));
                }
              } else if (String(map?.image_type) === 'drone_image') {
                const random = Math.random();
                if (random < trainSplit / 100) {
                  trainData.push(createImageData(map, '0001'));
                } else if (random < (trainSplit + testSplit) / 100) {
                  testData.push(createImageData(map, '0001'));
                } else {
                  valData.push(createImageData(map, '0001'));
                }
              }

              if (genericFolder) {
                genericFolder.file('train.jsonl', JSON.stringify(trainData, null, 2));
                genericFolder.file('test.jsonl', JSON.stringify(testData, null, 2));
                genericFolder.file('val.jsonl', JSON.stringify(valData, null, 2));
              }
            } else {
              const jsonData = {
                image: `images/${fileName}`,
                caption: map.edited || map.generated || '',
                metadata: {
                  image_id: map.image_id,
                  title: map.title,
                  source: map.source,
                  event_type: map.event_type,
                  image_type: map.image_type,
                  countries: map.countries,
                  starred: map.starred
                }
              };
              
              if (genericFolder) {
                genericFolder.file('0001.json', JSON.stringify(jsonData, null, 2));
              }
            }
          } catch (error) {
            console.error(`Failed to process image ${map.image_id}:`, error);
            throw error;
          }
        }
      }

      // Generate and download zip
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dataset_${map.image_type}_${map.image_id}_${mode}_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log(`Exported ${map.image_type} dataset with 1 image in ${mode} mode`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export dataset. Please try again.');
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
          
          {/* Export Dataset Button */}
          <Button
            name="export-dataset"
            variant="secondary"
            onClick={() => setShowExportModal(true)}
          >
            Export Dataset
          </Button>
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
                        {filteredMap.starred && (
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

      {/* Export Selection Modal */}
      {showExportModal && (
        <div className={styles.fullSizeModalOverlay} onClick={() => setShowExportModal(false)}>
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
                    label="Crisis Maps"
                    value={crisisMapsSelected}
                    onChange={(value, _name) => setCrisisMapsSelected(value)}
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <Checkbox
                    name="drone-images"
                    label="Drone Images"
                    value={droneImagesSelected}
                    onChange={(value, _name) => setDroneImagesSelected(value)}
                  />
                </div>
              </div>
              
              <div className={styles.ratingWarningButtons}>
                <Button
                  name="confirm-export"
                  onClick={() => {
                    if (!crisisMapsSelected && !droneImagesSelected) {
                      alert('Please select at least one image type to export.');
                      return;
                    }
                    
                    if ((map?.image_type === 'crisis_map' && crisisMapsSelected) || 
                        (map?.image_type === 'drone_image' && droneImagesSelected)) {
                      exportDataset(exportMode);
                    } else {
                      alert('The current image type is not selected for export.');
                      return;
                    }
                    
                    setShowExportModal(false);
                  }}
                >
                  Export Selected
                </Button>
                <Button
                  name="cancel-export"
                  variant="tertiary"
                  onClick={() => setShowExportModal(false)}
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