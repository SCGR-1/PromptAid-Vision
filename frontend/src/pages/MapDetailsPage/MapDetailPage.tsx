import { PageContainer, Container, Button, Spinner, SegmentInput, TextInput, SelectInput, MultiSelectInput } from '@ifrc-go/ui';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeftLineIcon, ChevronRightLineIcon, DeleteBinLineIcon } from '@ifrc-go/icons';
import styles from './MapDetailPage.module.css';
import { useFilterContext } from '../../hooks/useFilterContext';
import { useAdmin } from '../../hooks/useAdmin';
import ExportModal from '../../components/ExportModal';
import { FullSizeImageModal } from '../../components/upload/ModalComponents';
import FilterBar from '../../components/FilterBar';

interface MapOut {
  image_id: string;
  file_key: string;
  sha256: string;
  source: string;
  event_type: string;
  epsg: string;
  image_type: string;
  image_url: string;
  detail_url?: string;  // URL to medium quality version (800x600px)
  countries: Array<{
    c_code: string;
    label: string;
    r_code: string;
  }>;
  title?: string;
  prompt?: string;
  model?: string;
  schema_id?: string;
  raw_json?: {
    extracted_metadata?: {
      description?: string;
      analysis?: string;
      recommended_actions?: string;
      metadata?: Record<string, unknown>;
    };
    fallback_info?: Record<string, unknown>;
    [key: string]: unknown;
  };
  generated?: string;
  edited?: string;
  accuracy?: number;
  context?: number;
  usability?: number;
  starred?: boolean;
  created_at?: string;
  updated_at?: string;
  // Multi-upload fields
  all_image_ids?: string[];
  image_count?: number;
}

export default function MapDetailPage() {
  const { mapId } = useParams<{ mapId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAdmin();
  
  // Debug: Log the current URL and mapId for production debugging
  console.log('MapDetailsPage: Current URL:', window.location.href);
  console.log('MapDetailsPage: Hash:', window.location.hash);
  console.log('MapDetailsPage: mapId from useParams:', mapId);
  console.log('MapDetailsPage: mapId type:', typeof mapId);
  console.log('MapDetailsPage: mapId length:', mapId?.length);
  console.log('MapDetailsPage: mapId value:', JSON.stringify(mapId));
  
  // Early validation - if mapId is invalid, show error immediately
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!mapId || mapId === 'undefined' || mapId === 'null' || mapId.trim() === '' || !uuidRegex.test(mapId)) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center gap-4 text-center py-12">
          <div className="text-4xl">⚠️</div>
          <div className="text-xl font-semibold">Invalid Map ID</div>
          <div>The map ID provided is not valid.</div>
          <div className="text-sm text-gray-500 mt-2">
            Debug Info: mapId = "{mapId}" (type: {typeof mapId})
          </div>
          <Button
            name="back-to-explore"
            variant="secondary"
            onClick={() => navigate('/explore')}
          >
            Return to Explore
          </Button>
        </div>
      </PageContainer>
    );
  }
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
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportMode, setExportMode] = useState<'standard' | 'fine-tuning'>('standard');
  const [trainSplit, setTrainSplit] = useState(80);
  const [testSplit, setTestSplit] = useState(10);
  const [valSplit, setValSplit] = useState(10);
  const [crisisMapsSelected, setCrisisMapsSelected] = useState(true);
  const [droneImagesSelected, setDroneImagesSelected] = useState(true);
  
  const [isDeleting, setIsDeleting] = useState(false);

  
  // Full-size image modal state
  const [showFullSizeModal, setShowFullSizeModal] = useState(false);
  const [selectedImageForModal, setSelectedImageForModal] = useState<MapOut | null>(null);
  const [isLoadingFullSizeImage, setIsLoadingFullSizeImage] = useState(false);
  
  // Carousel state for multi-upload
  const [allImages, setAllImages] = useState<MapOut[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  
  const {
    search, setSearch,
    srcFilter, setSrcFilter,
    catFilter, setCatFilter,
    regionFilter, setRegionFilter,
    countryFilter, setCountryFilter,
    imageTypeFilter, setImageTypeFilter,
    uploadTypeFilter, setUploadTypeFilter,
    showReferenceExamples, setShowReferenceExamples,
    clearAllFilters
  } = useFilterContext();

  const viewOptions = [
    { key: 'explore' as const, label: 'List' },
    { key: 'mapDetails' as const, label: 'Carousel' }
  ];

  const fetchMapData = useCallback(async (id: string) => {
    console.log('fetchMapData called with id:', id);
    console.log('fetchMapData id type:', typeof id);
    
    // Validate the ID before making the request
    if (!id || id === 'undefined' || id === 'null' || id.trim() === '') {
      console.log('fetchMapData: Invalid ID detected:', id);
      setError('Invalid Map ID');
      setLoading(false);
      return;
    }

    // Additional UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log('fetchMapData: Invalid UUID format:', id);
      setError('Invalid Map ID format');
      setLoading(false);
      return;
    }

    console.log('fetchMapData: Making API call for id:', id);
    setIsNavigating(true);
    setLoading(true);
    
    try {
      const response = await fetch(`/api/images/${id}`);
      if (!response.ok) {
        throw new Error('Map not found');
      }
      const data = await response.json();
      setMap(data);
      
      // If this is a multi-upload item, fetch all images
      if (data.all_image_ids && data.all_image_ids.length > 1) {
        await fetchAllImages(data.all_image_ids);
      } else if (data.image_count && data.image_count > 1) {
        // Multi-upload but no all_image_ids, try to fetch from grouped endpoint
        console.log('Multi-upload detected but no all_image_ids, trying grouped endpoint');
        try {
          const groupedResponse = await fetch('/api/images/grouped');
          if (groupedResponse.ok) {
            const groupedData = await groupedResponse.json();
            const matchingItem = groupedData.find((item: any) => 
              item.all_image_ids && item.all_image_ids.includes(data.image_id)
            );
            if (matchingItem && matchingItem.all_image_ids) {
              await fetchAllImages(matchingItem.all_image_ids);
            } else {
              setAllImages([data]);
              setCurrentImageIndex(0);
            }
          } else {
            setAllImages([data]);
            setCurrentImageIndex(0);
          }
        } catch (err) {
          console.error('Failed to fetch from grouped endpoint:', err);
          setAllImages([data]);
          setCurrentImageIndex(0);
        }
      } else {
        setAllImages([data]);
        setCurrentImageIndex(0);
      }
      
      await checkNavigationAvailability(id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
      setIsNavigating(false);
    }
  }, []);

  const fetchAllImages = useCallback(async (imageIds: string[]) => {
    console.log('fetchAllImages called with imageIds:', imageIds);
    setIsLoadingImages(true);
    
    try {
      const imagePromises = imageIds.map(async (imageId) => {
        const response = await fetch(`/api/images/${imageId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch image ${imageId}`);
        }
        return response.json();
      });
      
      const images = await Promise.all(imagePromises);
      setAllImages(images);
      setCurrentImageIndex(0);
      console.log('fetchAllImages: Loaded', images.length, 'images');
    } catch (err: unknown) {
      console.error('fetchAllImages error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load all images');
    } finally {
      setIsLoadingImages(false);
    }
  }, []);

  // Carousel navigation functions
  const goToPrevious = useCallback(() => {
    if (allImages.length > 1) {
      setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
    }
  }, [allImages.length]);

  const goToNext = useCallback(() => {
    if (allImages.length > 1) {
      setCurrentImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
    }
  }, [allImages.length]);

  const goToImage = useCallback((index: number) => {
    if (index >= 0 && index < allImages.length) {
      setCurrentImageIndex(index);
    }
  }, [allImages.length]);

  // Full-size image modal functions
  const handleViewFullSize = useCallback(async (image?: MapOut) => {
    const imageToShow = image || (allImages.length > 0 ? allImages[currentImageIndex] : map);
    if (imageToShow) {
      setIsLoadingFullSizeImage(true);
      setSelectedImageForModal(imageToShow);
      setShowFullSizeModal(true);
      
      // Preload the full-size image
      try {
        const img = new Image();
        img.onload = () => {
          setIsLoadingFullSizeImage(false);
        };
        img.onerror = () => {
          setIsLoadingFullSizeImage(false);
        };
        img.src = imageToShow.image_url;
      } catch (error) {
        console.error('Error preloading full-size image:', error);
        setIsLoadingFullSizeImage(false);
      }
    }
  }, [allImages, currentImageIndex, map]);

  const handleCloseFullSizeModal = useCallback(() => {
    setShowFullSizeModal(false);
    setSelectedImageForModal(null);
    setIsLoadingFullSizeImage(false);
  }, []);

  useEffect(() => {
    console.log('MapDetailsPage: mapId from useParams:', mapId);
    console.log('MapDetailsPage: mapId type:', typeof mapId);
    console.log('MapDetailsPage: mapId value:', mapId);
    
    if (!mapId || 
        mapId === 'undefined' || 
        mapId === 'null' || 
        mapId.trim() === '' ||
        mapId === undefined ||
        mapId === null) {
      console.log('MapDetailsPage: Invalid mapId, setting error');
      setError('Map ID is required');
      setLoading(false);
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(mapId)) {
      console.log('MapDetailsPage: Invalid UUID format:', mapId);
      setError('Invalid Map ID format');
      setLoading(false);
      return;
    }

    console.log('MapDetailsPage: Fetching data for mapId:', mapId);
    fetchMapData(mapId);
  }, [mapId, fetchMapData]);

  // Auto-navigate to first matching item when filters change
  useEffect(() => {
    if (!map || loading || isDeleting) return;
    
    if (!mapId || mapId === 'undefined' || mapId === 'null' || mapId.trim() === '') {
      console.log('Auto-navigation skipped: Invalid mapId');
      return;
    }
    
    // Validate current mapId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(mapId)) {
      console.log('Auto-navigation skipped: Invalid mapId format');
      return;
    }
    
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
      
      const matches = matchesSearch && matchesSource && matchesCategory && matchesRegion && matchesCountry && matchesImageType && matchesReferenceExamples;
      
      console.log('Auto-navigation check:', {
        mapId,
        search,
        srcFilter,
        catFilter,
        regionFilter,
        countryFilter,
        imageTypeFilter,
        showReferenceExamples,
        matchesSearch,
        matchesSource,
        matchesCategory,
        matchesRegion,
        matchesCountry,
        matchesImageType,
        matchesReferenceExamples,
        matches
      });
      
      return matches;
    };

    if (!currentMapMatches()) {
      console.log('Current map does not match filters, looking for first matching item');
      // Find first matching item and navigate to it
      fetch('/api/images')
        .then(r => r.json())
        .then(images => {
          console.log('Auto-navigation: Received images from API:', images.length);
          console.log('Auto-navigation: First few images:', images.slice(0, 3).map((img: any) => ({ image_id: img.image_id, title: img.title })));
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
          
          console.log('Auto-navigation: Found first matching image:', firstMatching ? {
            image_id: firstMatching.image_id,
            title: firstMatching.title,
            source: firstMatching.source
          } : 'No matching image found');
          
          if (firstMatching && 
              firstMatching.image_id && 
              firstMatching.image_id !== 'undefined' && 
              firstMatching.image_id !== 'null' && 
              firstMatching.image_id.trim() !== '' &&
              firstMatching.image_id !== mapId) {
            
            // Additional UUID validation
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(firstMatching.image_id)) {
              console.log('Auto-navigating to:', firstMatching.image_id);
              navigate(`/map/${firstMatching.image_id}`);
            } else {
              console.error('Auto-navigation blocked: Invalid image_id format:', firstMatching.image_id);
            }
          }
        })
        .catch(console.error);
    }
  }, [map, search, srcFilter, catFilter, regionFilter, countryFilter, imageTypeFilter, showReferenceExamples, mapId, navigate, loading, isDeleting]);

  const checkNavigationAvailability = async (currentId: string) => {
    // Validate the ID before making the request
    if (!currentId || currentId === 'undefined' || currentId === 'null' || currentId.trim() === '') {
      return;
    }

    try {
      const response = await fetch('/api/images/grouped');
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
          const matchesUploadType = !uploadTypeFilter || 
            (uploadTypeFilter === 'single' && (!img.image_count || img.image_count <= 1)) ||
            (uploadTypeFilter === 'multiple' && img.image_count && img.image_count > 1);
          const matchesReferenceExamples = !showReferenceExamples || img.starred === true;
          
          return matchesSearch && matchesSource && matchesCategory && matchesRegion && matchesCountry && matchesImageType && matchesUploadType && matchesReferenceExamples;
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
      const response = await fetch('/api/images/grouped');
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
          const matchesUploadType = !uploadTypeFilter || 
            (uploadTypeFilter === 'single' && (!img.image_count || img.image_count <= 1)) ||
            (uploadTypeFilter === 'multiple' && img.image_count && img.image_count > 1);
          const matchesReferenceExamples = !showReferenceExamples || img.starred === true;
          
          return matchesSearch && matchesSource && matchesCategory && matchesRegion && matchesCountry && matchesImageType && matchesUploadType && matchesReferenceExamples;
        });
        
        const currentIndex = filteredImages.findIndex((img: { image_id: string }) => img.image_id === mapId);
        
        // If current image is not in filtered list, add it temporarily for navigation
        if (currentIndex === -1) {
          const currentImage = images.find((img: any) => img.image_id === mapId);
          if (currentImage) {
            filteredImages.push(currentImage);
          }
        }
        
        const adjustedCurrentIndex = filteredImages.findIndex((img: { image_id: string }) => img.image_id === mapId);
        
        if (adjustedCurrentIndex === -1) {
          console.error('Current image not found in filtered list');
          return;
        }
        
        let targetIndex: number;
        if (direction === 'previous') {
          targetIndex = adjustedCurrentIndex > 0 ? adjustedCurrentIndex - 1 : filteredImages.length - 1;
        } else {
          targetIndex = adjustedCurrentIndex < filteredImages.length - 1 ? adjustedCurrentIndex + 1 : 0;
        }
        
        const targetImage = filteredImages[targetIndex];
        if (targetImage && 
            targetImage.image_id && 
            targetImage.image_id !== 'undefined' && 
            targetImage.image_id !== 'null' && 
            targetImage.image_id.trim() !== '') {
          
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(targetImage.image_id)) {
            console.log('Carousel navigating to:', targetImage.image_id);
            navigate(`/map/${targetImage.image_id}`);
          } else {
            console.error('Carousel navigation blocked: Invalid image_id format:', targetImage.image_id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to navigate to item:', error);
    } finally {
      setIsNavigating(false);
    }
  };

  // Check navigation availability when filters change
  useEffect(() => {
    if (map && mapId && !loading && !isDeleting) {
      checkNavigationAvailability(mapId);
    }
  }, [map, mapId, search, srcFilter, catFilter, regionFilter, countryFilter, imageTypeFilter, uploadTypeFilter, showReferenceExamples, loading, isDeleting, checkNavigationAvailability]);

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
          const response = await fetch('/api/images/grouped');
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
              const matchesUploadType = !uploadTypeFilter || 
                (uploadTypeFilter === 'single' && (!img.image_count || img.image_count <= 1)) ||
                (uploadTypeFilter === 'multiple' && img.image_count && img.image_count > 1);
              const matchesReferenceExamples = !showReferenceExamples || img.starred === true;
              
              return matchesSearch && matchesSource && matchesCategory && matchesRegion && matchesCountry && matchesImageType && matchesUploadType && matchesReferenceExamples;
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
                const nextImage = remainingImages[targetIndex];
                if (nextImage && 
                    nextImage.image_id && 
                    nextImage.image_id !== 'undefined' && 
                    nextImage.image_id !== 'null' && 
                    nextImage.image_id.trim() !== '') {
                  
                  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                  if (uuidRegex.test(nextImage.image_id)) {
                    console.log('Navigating to:', nextImage.image_id);
                    navigate(`/map/${nextImage.image_id}`);
                  } else {
                    console.error('Navigation blocked: Invalid image_id format:', nextImage.image_id);
                    navigate('/explore');
                  }
                } else {
                  console.error('Navigation blocked: Invalid image_id:', nextImage?.image_id);
                  navigate('/explore');
                }
              } else if (remainingImages[0] && 
                         remainingImages[0].image_id && 
                         remainingImages[0].image_id !== 'undefined' && 
                         remainingImages[0].image_id !== 'null' && 
                         remainingImages[0].image_id.trim() !== '') {
                
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (uuidRegex.test(remainingImages[0].image_id)) {
                  console.log('Fallback navigation to first item:', remainingImages[0].image_id);
                  navigate(`/map/${remainingImages[0].image_id}`);
                } else {
                  console.error('Fallback navigation blocked: Invalid image_id format:', remainingImages[0].image_id);
                  navigate('/explore');
                }
              } else {
                console.log('No valid remaining items, going to explore page');
                navigate('/explore');
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
    
    if (!search && !srcFilter && !catFilter && !regionFilter && !countryFilter && !imageTypeFilter && !uploadTypeFilter && !showReferenceExamples) {
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
    const matchesUploadType = !uploadTypeFilter || 
      (uploadTypeFilter === 'single' && (!map.image_count || map.image_count <= 1)) ||
      (uploadTypeFilter === 'multiple' && map.image_count && map.image_count > 1);
    const matchesReferenceExamples = !showReferenceExamples || map.starred === true;
    
    const matches = matchesSearch && matchesSource && matchesCategory && matchesRegion && matchesCountry && matchesImageType && matchesUploadType && matchesReferenceExamples;
    
    // If current map doesn't match filters, navigate to a matching image
    if (!matches && (search || srcFilter || catFilter || regionFilter || countryFilter || imageTypeFilter || uploadTypeFilter || showReferenceExamples)) {
      // Navigate to a matching image after a short delay to avoid infinite loops
      setTimeout(() => {
        navigateToMatchingImage();
      }, 100);
      // Return the current map while loading to show loading state instead of "no match found"
      return map;
    }
    
    return matches ? map : null;
  }, [map, search, srcFilter, catFilter, regionFilter, countryFilter, imageTypeFilter, uploadTypeFilter, showReferenceExamples]);

  const navigateToMatchingImage = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/images/grouped');
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
          const matchesUploadType = !uploadTypeFilter || 
            (uploadTypeFilter === 'single' && (!img.image_count || img.image_count <= 1)) ||
            (uploadTypeFilter === 'multiple' && img.image_count && img.image_count > 1);
          const matchesReferenceExamples = !showReferenceExamples || img.starred === true;
          
          return matchesSearch && matchesSource && matchesCategory && matchesRegion && matchesCountry && matchesImageType && matchesUploadType && matchesReferenceExamples;
        });
        
        if (filteredImages.length > 0) {
          const firstMatchingImage = filteredImages[0];
          if (firstMatchingImage && firstMatchingImage.image_id) {
            navigate(`/map/${firstMatchingImage.image_id}`);
          }
        } else {
          // No matching images, go back to explore
          navigate('/explore');
        }
      }
    } catch (error) {
      console.error('Failed to navigate to matching image:', error);
      navigate('/explore');
    } finally {
      setLoading(false);
    }
  }, [search, srcFilter, catFilter, regionFilter, countryFilter, imageTypeFilter, uploadTypeFilter, showReferenceExamples, navigate]);

  const handleContribute = () => {
    if (!map) return;
    
    // For single image contribution
    if (!map.all_image_ids || map.all_image_ids.length <= 1) {
      const imageIds = [map.image_id];
      const url = `/upload?step=1&contribute=true&imageIds=${imageIds.join(',')}`;
      navigate(url);
      return;
    }
    
    // For multi-upload contribution
    const imageIds = map.all_image_ids;
    const url = `/upload?step=1&contribute=true&imageIds=${imageIds.join(',')}`;
    navigate(url);
  };
 
  const createImageData = (map: any, fileName: string) => ({
    image: `images/${fileName}`,
    caption: map.edited || map.generated || '',
    metadata: {
      image_id: map.image_count && map.image_count > 1 
        ? map.all_image_ids || [map.image_id]
        : map.image_id,
      title: map.title,
      source: map.source,
      event_type: map.event_type,
      image_type: map.image_type,
      countries: map.countries,
      starred: map.starred,
      image_count: map.image_count || 1
    }
  });

  const exportDataset = async (mode: 'standard' | 'fine-tuning') => {
    if (!map) return;
    
    setIsExporting(true);
    setExportSuccess(false);
    
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      if (map.image_type === 'crisis_map') {
        const crisisFolder = zip.folder('crisis_maps_dataset');
        const crisisImagesFolder = crisisFolder?.folder('images');
        
        if (crisisImagesFolder) {
          try {
            // Get all image IDs for this map
            const imageIds = map.image_count && map.image_count > 1 
              ? map.all_image_ids || [map.image_id]
              : [map.image_id];
            
            // Fetch all images for this map
            const imagePromises = imageIds.map(async (imageId, imgIndex) => {
              try {
                const response = await fetch(`/api/images/${imageId}/file`);
                if (!response.ok) throw new Error(`Failed to fetch image ${imageId}`);
                
                const blob = await response.blob();
                const fileExtension = map.file_key.split('.').pop() || 'jpg';
                const fileName = `0001_${String(imgIndex + 1).padStart(2, '0')}.${fileExtension}`;
                
                crisisImagesFolder.file(fileName, blob);
                return { success: true, fileName, imageId };
              } catch (error) {
                console.error(`Failed to process image ${imageId}:`, error);
                return { success: false, fileName: '', imageId };
              }
            });

            const imageResults = await Promise.all(imagePromises);
            const successfulImages = imageResults.filter(result => result.success);
            
            if (successfulImages.length === 0) {
              throw new Error('No images could be processed');
            }
            
            if (mode === 'fine-tuning') {
              const trainData: any[] = [];
              const testData: any[] = [];
              const valData: any[] = [];

              const imageFiles = successfulImages.map(result => `images/${result.fileName}`);
              const random = Math.random();
              
              const entry = {
                image: imageFiles.length === 1 ? imageFiles[0] : imageFiles,
                caption: map.edited || map.generated || '',
                metadata: {
                  image_id: imageIds,
                  title: map.title,
                  source: map.source,
                  event_type: map.event_type,
                  image_type: map.image_type,
                  countries: map.countries,
                  starred: map.starred,
                  image_count: map.image_count || 1
                }
              };

              if (random < trainSplit / 100) {
                trainData.push(entry);
              } else if (random < (trainSplit + testSplit) / 100) {
                testData.push(entry);
              } else {
                valData.push(entry);
              }

              if (crisisFolder) {
                crisisFolder.file('train.jsonl', JSON.stringify(trainData, null, 2));
                crisisFolder.file('test.jsonl', JSON.stringify(testData, null, 2));
                crisisFolder.file('val.jsonl', JSON.stringify(valData, null, 2));
              }
            } else {
              const imageFiles = successfulImages.map(result => `images/${result.fileName}`);
              const jsonData = {
                image: imageFiles.length === 1 ? imageFiles[0] : imageFiles,
                caption: map.edited || map.generated || '',
                metadata: {
                  image_id: imageIds,
                  title: map.title,
                  source: map.source,
                  event_type: map.event_type,
                  image_type: map.image_type,
                  countries: map.countries,
                  starred: map.starred,
                  image_count: map.image_count || 1
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
            const response = await fetch(`/api/images/${map.image_id}/file`);
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
                  image_id: map.image_count && map.image_count > 1 
                    ? map.all_image_ids || [map.image_id]
                    : map.image_id,
                  title: map.title,
                  source: map.source,
                  event_type: map.event_type,
                  image_type: map.image_type,
                  countries: map.countries,
                  starred: map.starred,
                  image_count: map.image_count || 1
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
            const response = await fetch(`/api/images/${map.image_id}/file`);
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
                  image_id: map.image_count && map.image_count > 1 
                    ? map.all_image_ids || [map.image_id]
                    : map.image_id,
                  title: map.title,
                  source: map.source,
                  event_type: map.event_type,
                  image_type: map.image_type,
                  countries: map.countries,
                  starred: map.starred,
                  image_count: map.image_count || 1
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
      
      setExportSuccess(true);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export dataset. Please try again.');
    } finally {
      setIsExporting(false);
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

        {/* Filter Bar */}
        <FilterBar
          sources={sources}
          types={types}
          regions={regions}
          countries={countries}
          imageTypes={imageTypes}
          isLoadingFilters={false}
        />

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
                      {(map?.image_count && map.image_count > 1) || allImages.length > 1 ? (
                        // Multi-upload carousel
                        <div className={styles.carouselContainer}>
                          <div className={styles.carouselImageWrapper}>
                            {isLoadingImages ? (
                              <div className={styles.imagePlaceholder}>
                                <Spinner className="text-ifrcRed" />
                                <div>Loading images...</div>
                              </div>
                            ) : allImages[currentImageIndex]?.detail_url ? (
                              <img
                                src={allImages[currentImageIndex].detail_url}
                                alt={allImages[currentImageIndex].file_key}
                                className={styles.carouselImage}
                                onError={(e) => {
                                  console.log('MapDetailsPage: Detail image failed to load, falling back to original:', allImages[currentImageIndex].detail_url);
                                  // Fallback to original image
                                  const target = e.target as HTMLImageElement;
                                  if (allImages[currentImageIndex].image_url) {
                                    target.src = allImages[currentImageIndex].image_url;
                                  }
                                }}
                                onLoad={() => console.log('MapDetailsPage: Detail image loaded successfully:', allImages[currentImageIndex].detail_url)}
                              />
                            ) : allImages[currentImageIndex]?.image_url ? (
                              <img
                                src={allImages[currentImageIndex].image_url}
                                alt={allImages[currentImageIndex].file_key}
                                className={styles.carouselImage}
                                onLoad={() => console.log('MapDetailsPage: Original image loaded successfully:', allImages[currentImageIndex].image_url)}
                              />
                            ) : (
                              <div className={styles.imagePlaceholder}>
                                No image available
                              </div>
                            )}
                          </div>
                          
                          {/* Carousel Navigation */}
                          <div className={styles.carouselNavigation}>
                            <Button
                              name="previous-image"
                              variant="tertiary"
                              size={1}
                              onClick={goToPrevious}
                              disabled={isLoadingImages}
                              className={styles.carouselButton}
                            >
                              <ChevronLeftLineIcon className="w-4 h-4" />
                            </Button>
                            
                            <div className={styles.carouselIndicators}>
                              {allImages.map((_, index) => (
                                <button
                                  key={index}
                                  onClick={() => goToImage(index)}
                                  className={`${styles.carouselIndicator} ${
                                    index === currentImageIndex ? styles.carouselIndicatorActive : ''
                                  }`}
                                  disabled={isLoadingImages}
                                >
                                  {index + 1}
                                </button>
                              ))}
                            </div>
                            
                            <Button
                              name="next-image"
                              variant="tertiary"
                              size={1}
                              onClick={goToNext}
                              disabled={isLoadingImages}
                              className={styles.carouselButton}
                            >
                              <ChevronRightLineIcon className="w-4 h-4" />
                            </Button>
                          </div>
                          

                          
                          {/* View Image Button for Carousel */}
                          <div className={styles.viewImageButtonContainer}>
                            <Button
                              name="view-full-size-carousel"
                              variant="secondary"
                              size={1}
                              onClick={() => handleViewFullSize(allImages[currentImageIndex])}
                              disabled={isLoadingImages || !allImages[currentImageIndex]?.image_url}
                            >
                              View Image
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Single image display
                        <div className={styles.singleImageContainer}>
                          {/* Map Details Page: Prioritize detail versions for better quality */}
                          {filteredMap.detail_url ? (
                            <img
                              src={filteredMap.detail_url}
                              alt={filteredMap.file_key}
                              onError={(e) => {
                                console.log('MapDetailsPage: Detail image failed to load, falling back to original:', filteredMap.detail_url);
                                // Fallback to original image
                                const target = e.target as HTMLImageElement;
                                if (filteredMap.image_url) {
                                  target.src = filteredMap.image_url;
                                }
                              }}
                              onLoad={() => console.log('MapDetailsPage: Detail image loaded successfully:', filteredMap.detail_url)}
                            />
                          ) : filteredMap.image_url ? (
                            <img
                              src={filteredMap.image_url}
                              alt={filteredMap.file_key}
                              onLoad={() => console.log('MapDetailsPage: Original image loaded successfully:', filteredMap.image_url)}
                            />
                          ) : (
                            <div className={styles.imagePlaceholder}>
                              No image available
                            </div>
                          )}
                          
                          {/* View Image Button for Single Image */}
                          <div className={styles.viewImageButtonContainer}>
                            <Button
                              name="view-full-size-single"
                              variant="secondary"
                              size={1}
                              onClick={() => handleViewFullSize(filteredMap)}
                              disabled={!filteredMap.image_url}
                            >
                              View Image
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Tags Section - Inside Image Container */}
                    <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2">
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
                        {filteredMap.image_count && filteredMap.image_count > 1 && (
                          <span className={styles.metadataTag} title={`Multi-upload with ${filteredMap.image_count} images`}>
                            📷 {filteredMap.image_count}
                          </span>
                        )}
                        {(!filteredMap.image_count || filteredMap.image_count <= 1) && (
                          <span className={styles.metadataTag} title="Single Upload">
                            Single
                          </span>
                        )}
                      </div>
                    </Container>
                  </Container>

                  {/* Details Section */}
                  <div className={styles.detailsSection}>

                    {/* Combined Analysis Structure */}
                    {(filteredMap.edited && filteredMap.edited.includes('Description:')) || 
                     (filteredMap.generated && filteredMap.generated.includes('Description:')) ? (
                            <Container
                        heading="AI Generated Content"
                              headingLevel={3}
                              withHeaderBorder
                              withInternalPadding
                              spacing="comfortable"
                            >
                              <div className={styles.captionContainer}>
                                    <div className={styles.captionText}>
                            {(filteredMap.edited || filteredMap.generated || '').split('\n').map((line, index) => (
                              <div key={index}>
                                {line.startsWith('Description:') || line.startsWith('Analysis:') || line.startsWith('Recommended Actions:') ? (
                                  <h4 className="font-semibold text-gray-800 mt-4 mb-2">{line}</h4>
                                ) : line.trim() === '' ? (
                                  <br />
                                ) : (
                                  <p className="mb-2">{line}</p>
                                )}
                              </div>
                            ))}
                                    </div>
                              </div>
                            </Container>
                        ) : (
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
                        )}
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
                        >
                          Contribute
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
        <ExportModal
          isOpen={showExportModal}
          onClose={() => {
            setShowExportModal(false);
            setExportSuccess(false);
            setIsExporting(false);
          }}
          onExport={(mode, selectedTypes) => {
            if (selectedTypes.includes(map.image_type)) {
              exportDataset(mode);
            }
          }}
          filteredCount={1}
          totalCount={1}
          hasFilters={false}
          crisisMapsCount={map.image_type === 'crisis_map' ? 1 : 0}
          droneImagesCount={map.image_type === 'drone_image' ? 1 : 0}
          isLoading={isExporting}
          exportSuccess={exportSuccess}
          variant="single"
          onNavigateToList={() => {
            setShowExportModal(false);
            navigate('/explore');
          }}
          onNavigateAndExport={() => {
            setShowExportModal(false);
            navigate('/explore?export=true');
          }}
        />
      )}

      {/* Full Size Image Modal */}
      <FullSizeImageModal
        isOpen={showFullSizeModal}
        imageUrl={selectedImageForModal?.image_url || null}
        preview={null}
        selectedImageData={null}
        onClose={handleCloseFullSizeModal}
        isLoading={isLoadingFullSizeImage}
      />
    </PageContainer>
  );
} 