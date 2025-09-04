import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageContainer, Container, SegmentInput, Spinner, Button } from '@ifrc-go/ui';
import { DeleteBinLineIcon } from '@ifrc-go/icons';
import { useFilterContext } from '../../hooks/useFilterContext';
import { useAdmin } from '../../hooks/useAdmin';
import FilterBar from '../../components/FilterBar';
import Paginator from '../../components/Paginator';
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
  thumbnail_url?: string;  // URL to smallest version (300x200px)
  detail_url?: string;    // URL to medium quality version (800x600px)
  source: string;
  event_type: string;
  epsg: string;
  image_type: string;
  countries: {c_code: string, label: string, r_code: string}[];
  // Multi-upload fields
  all_image_ids?: string[];
  image_count?: number;
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAdmin();
  const [view, setView] = useState<'explore' | 'mapDetails'>('explore');
  const [captions, setCaptions] = useState<ImageWithCaptionOut[]>([]);
  
  const {
    search, 
    srcFilter, 
    catFilter, 
    regionFilter, 
    countryFilter, 
    imageTypeFilter, 
    uploadTypeFilter,
    showReferenceExamples,
    setShowReferenceExamples
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
  
  // Delete state management
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const viewOptions = [
    { key: 'explore' as const, label: 'List' },
    { key: 'mapDetails' as const, label: 'Carousel' }
  ];

  const fetchCaptions = () => {
    setIsLoadingContent(true);
    
    // Build query parameters for server-side filtering and pagination
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: itemsPerPage.toString()
    });
    
    if (search) params.append('search', search);
    if (srcFilter) params.append('source', srcFilter);
    if (catFilter) params.append('event_type', catFilter);
    if (regionFilter) params.append('region', regionFilter);
    if (countryFilter) params.append('country', countryFilter);
    if (imageTypeFilter) params.append('image_type', imageTypeFilter);
    if (uploadTypeFilter) params.append('upload_type', uploadTypeFilter);
    if (showReferenceExamples) params.append('starred_only', 'true');
    
    fetch(`/api/images/grouped?${params.toString()}`)
      .then(r => {
        if (!r.ok) {
          console.error('ExplorePage: Grouped endpoint failed, trying legacy endpoint');
          // Fallback to legacy endpoint for backward compatibility
          return fetch('/api/captions/legacy').then(r2 => {
            if (!r2.ok) {
              console.error('ExplorePage: Legacy endpoint failed, trying regular images endpoint');
              return fetch('/api/images').then(r3 => {
                if (!r3.ok) {
                  throw new Error(`HTTP ${r3.status}: ${r3.statusText}`);
                }
                return r3.json();
              });
            }
            return r2.json();
          });
        }
        return r.json();
      })
      .then(data => {
        console.log('ExplorePage: Fetched captions:', data);
        setCaptions(data);
      })
      .catch(error => {
        console.error('ExplorePage: Error fetching captions:', error);
        setCaptions([]);
      })
      .finally(() => {
        setIsLoadingContent(false);
      });
  };

  const fetchTotalCount = () => {
    // Build query parameters for count endpoint
    const params = new URLSearchParams();
    
    if (search) params.append('search', search);
    if (srcFilter) params.append('source', srcFilter);
    if (catFilter) params.append('event_type', catFilter);
    if (regionFilter) params.append('region', regionFilter);
    if (countryFilter) params.append('country', countryFilter);
    if (imageTypeFilter) params.append('image_type', imageTypeFilter);
    if (uploadTypeFilter) params.append('upload_type', uploadTypeFilter);
    if (showReferenceExamples) params.append('starred_only', 'true');
    
    fetch(`/api/images/grouped/count?${params.toString()}`)
      .then(r => {
        if (!r.ok) {
          console.error('ExplorePage: Count endpoint failed');
          return { total_count: 0 };
        }
        return r.json();
      })
      .then(data => {
        console.log('ExplorePage: Total count:', data.total_count);
        setTotalItems(data.total_count);
        setTotalPages(Math.ceil(data.total_count / itemsPerPage));
      })
      .catch(error => {
        console.error('ExplorePage: Error fetching total count:', error);
        setTotalItems(0);
        setTotalPages(0);
      });
  };

  // Fetch data when component mounts or filters change
  useEffect(() => {
    fetchCaptions();
    fetchTotalCount();
  }, [currentPage, search, srcFilter, catFilter, regionFilter, countryFilter, imageTypeFilter, uploadTypeFilter, showReferenceExamples]);

  // Reset to first page when filters change (but not when currentPage changes)
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [search, srcFilter, catFilter, regionFilter, countryFilter, imageTypeFilter, uploadTypeFilter, showReferenceExamples]);

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

  // Server-side pagination - no client-side filtering needed
  const paginatedResults = captions;

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
          // Process each caption (which may contain multiple images)
          let jsonIndex = 1;
          
          for (const caption of crisisMaps) {
            try {
              // Get all image IDs for this caption
              const imageIds = caption.image_count && caption.image_count > 1 
                ? caption.all_image_ids || [caption.image_id]
                : [caption.image_id];
              
              // Fetch all images for this caption
              const imagePromises = imageIds.map(async (imageId, imgIndex) => {
                try {
                  const response = await fetch(`/api/images/${imageId}/file`);
                  if (!response.ok) throw new Error(`Failed to fetch image ${imageId}`);
              
              const blob = await response.blob();
                  const fileExtension = caption.file_key.split('.').pop() || 'jpg';
                  const fileName = `${String(jsonIndex).padStart(4, '0')}_${String(imgIndex + 1).padStart(2, '0')}.${fileExtension}`;
              
              crisisImagesFolder.file(fileName, blob);
                  return { success: true, fileName, imageId };
            } catch (error) {
                  console.error(`Failed to process image ${imageId}:`, error);
                  return { success: false, fileName: '', imageId };
            }
          });

              const imageResults = await Promise.all(imagePromises);
              const successfulImages = imageResults.filter(result => result.success);

                             if (successfulImages.length > 0) {
          if (mode === 'fine-tuning') {
                   // For fine-tuning, create one entry per caption with all images
                   const imageFiles = successfulImages.map(result => `images/${result.fileName}`);
                   
                   const random = Math.random();
                   const entry = {
                     image: imageFiles.length === 1 ? imageFiles[0] : imageFiles,
                     caption: caption.edited || caption.generated || '',
                     metadata: {
                       image_id: imageIds,
                       title: caption.title,
                       source: caption.source,
                       event_type: caption.event_type,
                       image_type: caption.image_type,
                       countries: caption.countries,
                       starred: caption.starred,
                       image_count: caption.image_count || 1
                     }
                   };

                   // Store the entry for later processing
                   if (!crisisFolder) continue;
                   
                   if (random < 0.8) {
                     // Add to train data
                     const trainFile = crisisFolder.file('train.jsonl');
                     if (trainFile) {
                       const existingData = await trainFile.async('string').then(data => JSON.parse(data || '[]')).catch(() => []);
                       existingData.push(entry);
                       crisisFolder.file('train.jsonl', JSON.stringify(existingData, null, 2));
                     } else {
                       crisisFolder.file('train.jsonl', JSON.stringify([entry], null, 2));
                     }
                   } else if (random < 0.9) {
                     // Add to test data
                     const testFile = crisisFolder.file('test.jsonl');
                     if (testFile) {
                       const existingData = await testFile.async('string').then(data => JSON.parse(data || '[]')).catch(() => []);
                       existingData.push(entry);
                       crisisFolder.file('test.jsonl', JSON.stringify(existingData, null, 2));
                     } else {
                       crisisFolder.file('test.jsonl', JSON.stringify([entry], null, 2));
                     }
                   } else {
                     // Add to validation data
                     const valFile = crisisFolder.file('val.jsonl');
                     if (valFile) {
                       const existingData = await valFile.async('string').then(data => JSON.parse(data || '[]')).catch(() => []);
                       existingData.push(entry);
                       crisisFolder.file('val.jsonl', JSON.stringify(existingData, null, 2));
                     } else {
                       crisisFolder.file('val.jsonl', JSON.stringify([entry], null, 2));
                     }
            }
          } else {
                  // For standard mode, create one JSON file per caption
                  const imageFiles = successfulImages.map(result => `images/${result.fileName}`);
              const jsonData = {
                    image: imageFiles.length === 1 ? imageFiles[0] : imageFiles,
                    caption: caption.edited || caption.generated || '',
                metadata: {
                      image_id: imageIds,
                      title: caption.title,
                      source: caption.source,
                      event_type: caption.event_type,
                      image_type: caption.image_type,
                      countries: caption.countries,
                      starred: caption.starred,
                      image_count: caption.image_count || 1
                }
              };
              
              if (crisisFolder) {
                    crisisFolder.file(`${String(jsonIndex).padStart(4, '0')}.json`, JSON.stringify(jsonData, null, 2));
                  }
                }
                
                jsonIndex++;
              }
            } catch (error) {
              console.error(`Failed to process caption ${caption.image_id}:`, error);
            }
          }
        }
      }
      
      // Create drone_images dataset
      if (droneImages.length > 0) {
        const droneFolder = zip.folder('drone_images_dataset');
        const droneImagesFolder = droneFolder?.folder('images');
        
        if (droneImagesFolder) {
          // Process each caption (which may contain multiple images)
          let jsonIndex = 1;
          
          for (const caption of droneImages) {
            try {
              // Get all image IDs for this caption
              const imageIds = caption.image_count && caption.image_count > 1 
                ? caption.all_image_ids || [caption.image_id]
                : [caption.image_id];
              
              // Fetch all images for this caption
              const imagePromises = imageIds.map(async (imageId, imgIndex) => {
                try {
                  const response = await fetch(`/api/images/${imageId}/file`);
                  if (!response.ok) throw new Error(`Failed to fetch image ${imageId}`);
              
              const blob = await response.blob();
                  const fileExtension = caption.file_key.split('.').pop() || 'jpg';
                  const fileName = `${String(jsonIndex).padStart(4, '0')}_${String(imgIndex + 1).padStart(2, '0')}.${fileExtension}`;
              
              droneImagesFolder.file(fileName, blob);
                  return { success: true, fileName, imageId };
            } catch (error) {
                  console.error(`Failed to process image ${imageId}:`, error);
                  return { success: false, fileName: '', imageId };
            }
          });

              const imageResults = await Promise.all(imagePromises);
              const successfulImages = imageResults.filter(result => result.success);

              if (successfulImages.length > 0) {
          if (mode === 'fine-tuning') {
                  // For fine-tuning, create one entry per caption with all images
                  const imageFiles = successfulImages.map(result => `images/${result.fileName}`);
                  
                  const random = Math.random();
                  const entry = {
                    image: imageFiles.length === 1 ? imageFiles[0] : imageFiles,
                    caption: caption.edited || caption.generated || '',
                    metadata: {
                      image_id: imageIds,
                      title: caption.title,
                      source: caption.source,
                      event_type: caption.event_type,
                      image_type: caption.image_type,
                      countries: caption.countries,
                      starred: caption.starred,
                      image_count: caption.image_count || 1
                    }
                  };

                  // Store the entry for later processing
                  if (!droneFolder) continue;
                  
                  if (random < 0.8) {
                    // Add to train data
                    const trainFile = droneFolder.file('train.jsonl');
                    if (trainFile) {
                      const existingData = await trainFile.async('string').then(data => JSON.parse(data || '[]')).catch(() => []);
                      existingData.push(entry);
                      droneFolder.file('train.jsonl', JSON.stringify(existingData, null, 2));
                    } else {
                      droneFolder.file('train.jsonl', JSON.stringify([entry], null, 2));
                    }
                  } else if (random < 0.9) {
                    // Add to test data
                    const testFile = droneFolder.file('test.jsonl');
                    if (testFile) {
                      const existingData = await testFile.async('string').then(data => JSON.parse(data || '[]')).catch(() => []);
                      existingData.push(entry);
                      droneFolder.file('test.jsonl', JSON.stringify(existingData, null, 2));
                    } else {
                      droneFolder.file('test.jsonl', JSON.stringify([entry], null, 2));
                    }
                  } else {
                    // Add to validation data
                    const valFile = droneFolder.file('val.jsonl');
                    if (valFile) {
                      const existingData = await valFile.async('string').then(data => JSON.parse(data || '[]')).catch(() => []);
                      existingData.push(entry);
                      droneFolder.file('val.jsonl', JSON.stringify(existingData, null, 2));
                    } else {
                      droneFolder.file('val.jsonl', JSON.stringify([entry], null, 2));
                    }
            }
          } else {
                  // For standard mode, create one JSON file per caption
                  const imageFiles = successfulImages.map(result => `images/${result.fileName}`);
              const jsonData = {
                    image: imageFiles.length === 1 ? imageFiles[0] : imageFiles,
                    caption: caption.edited || caption.generated || '',
                metadata: {
                      image_id: imageIds,
                      title: caption.title,
                      source: caption.source,
                      event_type: caption.event_type,
                      image_type: caption.image_type,
                      countries: caption.countries,
                      starred: caption.starred,
                      image_count: caption.image_count || 1
                }
              };
              
              if (droneFolder) {
                    droneFolder.file(`${String(jsonIndex).padStart(4, '0')}.json`, JSON.stringify(jsonData, null, 2));
                  }
                }
                
                jsonIndex++;
              }
            } catch (error) {
              console.error(`Failed to process caption ${caption.image_id}:`, error);
            }
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

  // Delete functions
  const handleDelete = (imageId: string) => {
    setImageToDelete(imageId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!imageToDelete) return;
    
    setIsDeleting(true);
    try {
      console.log('Deleting image with ID:', imageToDelete);
      const response = await fetch(`/api/images/${imageToDelete}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove the deleted image from the captions list
        setCaptions(prev => prev.filter(img => img.image_id !== imageToDelete));
        setShowDeleteConfirm(false);
        setImageToDelete('');
      } else {
        console.error('Delete failed');
        alert('Failed to delete image. Please try again.');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete image. Please try again.');
    } finally {
      setIsDeleting(false);
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
            
            {/* Action Buttons - Right Aligned */}
            <div className="flex items-center gap-2 ml-auto">
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

              {/* Export Dataset Button */}
              <Button
                name="export-dataset"
                variant="secondary"
                onClick={() => setShowExportModal(true)}
              >
                Export
              </Button>
            </div>
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
                    {paginatedResults.length} of {totalItems} examples
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
                  {paginatedResults.map(c => (
                    <div key={c.image_id} className="flex items-center gap-4">
                      {/* Card Content */}
                      <div className={`${styles.mapItem} flex-1`} onClick={() => {
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
                          {/* Explore Page: Prioritize thumbnails for faster loading */}
                          {c.thumbnail_url ? (
                            <>
                              {console.log('ExplorePage: Using thumbnail for fast loading:', c.thumbnail_url)}
                              <img 
                                src={c.thumbnail_url} 
                                alt={c.file_key}
                                onError={(e) => {
                                  console.error('ExplorePage: Thumbnail failed to load, falling back to original:', c.thumbnail_url);
                                  // Fallback to original image
                                  const target = e.target as HTMLImageElement;
                                  if (c.image_url) {
                                    target.src = c.image_url;
                                  } else {
                                    target.style.display = 'none';
                                    target.parentElement!.innerHTML = 'Img';
                                  }
                                }}
                                onLoad={() => console.log('ExplorePage: Thumbnail loaded successfully:', c.thumbnail_url)}
                              />
                            </>
                          ) : c.image_url ? (
                            <>
                              {console.log('ExplorePage: No thumbnail available, using original image:', c.image_url)}
                              <img 
                                src={c.image_url} 
                                alt={c.file_key}
                                onError={(e) => {
                                  console.error('ExplorePage: Original image failed to load:', c.image_url);
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.parentElement!.innerHTML = 'Img';
                                }}
                                onLoad={() => console.log('ExplorePage: Original image loaded successfully:', c.image_url)}
                              />
                            </>
                          ) : (
                            <>
                              {console.log('ExplorePage: No image_url or thumbnail provided for item:', c)}
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
                                  {c.source && c.source.includes(', ') 
                                    ? c.source.split(', ').map(s => sources.find(src => src.s_code === s.trim())?.label || s.trim()).join(', ')
                                    : sources.find(s => s.s_code === c.source)?.label || c.source
                                  }
                                </span>
                              )}
                              <span className={styles.metadataTagType}>
                                {c.event_type && c.event_type.includes(', ')
                                  ? c.event_type.split(', ').map(e => types.find(t => t.t_code === e.trim())?.label || e.trim()).join(', ')
                                  : types.find(t => t.t_code === c.event_type)?.label || c.event_type
                                }
                              </span>
                              <span className={styles.metadataTag}>
                                {imageTypes.find(it => it.image_type === c.image_type)?.label || c.image_type}
                              </span>
                              {c.image_count && c.image_count > 1 && (
                                <span className={styles.metadataTag} title={`Multi-upload with ${c.image_count} images`}>
                                  📷 {c.image_count}
                                </span>
                              )}
                              {(!c.image_count || c.image_count <= 1) && (
                                <span className={styles.metadataTag} title="Single Upload">
                                  Single
                                </span>
                              )}
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
                      
                      {/* Delete Button - Admin Only */}
                      {isAuthenticated && (
                        <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2">
                          <Button
                            name={`delete-${c.image_id}`}
                            variant="tertiary"
                            size={1}
                            className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 hover:border-red-300"
                            onClick={() => handleDelete(c.image_id)}
                            title="Delete"
                            aria-label="Delete saved image"
                          >
                            <DeleteBinLineIcon className="w-4 h-4" />
                          </Button>
                        </Container>
                      )}
                    </div>
                  ))}

                  {!paginatedResults.length && (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No examples found.</p>
                    </div>
                  )}
                  
                  {/* Enhanced Paginator Component */}
                  {!isLoadingContent && paginatedResults.length > 0 && (
                    <Paginator
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={totalItems}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                    />
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
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
                <Button
                  name="cancel-delete"
                  variant="tertiary"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
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
          const filteredByType = paginatedResults.filter((img: ImageWithCaptionOut) => selectedTypes.includes(img.image_type));
          exportDataset(filteredByType, mode);
        }}
        filteredCount={paginatedResults.length}
        totalCount={totalItems}
        hasFilters={!!(search || srcFilter || catFilter || regionFilter || countryFilter || imageTypeFilter || uploadTypeFilter || showReferenceExamples)}
        crisisMapsCount={paginatedResults.filter((img: ImageWithCaptionOut) => img.image_type === 'crisis_map').length}
        droneImagesCount={paginatedResults.filter((img: ImageWithCaptionOut) => img.image_type === 'drone_image').length}
        isLoading={isExporting}
        exportSuccess={exportSuccess}
      />
    </PageContainer>
  );
}
