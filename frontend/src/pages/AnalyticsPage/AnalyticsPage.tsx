import {
  PageContainer, Button,
  Container, Spinner, SegmentInput,
  Table, PieChart, ProgressBar,
} from '@ifrc-go/ui';
import {
  createStringColumn,
  createNumberColumn,
  numericIdSelector
} from '@ifrc-go/ui/utils';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import styles from './AnalyticsPage.module.css';

interface AnalyticsData {
  totalCaptions: number;
  sources: { [key: string]: number };
  types: { [key: string]: number };
  regions: { [key: string]: number };
  models: {
    [key: string]: {
      count: number;
      avgAccuracy: number;
      avgContext: number;
      avgUsability: number;
      totalScore: number;
      deleteCount: number;
    };
  };
  modelEditTimes: { [key: string]: number[] };
  percentageModified: number;
  modelPercentageData: { [key: string]: number[] };
  totalDeleteCount: number;
  deleteRate: number;
  // Add separated image data for proper filtering
  crisisMaps: MapData[];
  droneImages: MapData[];
}

interface LookupData {
  s_code?: string;
  t_code?: string;
  r_code?: string;
  label: string;
}

interface RegionData {
  id: number;
  name: string;
  count: number;
  percentage: number;
}

interface TypeData {
  id: number;
  name: string;
  count: number;
  percentage: number;
}

interface SourceData {
  id: number;
  name: string;
  count: number;
  percentage: number;
}

interface ModelData {
  id: number;
  name: string;
  count: number;
  accuracy: number;
  context: number;
  usability: number;
  totalScore: number;
}

interface EditTimeData {
  id: number;
  name: string;
  count: number;
  avgEditTime: number;
  minEditTime: number;
  maxEditTime: number;
}

interface PercentageModifiedData {
  id: number;
  name: string;
  count: number;
  avgPercentageModified: number;
  minPercentageModified: number;
  maxPercentageModified: number;
}

interface DeleteRateData {
  id: number;
  name: string;
  count: number;
  deleteCount: number;
  deleteRate: number;
}

interface MapData {
  source?: string;
  event_type?: string;
  countries?: Array<{ r_code?: string }>;
  model?: string;
  accuracy?: number;
  context?: number;
  usability?: number;
  created_at?: string;
  updated_at?: string;
  generated?: string;
  edited?: string;
  image_type?: string;
}

export default function AnalyticsPage() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'crisis_maps' | 'drone_images'>('crisis_maps');
  const [sourcesLookup, setSourcesLookup] = useState<LookupData[]>([]);
  const [typesLookup, setTypesLookup] = useState<LookupData[]>([]);
  const [regionsLookup, setRegionsLookup] = useState<LookupData[]>([]);
  const [modelsLookup, setModelsLookup] = useState<{ m_code: string; label: string }[]>([]);
  const [showEditTimeModal, setShowEditTimeModal] = useState(false);
  const [showPercentageModal, setShowPercentageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Function to handle opening a specific modal and closing others
  const openModal = (modalType: 'editTime' | 'percentage' | 'delete' | 'none') => {
    setShowEditTimeModal(modalType === 'editTime');
    setShowPercentageModal(modalType === 'percentage');
    setShowDeleteModal(modalType === 'delete');
  };

  const viewOptions = [
    { key: 'crisis_maps' as const, label: 'Crisis Maps' },
    { key: 'drone_images' as const, label: 'Drone Images' }
  ];

  // Helper function to calculate word similarity
  const calculateWordSimilarity = useCallback((text1: string, text2: string): number => {
    if (!text1 || !text2) return 0;
    
    // Split into words, lowercase, and remove punctuation
    const words1 = text1.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(word => word.length > 0);
    const words2 = text2.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(word => word.length > 0);
    
    if (words1.length === 0 && words2.length === 0) return 1; // Both empty = 100% similar
    if (words1.length === 0 || words2.length === 0) return 0; // One empty = 0% similar
    
    // Create sets of unique words
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    // Calculate intersection and union
    const intersection = new Set([...set1].filter(word => set2.has(word)));
    const union = new Set([...set1, ...set2]);
    
    // Calculate similarity
    const similarity = intersection.size / union.size;
    return similarity;
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/images');
      const maps = await res.json();

      // Calculate edit times for each model
      const modelEditTimes: { [key: string]: number[] } = {};

      // Separate images by type for proper filtering
      const crisisMaps = maps.filter((map: MapData) => map.image_type === 'crisis_map');
      const droneImages = maps.filter((map: MapData) => map.image_type === 'drone_image');

      const analytics: AnalyticsData = {
        totalCaptions: maps.length,
        sources: {},
        types: {},
        regions: {},
        models: {},
        modelEditTimes: modelEditTimes,
        percentageModified: 0,
        modelPercentageData: {},
        totalDeleteCount: 0,
        deleteRate: 0,
        crisisMaps: crisisMaps,
        droneImages: droneImages,
      };

      // Process all images for global analytics
      maps.forEach((map: MapData) => {
        if (map.source) analytics.sources[map.source] = (analytics.sources[map.source] || 0) + 1;
        if (map.event_type) analytics.types[map.event_type] = (analytics.types[map.event_type] || 0) + 1;
        if (map.countries) {
          map.countries.forEach((c) => {
            if (c.r_code) analytics.regions[c.r_code] = (analytics.regions[c.r_code] || 0) + 1;
          });
        }
        if (map.model) {
          const m = map.model;
          const ctr = analytics.models[m] ||= { count: 0, avgAccuracy: 0, avgContext: 0, avgUsability: 0, totalScore: 0, deleteCount: 0 };
          ctr.count++;
          if (map.accuracy != null) ctr.avgAccuracy += map.accuracy;
          if (map.context != null) ctr.avgContext += map.context;
          if (map.usability != null) ctr.avgUsability += map.usability;
          
          // Calculate edit time if both timestamps exist
          if (map.created_at && map.updated_at) {
            const created = new Date(map.created_at).getTime();
            const updated = new Date(map.updated_at).getTime();
            const editTimeMs = updated - created;
            if (editTimeMs > 0) {
              if (!modelEditTimes[m]) modelEditTimes[m] = [];
              modelEditTimes[m].push(editTimeMs);
            }
          }
        }
      });

      sourcesLookup.forEach(source => {
        if (source.s_code && !analytics.sources[source.s_code]) {
          analytics.sources[source.s_code] = 0;
        }
      });

      typesLookup.forEach(type => {
        if (type.t_code && !analytics.types[type.t_code]) {
          analytics.types[type.t_code] = 0;
        }
      });

      regionsLookup.forEach(region => {
        if (region.r_code && !analytics.regions[region.r_code]) {
          analytics.regions[region.r_code] = 0;
        }
      });

      const allModels = ['GPT-4', 'Claude', 'Gemini', 'Llama', 'Other'];
      allModels.forEach(model => {
        if (!analytics.models[model]) {
          analytics.models[model] = { count: 0, avgAccuracy: 0, avgContext: 0, avgUsability: 0, totalScore: 0, deleteCount: 0 };
        }
      });

      Object.values(analytics.models).forEach(m => {
        if (m.count > 0) {
          m.avgAccuracy = Math.round(m.avgAccuracy / m.count);
          m.avgContext = Math.round(m.avgContext / m.count);
          m.avgUsability = Math.round(m.avgUsability / m.count);
          m.totalScore = Math.round((m.avgAccuracy + m.avgContext + m.avgUsability) / 3);
        }
      });

             // Calculate percentage modified (median)
       const textPairs = maps.filter((map: MapData) => map.generated && map.edited);
       
       if (textPairs.length > 0) {
         const similarities = textPairs.map((map: MapData) => 
           calculateWordSimilarity(map.generated!, map.edited!)
         );
         const sortedSimilarities = [...similarities].sort((a, b) => a - b);
         const mid = Math.floor(sortedSimilarities.length / 2);
         const medianSimilarity = sortedSimilarities.length % 2 === 0 
           ? (sortedSimilarities[mid - 1] + sortedSimilarities[mid]) / 2
           : sortedSimilarities[mid];
         analytics.percentageModified = Math.round((1 - medianSimilarity) * 100);
       }

             // Calculate percentage modified per model (median)
       const modelPercentageData: { [key: string]: number[] } = {};
       
       maps.forEach((map: MapData) => {
         if (map.model && map.generated && map.edited) {
           const similarity = calculateWordSimilarity(map.generated, map.edited);
           const percentageModified = Math.round((1 - similarity) * 100);
           
           if (!modelPercentageData[map.model]) {
             modelPercentageData[map.model] = [];
           }
           modelPercentageData[map.model].push(percentageModified);
         }
       });
       
       analytics.modelPercentageData = modelPercentageData;

      // Fetch model data including delete counts
      try {
        const modelsRes = await fetch('/api/models');
        if (modelsRes.ok) {
          const modelsData = await modelsRes.json();
          
          // Update delete counts for each model
          if (modelsData.models) {
            modelsData.models.forEach((model: { m_code: string; delete_count: number }) => {
              if (analytics.models[model.m_code]) {
                analytics.models[model.m_code].deleteCount = model.delete_count || 0;
              }
            });
            
            // Calculate total delete count and delete rate
            const totalDeleteCount = modelsData.models.reduce((sum: number, model: { delete_count: number }) => sum + (model.delete_count || 0), 0);
            analytics.totalDeleteCount = totalDeleteCount;
            analytics.deleteRate = totalDeleteCount > 0 ? Math.round((totalDeleteCount / (totalDeleteCount + maps.length)) * 100) : 0;
          }
        }
      } catch (error) {
        console.log('Could not fetch model delete counts:', error);
      }

      setData(analytics);
    } catch {
      
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [sourcesLookup, typesLookup, regionsLookup, calculateWordSimilarity]);

  const fetchLookupData = useCallback(async () => {
    try {
      const [sourcesRes, typesRes, regionsRes, modelsRes] = await Promise.all([
        fetch('/api/sources'),
        fetch('/api/types'),
        fetch('/api/regions'),
        fetch('/api/models')
      ]);
      const sources = await sourcesRes.json();
      const types = await typesRes.json();
      const regions = await regionsRes.json();
      const models = await modelsRes.json();
      setSourcesLookup(sources);
      setTypesLookup(types);
      setRegionsLookup(regions);
      setModelsLookup(models.models || []);
    } catch (error) {
      console.log('Could not fetch lookup data:', error);
    }
  }, []);

  // Set initial view based on URL parameter
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'crisis_maps' || viewParam === 'drone_images') {
      setView(viewParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchLookupData();
  }, []);

  useEffect(() => {
    if (sourcesLookup.length > 0 && typesLookup.length > 0 && regionsLookup.length > 0 && modelsLookup.length > 0) {
      fetchAnalytics();
    }
  }, [sourcesLookup, typesLookup, regionsLookup, modelsLookup, fetchAnalytics]);

  const getSourceLabel = useCallback((code: string) => {
    const source = sourcesLookup.find(s => s.s_code === code);
    return source ? source.label : code;
  }, [sourcesLookup]);

  const getMedianEditTime = useCallback((editTimes: number[]) => {
    if (editTimes.length === 0) return 0;
    const sortedTimes = [...editTimes].sort((a, b) => a - b);
    const mid = Math.floor(sortedTimes.length / 2);
    return sortedTimes.length % 2 === 0 
      ? Math.round((sortedTimes[mid - 1] + sortedTimes[mid]) / 2)
      : sortedTimes[mid];
  }, []);

  const formatEditTime = useCallback((ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  const getTypeLabel = useCallback((code: string) => {
    const type = typesLookup.find(t => t.t_code === code);
    return type ? type.label : code;
  }, [typesLookup]);

  const getModelLabel = useCallback((code: string) => {
    const model = modelsLookup.find(m => m.m_code === code);
    return model ? model.label : code;
  }, [modelsLookup]);

  const editTimeTableData = useMemo(() => {
    if (!data) return [];
    
    return Object.entries(data.modelEditTimes || {})
      .filter(([, editTimes]) => editTimes.length > 0)
      .sort(([, a], [, b]) => getMedianEditTime(b) - getMedianEditTime(a))
      .map(([modelCode, editTimes], index) => ({
        id: index + 1,
        name: getModelLabel(modelCode),
        count: editTimes.length,
        avgEditTime: getMedianEditTime(editTimes),
        minEditTime: Math.min(...editTimes),
        maxEditTime: Math.max(...editTimes)
      }));
  }, [data, getMedianEditTime, getModelLabel]);

  const percentageModifiedTableData = useMemo(() => {
    if (!data) return [];
    
    return Object.entries(data.modelPercentageData || {})
      .filter(([, percentages]) => percentages.length > 0)
      .sort(([, a], [, b]) => {
        const sortedA = [...a].sort((x, y) => x - y);
        const sortedB = [...b].sort((x, y) => x - y);
        const midA = Math.floor(sortedA.length / 2);
        const midB = Math.floor(sortedB.length / 2);
        const medianA = sortedA.length % 2 === 0 
          ? (sortedA[midA - 1] + sortedA[midA]) / 2
          : sortedA[midA];
        const medianB = sortedB.length % 2 === 0 
          ? (sortedB[midB - 1] + sortedB[midB]) / 2
          : sortedB[midB];
        return medianB - medianA;
      })
      .map(([modelCode, percentages], index) => {
        const sortedPercentages = [...percentages].sort((a, b) => a - b);
        const mid = Math.floor(sortedPercentages.length / 2);
        const medianPercentage = sortedPercentages.length % 2 === 0 
          ? Math.round((sortedPercentages[mid - 1] + sortedPercentages[mid]) / 2)
          : sortedPercentages[mid];
        
        return {
          id: index + 1,
          name: getModelLabel(modelCode),
          count: percentages.length,
          avgPercentageModified: medianPercentage,
          minPercentageModified: Math.min(...percentages),
          maxPercentageModified: Math.max(...percentages)
        };
      });
  }, [data, getModelLabel]);



  const modelConsistencyData = useMemo(() => {
    if (!data) return [];
    
    return Object.entries(data.models)
      .filter(([, model]) => model.count > 0)
      .map(([modelCode, model], index) => {
        // Calculate consistency based on how close accuracy, context, and usability are
        const scores = [model.avgAccuracy, model.avgContext, model.avgUsability];
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        const consistency = Math.round(100 - Math.sqrt(variance)); // Lower variance = higher consistency
        
        return {
          id: index + 1,
          name: getModelLabel(modelCode),
          consistency: Math.max(0, consistency),
          avgScore: Math.round(mean),
          count: model.count
        };
      })
      .sort((a, b) => b.consistency - a.consistency);
  }, [data, getModelLabel]);

  const regionsColumns = useMemo(() => [
    createStringColumn<RegionData, number>(
      'name',
      'Region',
      (item) => item.name,
    ),
    createNumberColumn<RegionData, number>(
      'count',
      'Count',
      (item) => item.count,
    ),
    createNumberColumn<RegionData, number>(
      'percentage',
      '% of Total',
      (item) => item.percentage,
      {
        suffix: '%',
        maximumFractionDigits: 0,
      },
    ),
  ], []);

  const typesColumns = useMemo(() => [
    createStringColumn<TypeData, number>(
      'name',
      'Type',
      (item) => item.name,
    ),
    createNumberColumn<TypeData, number>(
      'count',
      'Count',
      (item) => item.count,
    ),
    createNumberColumn<TypeData, number>(
      'percentage',
      '% of Total',
      (item) => item.percentage,
      {
        suffix: '%',
        maximumFractionDigits: 0,
      },
    ),
  ], []);

  const sourcesColumns = useMemo(() => [
    createStringColumn<SourceData, number>(
      'name',
      'Source',
      (item) => item.name,
    ),
    createNumberColumn<SourceData, number>(
      'count',
      'Count',
      (item) => item.count,
    ),
    createNumberColumn<SourceData, number>(
      'percentage',
      '% of Total',
      (item) => item.percentage,
      {
        suffix: '%',
        maximumFractionDigits: 0,
      },
    ),
  ], []);

  const modelsColumns = useMemo(() => [
    createStringColumn<ModelData, number>(
      'name',
      'Model',
      (item) => item.name,
    ),
    createNumberColumn<ModelData, number>(
      'count',
      'Count',
      (item) => item.count,
    ),
    createNumberColumn<ModelData, number>(
      'accuracy',
      'Accuracy',
      (item) => item.accuracy,
      {
        suffix: '%',
        maximumFractionDigits: 0,
      },
    ),
    createNumberColumn<ModelData, number>(
      'context',
      'Context',
      (item) => item.context,
      {
        suffix: '%',
        maximumFractionDigits: 0,
      },
    ),
    createNumberColumn<ModelData, number>(
      'usability',
      'Usability',
      (item) => item.usability,
      {
        suffix: '%',
        maximumFractionDigits: 0,
      },
    ),
    createNumberColumn<ModelData, number>(
      'totalScore',
      'Total Score',
      (item) => item.totalScore,
      {
        suffix: '%',
        maximumFractionDigits: 0,
      },
    ),
    
  ], [formatEditTime]);

  const editTimeColumns = useMemo(() => [
    createStringColumn<EditTimeData, number>(
      'name',
      'Model',
      (item) => item.name,
    ),
    createNumberColumn<EditTimeData, number>(
      'count',
      'Count',
      (item) => item.count,
    ),
         createStringColumn<EditTimeData, number>(
       'avgEditTime',
       'Median Edit Time',
       (item) => formatEditTime(item.avgEditTime),
     ),
    createStringColumn<EditTimeData, number>(
      'minEditTime',
      'Min Edit Time',
      (item) => formatEditTime(item.minEditTime),
    ),
    createStringColumn<EditTimeData, number>(
      'maxEditTime',
      'Max Edit Time',
      (item) => formatEditTime(item.maxEditTime),
    ),
  ], [formatEditTime]);

    const percentageModifiedColumns = useMemo(() => [
    createStringColumn<PercentageModifiedData, number>(
      'name',
      'Model',
      (item) => item.name,
    ),
    createNumberColumn<PercentageModifiedData, number>(
      'count',
      'Count',
      (item) => item.count,
    ),
          createNumberColumn<PercentageModifiedData, number>(
        'avgPercentageModified',
        'Median % Modified',
        (item) => item.avgPercentageModified,
        {
          suffix: '%',
          maximumFractionDigits: 0,
        },
      ),
    createNumberColumn<PercentageModifiedData, number>(
      'minPercentageModified',
      'Min % Modified',
      (item) => item.minPercentageModified,
      {
        suffix: '%',
        maximumFractionDigits: 0,
      },
    ),
    createNumberColumn<PercentageModifiedData, number>(
      'maxPercentageModified',
      'Max % Modified',
      (item) => item.maxPercentageModified,
      {
        suffix: '%',
        maximumFractionDigits: 0,
      },
    ),
  ], []);

  const deleteRateColumns = useMemo(() => [
    createStringColumn<DeleteRateData, number>(
      'name',
      'Model',
      (item) => item.name,
    ),
    createNumberColumn<DeleteRateData, number>(
      'count',
      'Total Count',
      (item) => item.count,
    ),
    createNumberColumn<DeleteRateData, number>(
      'deleteCount',
      'Delete Count',
      (item) => item.deleteCount,
    ),
    createNumberColumn<DeleteRateData, number>(
      'deleteRate',
      'Delete Rate',
      (item) => item.deleteRate,
      {
        suffix: '%',
        maximumFractionDigits: 1,
      },
    ),
  ], []);

  const qualityBySourceColumns = useMemo(() => [
    createStringColumn<{ source: string; avgQuality: number; count: number }, number>(
      'source',
      'Source',
      (item) => item.source,
    ),
    createNumberColumn<{ source: string; avgQuality: number; count: number }, number>(
      'avgQuality',
      'Average Quality',
      (item) => item.avgQuality,
      {
        suffix: '%',
        maximumFractionDigits: 0,
      },
    ),
    createNumberColumn<{ source: string; avgQuality: number; count: number }, number>(
      'count',
      'Count',
      (item) => item.count,
    ),
  ], []);

  const qualityByEventTypeColumns = useMemo(() => [
    createStringColumn<{ eventType: string; avgQuality: number; count: number }, number>(
      'eventType',
      'Event Type',
      (item) => item.eventType,
    ),
    createNumberColumn<{ eventType: string; avgQuality: number; count: number }, number>(
      'avgQuality',
      'Average Quality',
      (item) => item.avgQuality,
      {
        suffix: '%',
        maximumFractionDigits: 0,
      },
    ),
    createNumberColumn<{ eventType: string; avgQuality: number; count: number }, number>(
      'count',
      'Count',
      (item) => item.count,
    ),
  ], []);

  const modelConsistencyColumns = useMemo(() => [
    createStringColumn<{ name: string; consistency: number; avgScore: number; count: number }, number>(
      'name',
      'Model',
      (item) => item.name,
    ),
    createNumberColumn<{ name: string; consistency: number; avgScore: number; count: number }, number>(
      'consistency',
      'Consistency',
      (item) => item.consistency,
      {
        suffix: '%',
        maximumFractionDigits: 0,
      },
    ),
    createNumberColumn<{ name: string; consistency: number; avgScore: number; count: number }, number>(
      'avgScore',
      'Average Score',
      (item) => item.avgScore,
      {
        suffix: '%',
        maximumFractionDigits: 0,
      },
    ),
    createNumberColumn<{ name: string; consistency: number; avgScore: number; count: number }, number>(
      'count',
      'Count',
      (item) => item.count,
    ),
  ], []);

  // Helper functions to filter data by image type
  const getImageTypeCount = useCallback((imageType: string) => {
    if (!data) return 0;
    
    if (imageType === 'crisis_map') {
      return data.crisisMaps.length;
    } else if (imageType === 'drone_image') {
      return data.droneImages.length;
    }
    
    return 0;
  }, [data]);

  const getImageTypeRegionsChartData = useCallback((imageType: string) => {
    if (!data) return [];
    
    // Get the appropriate image set based on type
    const images = imageType === 'crisis_map' ? data.crisisMaps : data.droneImages;
    
    // Calculate regions for this specific image type
    const regions: { [key: string]: number } = {};
    images.forEach((map: MapData) => {
      if (map.countries) {
        map.countries.forEach((c) => {
          if (c.r_code) regions[c.r_code] = (regions[c.r_code] || 0) + 1;
        });
      }
    });
    
    return Object.entries(regions)
      .filter(([, value]) => value > 0)
      .map(([code, value]) => ({ 
        name: regionsLookup.find(r => r.r_code === code)?.label || code, 
        value 
      }));
  }, [data, regionsLookup]);

  const getImageTypeRegionsTableData = useCallback((imageType: string) => {
    if (!data) return [];
    
    // Get the appropriate image set based on type
    const images = imageType === 'crisis_map' ? data.crisisMaps : data.droneImages;
    
    // Calculate regions for this specific image type
    const regions: { [key: string]: number } = {};
    images.forEach((map: MapData) => {
      if (map.countries) {
        map.countries.forEach((c) => {
          if (c.r_code) regions[c.r_code] = (regions[c.r_code] || 0) + 1;
        });
      }
    });
    
    // Convert to table data format
    const allRegions = regionsLookup.reduce((acc, region) => {
      if (region.r_code) {
        acc[region.r_code] = {
          name: region.label,
          count: regions[region.r_code] || 0
        };
      }
      return acc;
    }, {} as Record<string, { name: string; count: number }>);

    return Object.entries(allRegions)
      .sort(([,a], [,b]) => b.count - a.count)
      .map(([, { name, count }], index) => ({
        id: index + 1,
        name,
        count,
        percentage: images.length > 0 ? Math.round((count / images.length) * 100) : 0
      }));
  }, [data, regionsLookup]);

  const getImageTypeSourcesChartData = useCallback((imageType: string) => {
    if (!data) return [];
    
    // Get the appropriate image set based on type
    const images = imageType === 'crisis_map' ? data.crisisMaps : data.droneImages;
    
    // Calculate sources for this specific image type
    const sources: { [key: string]: number } = {};
    images.forEach((map: MapData) => {
      if (map.source) sources[map.source] = (sources[map.source] || 0) + 1;
    });
    
    return Object.entries(sources)
      .filter(([, value]) => value > 0)
      .map(([code, value]) => ({ 
        name: sourcesLookup.find(s => s.s_code === code)?.label || code, 
        value 
      }));
  }, [data, sourcesLookup]);

  const getImageTypeSourcesTableData = useCallback((imageType: string) => {
    if (!data) return [];
    
    // Get the appropriate image set based on type
    const images = imageType === 'crisis_map' ? data.crisisMaps : data.droneImages;
    
    // Calculate sources for this specific image type
    const sources: { [key: string]: number } = {};
    images.forEach((map: MapData) => {
      if (map.source) sources[map.source] = (sources[map.source] || 0) + 1;
    });
    
    // Convert to table data format
    return Object.entries(sources)
      .sort(([,a], [,b]) => b - a)
      .map(([sourceKey, count], index) => ({
        id: index + 1,
        name: getSourceLabel(sourceKey),
        count,
        percentage: images.length > 0 ? Math.round((count / images.length) * 100) : 0
      }));
  }, [data, getSourceLabel]);

  const getImageTypeTypesChartData = useCallback((imageType: string) => {
    if (!data) return [];
    
    // Get the appropriate image set based on type
    const images = imageType === 'crisis_map' ? data.crisisMaps : data.droneImages;
    
    // Calculate types for this specific image type
    const types: { [key: string]: number } = {};
    images.forEach((map: MapData) => {
      if (map.event_type) types[map.event_type] = (types[map.event_type] || 0) + 1;
    });
    
    return Object.entries(types)
      .filter(([, value]) => value > 0)
      .map(([code, value]) => ({ 
        name: typesLookup.find(t => t.t_code === code)?.label || code, 
        value 
      }));
  }, [data, typesLookup]);

  const getImageTypeTypesTableData = useCallback((imageType: string) => {
    if (!data) return [];
    
    // Get the appropriate image set based on type
    const images = imageType === 'crisis_map' ? data.crisisMaps : data.droneImages;
    
    // Calculate types for this specific image type
    const types: { [key: string]: number } = {};
    images.forEach((map: MapData) => {
      if (map.event_type) types[map.event_type] = (types[map.event_type] || 0) + 1;
    });
    
    // Convert to table data format
    return Object.entries(types)
      .sort(([,a], [,b]) => b - a)
      .map(([typeKey, count], index) => ({
        id: index + 1,
        name: getTypeLabel(typeKey),
        count,
        percentage: images.length > 0 ? Math.round((count / images.length) * 100) : 0
      }));
  }, [data, getTypeLabel]);

  const getImageTypeMedianEditTime = useCallback((imageType: string) => {
    if (!data) return 'No data available';
    
    // Get the appropriate image set based on type
    const images = imageType === 'crisis_map' ? data.crisisMaps : data.droneImages;
    
    // Get the models actually used by images of this type
    const usedModels = new Set<string>();
    images.forEach((map: MapData) => {
      if (map.model) {
        usedModels.add(map.model);
      }
    });
    
    // Debug logging
    console.log(`Debug ${imageType}:`, {
      totalImages: images.length,
      usedModels: Array.from(usedModels),
      availableEditTimes: Object.keys(data.modelEditTimes),
      modelEditTimesData: data.modelEditTimes
    });
    
    // Filter edit times by models actually used by this image type
    const filteredEditTimes = Object.entries(data.modelEditTimes).filter(([modelName]) => {
      return usedModels.has(modelName);
    });
    
    const editTimes = filteredEditTimes.flatMap(([, times]) => times);
    if (editTimes.length === 0) return 'No data available';
    return formatEditTime(getMedianEditTime(editTimes));
  }, [data, formatEditTime, getMedianEditTime]);

  const getImageTypePercentageModified = useCallback(() => {
    if (!data) return 'No data available';
    const total = data.totalCaptions || 0;
    const modified = data.percentageModified || 0;
    
    return total > 0 ? Math.round((modified / total) * 100) : 0;
  }, [data]);

  const getImageTypeDeleteRate = useCallback(() => {
    if (!data) return 'No data available';
    // For now, we'll return the global delete rate since we don't have image_type filtering in the backend
    // In a real implementation, you'd calculate this based on filtered data
    return data.deleteRate >= 0 ? `${data.deleteRate}%` : 'No data available';
  }, [data]);

  const getImageTypeEditTimeTableData = useCallback((imageType: string) => {
    if (!data) return [];
    
    // Get the appropriate image set based on type
    const images = imageType === 'crisis_map' ? data.crisisMaps : data.droneImages;
    
    // Get the models actually used by images of this type
    const usedModels = new Set<string>();
    images.forEach((map: MapData) => {
      if (map.model) {
        usedModels.add(map.model);
      }
    });
    
    // Filter edit time data by models actually used by this image type
    const filteredData = editTimeTableData.filter(d => {
      // Find the model code that matches this display name
      const modelCode = modelsLookup.find(m => m.label === d.name)?.m_code;
      return modelCode && usedModels.has(modelCode);
    });
    
    return filteredData;
  }, [data, editTimeTableData, modelsLookup]);

  const getImageTypePercentageTableData = useCallback((imageType: string) => {
    if (!data) return [];
    
    // Get the appropriate image set based on type
    const images = imageType === 'crisis_map' ? data.crisisMaps : data.droneImages;
    
    // Get the models actually used by images of this type
    const usedModels = new Set<string>();
    images.forEach((map: MapData) => {
      if (map.model) {
        usedModels.add(map.model);
      }
    });
    
    // Filter percentage data by models actually used by this image type
    const filteredData = percentageModifiedTableData.filter(d => {
      // Find the model code that matches this display name
      const modelCode = modelsLookup.find(m => m.label === d.name)?.m_code;
      return modelCode && usedModels.has(modelCode);
    });
    
    return filteredData;
  }, [data, percentageModifiedTableData, modelsLookup]);

  const getImageTypeDeleteRateTableData = useCallback((imageType: string) => {
    if (!data) return [];
    
    // Get the appropriate image set based on type
    const images = imageType === 'crisis_map' ? data.crisisMaps : data.droneImages;
    
    // Calculate delete rates for this specific image type
    const modelStats: { [key: string]: { count: number; deleteCount: number } } = {};
    
    images.forEach((map: MapData) => {
      if (map.model) {
        if (!modelStats[map.model]) {
          modelStats[map.model] = { count: 0, deleteCount: 0 };
        }
        modelStats[map.model].count++;
        // Note: We don't have individual delete data per image, so we'll use the model-level delete count
        // In a real implementation, you'd track this at the image level
      }
    });
    
    // Convert to table data format and add delete counts from analytics.models
    return Object.entries(modelStats)
      .map(([modelCode, stats], index) => {
        const modelData = data.models?.[modelCode];
        const deleteCount = modelData?.deleteCount || 0;
        const deleteRate = stats.count > 0 ? Math.round((deleteCount / stats.count) * 100 * 10) / 10 : 0;
        
        return {
          id: index + 1,
          name: getModelLabel(modelCode),
          count: stats.count,
          deleteCount: deleteCount,
          deleteRate: deleteRate,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [data]);

     const getImageTypeModelsTableData = useCallback((imageType: string) => {
     if (!data) return [];
     
     // Get the appropriate image set based on type
     const images = imageType === 'crisis_map' ? data.crisisMaps : data.droneImages;
     
     // Calculate models for this specific image type
     const modelStats: { [key: string]: { count: number; totalAccuracy: number; totalContext: number; totalUsability: number } } = {};
     
     images.forEach((map: MapData) => {
       if (map.model) {
         if (!modelStats[map.model]) {
           modelStats[map.model] = { count: 0, totalAccuracy: 0, totalContext: 0, totalUsability: 0 };
         }
         modelStats[map.model].count++;
         if (map.accuracy != null) modelStats[map.model].totalAccuracy += map.accuracy;
         if (map.context != null) modelStats[map.model].totalContext += map.context;
         if (map.usability != null) modelStats[map.model].totalUsability += map.usability;
       }
     });
     
     // Convert to table data format
     return Object.entries(modelStats)
       .map(([modelCode, stats], index) => ({
         id: index + 1,
         name: getModelLabel(modelCode),
         count: stats.count,
         accuracy: stats.count > 0 ? Math.round(stats.totalAccuracy / stats.count) : 0,
         context: stats.count > 0 ? Math.round(stats.totalContext / stats.count) : 0,
         usability: stats.count > 0 ? Math.round(stats.totalUsability / stats.count) : 0,
         totalScore: stats.count > 0 ? Math.round((stats.totalAccuracy + stats.totalContext + stats.totalUsability) / (3 * stats.count)) : 0
       }))
       .sort((a, b) => b.totalScore - a.totalScore);
   }, [data, getModelLabel]);

     const getImageTypeQualityBySourceTableData = useCallback((imageType: string) => {
     if (!data) return [];
     
     // Get the appropriate image set based on type
     const images = imageType === 'crisis_map' ? data.crisisMaps : data.droneImages;
     
     // Calculate quality by source for this specific image type
     const sourceQuality: { [key: string]: { total: number; count: number; totalImages: number } } = {};
     
     images.forEach((map: MapData) => {
       if (map.source) {
         if (!sourceQuality[map.source]) {
           sourceQuality[map.source] = { total: 0, count: 0, totalImages: 0 };
         }
         sourceQuality[map.source].totalImages += 1;
         if (map.accuracy != null) {
           sourceQuality[map.source].total += map.accuracy;
           sourceQuality[map.source].count += 1;
         }
       }
     });
     
     // Convert to table data format
     return Object.entries(sourceQuality).map(([source, stats], index) => ({
       id: index + 1,
       source: getSourceLabel(source),
       avgQuality: stats.count > 0 ? Math.round(stats.total / stats.count) : 0,
       count: stats.totalImages
     }));
   }, [data, getSourceLabel]);

  const getImageTypeQualityByEventTypeTableData = useCallback((imageType: string) => {
    if (!data) return [];

    // Get the appropriate image set based on type
    const images = imageType === 'crisis_map' ? data.crisisMaps : data.droneImages;

    // Calculate quality by event type for this specific image type
    const eventTypeQuality: { [key: string]: { total: number; count: number; totalImages: number } } = {};

    images.forEach((map: MapData) => {
      if (map.event_type) {
        if (!eventTypeQuality[map.event_type]) {
          eventTypeQuality[map.event_type] = { total: 0, count: 0, totalImages: 0 };
        }
        eventTypeQuality[map.event_type].totalImages += 1;
        if (map.accuracy != null) {
          eventTypeQuality[map.event_type].total += map.accuracy;
          eventTypeQuality[map.event_type].count += 1;
        }
      }
    });

    // Convert to table data format
    return Object.entries(eventTypeQuality).map(([eventTypeCode, stats], index) => ({
      id: index + 1,
      eventType: getTypeLabel(eventTypeCode),
      avgQuality: stats.count > 0 ? Math.round(stats.total / stats.count) : 0,
      count: stats.totalImages
    }));
  }, [data, getTypeLabel]);

  const getImageTypeModelConsistencyTableData = useCallback((imageType: string) => {
    if (!data) return [];
    
    // Get the appropriate image set based on type
    const images = imageType === 'crisis_map' ? data.crisisMaps : data.droneImages;
    
    // Get the models actually used by images of this type
    const usedModels = new Set<string>();
    images.forEach((map: MapData) => {
      if (map.model) {
        usedModels.add(map.model);
      }
    });
    
    // Filter model consistency table data by models actually used by this image type
    const filteredData = modelConsistencyData.filter(d => {
      // Find the model code that matches this display name
      const modelCode = modelsLookup.find(m => m.label === d.name)?.m_code;
      return modelCode && usedModels.has(modelCode);
    });
    
    return filteredData;
  }, [data, modelConsistencyData, modelsLookup]);

  if (loading) {
    return (
      <PageContainer>
        <div className={styles.loadingContainer}>
          <Spinner />
        </div>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer>
        <div className={styles.errorContainer}>
          <div className="text-red-500">Failed to load analytics data. Please try again.</div>
        </div>
      </PageContainer>
    );
  }



  const ifrcColors = [
    '#F5333F', '#F64752', '#F75C65', '#F87079', '#F9858C', '#FA999F', '#FBADB2', '#FCC2C5'
  ];

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto">
        <div className={styles.tabSelector}>
          <SegmentInput
            name="analytics-view"
            value={view}
            onChange={(value) => {
              if (value === 'crisis_maps' || value === 'drone_images') {
                setView(value);
              }
            }}
            options={viewOptions}
            keySelector={(o) => o.key}
            labelSelector={(o) => o.label}
          />
        </div>

        {view === 'crisis_maps' ? (
          <div className={styles.chartGrid}>
            <Container heading="Summary Statistics" headingLevel={3} withHeaderBorder withInternalPadding>
              <div className={styles.summaryStatsCards}>
                <div className={styles.summaryStatsCard}>
                  <div className={styles.summaryStatsCardValue}>
                    {getImageTypeCount('crisis_map')}
                  </div>
                  <div className={styles.summaryStatsCardLabel}>Total Crisis Maps</div>
                </div>
                <div className={styles.summaryStatsCard}>
                  <div className={styles.summaryStatsCardValue}>
                    2000
                  </div>
                  <div className={styles.summaryStatsCardLabel}>Target Amount</div>
                </div>
              </div>
              <div className={styles.progressSection}>
                <div className={styles.progressLabel}>
                  <span>Progress towards target</span>
                  <span>{Math.round((getImageTypeCount('crisis_map') / 2000) * 100)}%</span>
                </div>
                <ProgressBar value={getImageTypeCount('crisis_map')} totalValue={2000} />
              </div>
            </Container>

            <Container heading="Regions Distribution" headingLevel={3} withHeaderBorder withInternalPadding>
              <div className={styles.chartSection}>
                <div className={styles.chartContainer}>
                  <PieChart
                    data={getImageTypeRegionsChartData('crisis_map')}
                    valueSelector={d => d.value}
                    labelSelector={d => d.name}
                    keySelector={d => d.name}
                    colors={ifrcColors}
                    showPercentageInLegend
                  />
                </div>
                <div className={styles.tableContainer}>
                  <Table
                    data={getImageTypeRegionsTableData('crisis_map')}
                    columns={regionsColumns}
                    keySelector={numericIdSelector}
                    filtered={false}
                    pending={false}
                  />
                </div>
              </div>
            </Container>

            <Container heading="Sources Distribution" headingLevel={3} withHeaderBorder withInternalPadding>
              <div className={styles.chartSection}>
                <div className={styles.chartContainer}>
                  <PieChart
                    data={getImageTypeSourcesChartData('crisis_map')}
                    valueSelector={d => d.value}
                    labelSelector={d => d.name}
                    keySelector={d => d.name}
                    colors={ifrcColors}
                    showPercentageInLegend
                  />
                </div>
                <div className={styles.tableContainer}>
                  <Table
                    data={getImageTypeSourcesTableData('crisis_map')}
                    columns={sourcesColumns}
                    keySelector={numericIdSelector}
                    filtered={false}
                    pending={false}
                  />
                </div>
              </div>
            </Container>

            <Container heading="Types Distribution" headingLevel={3} withHeaderBorder withInternalPadding>
              <div className={styles.chartSection}>
                <div className={styles.chartContainer}>
                  <PieChart
                    data={getImageTypeTypesChartData('crisis_map')}
                    valueSelector={d => d.value}
                    labelSelector={d => d.name}
                    keySelector={d => d.name}
                    colors={ifrcColors}
                    showPercentageInLegend
                  />
                </div>
                <div className={styles.tableContainer}>
                  <Table
                    data={getImageTypeTypesTableData('crisis_map')}
                    columns={typesColumns}
                    keySelector={numericIdSelector}
                    filtered={false}
                    pending={false}
                  />
                </div>
              </div>
            </Container>

                         {/* New Analytics Containers */}
             <Container heading="User Interaction Statistics" headingLevel={3} withHeaderBorder withInternalPadding>
              <div className={styles.userInteractionCards}>
                {/* Median Edit Time Card */}
                <div className={styles.userInteractionCard}>
                  <div className={styles.userInteractionCardValue}>
                    {getImageTypeMedianEditTime('crisis_map')}
                  </div>
                  <div className={styles.userInteractionCardLabel}>Median Edit Time</div>
                  <Button
                    name="view-edit-time-details"
                    variant={showEditTimeModal ? "primary" : "secondary"}
                    onClick={() => openModal(showEditTimeModal ? 'none' : 'editTime')}
                    className={styles.userInteractionCardButton}
                  >
                    {showEditTimeModal ? 'Hide Details' : 'View Details'}
                  </Button>
                </div>

                {/* Median % Modified Card */}
                <div className={styles.userInteractionCard}>
                  <div className={styles.userInteractionCardValue}>
                    {getImageTypePercentageModified()}
                  </div>
                  <div className={styles.userInteractionCardLabel}>Median % Modified</div>
                  <Button
                    name="view-percentage-details"
                    variant={showPercentageModal ? "primary" : "secondary"}
                    onClick={() => openModal(showPercentageModal ? 'none' : 'percentage')}
                    className={styles.userInteractionCardButton}
                  >
                    {showPercentageModal ? 'Hide Details' : 'View Details'}
                  </Button>
                </div>

                {/* Delete Rate Card */}
                <div className={styles.userInteractionCard}>
                  <div className={styles.userInteractionCardValue}>
                    {getImageTypeDeleteRate()}
                  </div>
                  <div className={styles.userInteractionCardLabel}>Delete Rate</div>
                  <Button
                    name="view-delete-details"
                    variant={showDeleteModal ? "primary" : "secondary"}
                    onClick={() => openModal(showDeleteModal ? 'none' : 'delete')}
                    className={styles.userInteractionCardButton}
                  >
                    {showDeleteModal ? 'Hide Details' : 'View Details'}
                  </Button>
                </div>
              </div>

                {/* Edit Time Details Table */}
                {showEditTimeModal && (
                  <div className={styles.modelPerformance}>
                    <Table
                      data={getImageTypeEditTimeTableData('crisis_map')}
                      columns={editTimeColumns}
                      keySelector={numericIdSelector}
                      filtered={false}
                      pending={false}
                    />
                  </div>
                )}

                {/* Percentage Modified Details Table */}
                {showPercentageModal && (
                  <div className={styles.modelPerformance}>
                    <Table
                      data={getImageTypePercentageTableData('crisis_map')}
                      columns={percentageModifiedColumns}
                      keySelector={numericIdSelector}
                      filtered={false}
                      pending={false}
                    />
                  </div>
                )}

                {/* Delete Rate Details Table */}
                {showDeleteModal && (
                  <div className={styles.modelPerformance}>
                    <Table
                      data={getImageTypeDeleteRateTableData('crisis_map')}
                      columns={deleteRateColumns}
                      keySelector={numericIdSelector}
                      filtered={false}
                      pending={false}
                    />
                  </div>
                )}
            </Container>

            <Container heading="Model Performance" headingLevel={3} withHeaderBorder withInternalPadding>
              <div className={styles.modelPerformance}>
                <Table
                  data={getImageTypeModelsTableData('crisis_map')}
                  columns={modelsColumns}
                  keySelector={numericIdSelector}
                  filtered={false}
                  pending={false}
                />
              </div>
            </Container>

            

            <Container heading="Quality-Source Correlation" headingLevel={3} withHeaderBorder withInternalPadding>
              <div className={styles.tableContainer}>
                <Table
                  data={getImageTypeQualityBySourceTableData('crisis_map')}
                  columns={qualityBySourceColumns}
                  keySelector={numericIdSelector}
                  filtered={false}
                  pending={false}
                />
              </div>
            </Container>

            <Container heading="Quality-Event Type Correlation" headingLevel={3} withHeaderBorder withInternalPadding>
              <div className={styles.tableContainer}>
                <Table
                  data={getImageTypeQualityByEventTypeTableData('crisis_map')}
                  columns={qualityByEventTypeColumns}
                  keySelector={numericIdSelector}
                  filtered={false}
                  pending={false}
                />
              </div>
            </Container>

            <Container heading="Model Consistency Analysis" headingLevel={3} withHeaderBorder withInternalPadding>
              <div className={styles.tableContainer}>
                <Table
                  data={getImageTypeModelConsistencyTableData('crisis_map')}
                  columns={modelConsistencyColumns}
                  keySelector={numericIdSelector}
                  filtered={false}
                  pending={false}
                />
              </div>
            </Container>
          </div>
        ) : (
          <div className={styles.chartGrid}>
            <Container heading="Summary Statistics" headingLevel={3} withHeaderBorder withInternalPadding>
              <div className={styles.summaryStatsCards}>
                <div className={styles.summaryStatsCard}>
                  <div className={styles.summaryStatsCardValue}>
                    {getImageTypeCount('drone_image')}
                  </div>
                  <div className={styles.summaryStatsCardLabel}>Total Drone Images</div>
                </div>
                <div className={styles.summaryStatsCard}>
                  <div className={styles.summaryStatsCardValue}>
                    2000
                  </div>
                  <div className={styles.summaryStatsCardLabel}>Target Amount</div>
                </div>
              </div>
              <div className={styles.progressSection}>
                <div className={styles.progressLabel}>
                  <span>Progress towards target</span>
                  <span>{Math.round((getImageTypeCount('drone_image') / 2000) * 100)}%</span>
                </div>
                <ProgressBar value={getImageTypeCount('drone_image')} totalValue={2000} />
              </div>
            </Container>

            <Container heading="Regions Distribution" headingLevel={3} withHeaderBorder withInternalPadding>
              <div className={styles.chartSection}>
                <div className={styles.chartContainer}>
                  <PieChart
                    data={getImageTypeRegionsChartData('drone_image')}
                    valueSelector={d => d.value}
                    labelSelector={d => d.name}
                    keySelector={d => d.name}
                    colors={ifrcColors}
                    showPercentageInLegend
                  />
                </div>
                <div className={styles.tableContainer}>
                  <Table
                    data={getImageTypeRegionsTableData('drone_image')}
                    columns={regionsColumns}
                    keySelector={numericIdSelector}
                    filtered={false}
                    pending={false}
                  />
                </div>
              </div>
            </Container>

            

            <Container heading="Types Distribution" headingLevel={3} withHeaderBorder withInternalPadding>
              <div className={styles.chartSection}>
                <div className={styles.chartContainer}>
                  <PieChart
                    data={getImageTypeTypesChartData('drone_image')}
                    valueSelector={d => d.value}
                    labelSelector={d => d.name}
                    keySelector={d => d.name}
                    colors={ifrcColors}
                    showPercentageInLegend
                  />
                </div>
                <div className={styles.tableContainer}>
                  <Table
                    data={getImageTypeTypesTableData('drone_image')}
                    columns={typesColumns}
                    keySelector={numericIdSelector}
                    filtered={false}
                    pending={false}
                  />
                </div>
              </div>
            </Container>

                         {/* User Interaction Statistics Box */}
             <Container heading="User Interaction Statistics" headingLevel={3} withHeaderBorder withInternalPadding>
                <div className={styles.userInteractionCards}>
                  {/* Median Edit Time Card */}
                  <div className={styles.userInteractionCard}>
                    <div className={styles.userInteractionCardValue}>
                      {getImageTypeMedianEditTime('drone_image')}
                    </div>
                    <div className={styles.userInteractionCardLabel}>Median Edit Time</div>
                    <Button
                      name="view-edit-time-details"
                      variant={showEditTimeModal ? "primary" : "secondary"}
                      onClick={() => openModal(showEditTimeModal ? 'none' : 'editTime')}
                      className={styles.userInteractionCardButton}
                    >
                      {showEditTimeModal ? 'Hide Details' : 'View Details'}
                    </Button>
                  </div>

                  {/* Median % Modified Card */}
                  <div className={styles.userInteractionCard}>
                    <div className={styles.userInteractionCardValue}>
                      {getImageTypePercentageModified()}
                    </div>
                    <div className={styles.userInteractionCardLabel}>Median % Modified</div>
                    <Button
                      name="view-percentage-details"
                      variant={showPercentageModal ? "primary" : "secondary"}
                      onClick={() => openModal(showPercentageModal ? 'none' : 'percentage')}
                      className={styles.userInteractionCardButton}
                    >
                      {showPercentageModal ? 'Hide Details' : 'View Details'}
                    </Button>
                  </div>

                  {/* Delete Rate Card */}
                  <div className={styles.userInteractionCard}>
                    <div className={styles.userInteractionCardValue}>
                      {getImageTypeDeleteRate()}
                    </div>
                    <div className={styles.userInteractionCardLabel}>Delete Rate</div>
                    <Button
                      name="view-delete-details"
                      variant={showDeleteModal ? "primary" : "secondary"}
                      onClick={() => openModal(showDeleteModal ? 'none' : 'delete')}
                      className={styles.userInteractionCardButton}
                    >
                      {showDeleteModal ? 'Hide Details' : 'View Details'}
                    </Button>
                  </div>
                </div>
                
                                 {/* Edit Time Details Table */}
                 {showEditTimeModal && (
                   <div className={styles.modelPerformance}>
                     <Table
                       data={getImageTypeEditTimeTableData('drone_image')}
                       columns={editTimeColumns}
                       keySelector={numericIdSelector}
                       filtered={false}
                       pending={false}
                     />
                   </div>
                 )}

                 {/* Percentage Modified Details Table */}
                 {showPercentageModal && (
                   <div className={styles.modelPerformance}>
                     <Table
                       data={getImageTypePercentageTableData('drone_image')}
                       columns={percentageModifiedColumns}
                       keySelector={numericIdSelector}
                       filtered={false}
                       pending={false}
                     />
                   </div>
                 )}

                 {/* Delete Rate Details Table */}
                 {showDeleteModal && (
                   <div className={styles.modelPerformance}>
                     <Table
                       data={getImageTypeDeleteRateTableData('drone_image')}
                       columns={deleteRateColumns}
                       keySelector={numericIdSelector}
                       filtered={false}
                       pending={false}
                     />
                   </div>
                 )}
            </Container>

            <Container heading="Model Performance" headingLevel={3} withHeaderBorder withInternalPadding>
              <div className={styles.modelPerformance}>
                <Table
                  data={getImageTypeModelsTableData('drone_image')}
                  columns={modelsColumns}
                  keySelector={numericIdSelector}
                  filtered={false}
                  pending={false}
                />
              </div>
            </Container>

            <Container heading="Quality-Event Type Correlation" headingLevel={3} withHeaderBorder withInternalPadding>
              <div className={styles.tableContainer}>
                <Table
                  data={getImageTypeQualityByEventTypeTableData('drone_image')}
                  columns={qualityByEventTypeColumns}
                  keySelector={numericIdSelector}
                  filtered={false}
                  pending={false}
                />
              </div>
            </Container>

            <Container heading="Model Consistency Analysis" headingLevel={3} withHeaderBorder withInternalPadding>
              <div className={styles.tableContainer}>
                <Table
                  data={getImageTypeModelConsistencyTableData('drone_image')}
                  columns={modelConsistencyColumns}
                  keySelector={numericIdSelector}
                  filtered={false}
                  pending={false}
                />
              </div>
            </Container>
          </div>
        )}
      </div>


    </PageContainer>
  );
}
