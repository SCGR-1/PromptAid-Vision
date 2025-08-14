import {
  PageContainer,
  PieChart,
  KeyFigure,
  Spinner,
  Container,
  ProgressBar,
  SegmentInput,
  Table,
} from '@ifrc-go/ui';
import {
  createStringColumn,
  createNumberColumn,
  numericIdSelector
} from '@ifrc-go/ui/utils';
import { useState, useEffect, useMemo, useCallback } from 'react';
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
    };
  };
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

interface MapData {
  source?: string;
  event_type?: string;
  countries?: Array<{ r_code?: string }>;
  captions?: Array<{
    model?: string;
    accuracy?: number;
    context?: number;
    usability?: number;
  }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'general' | 'vlm'>('general');
  const [sourcesLookup, setSourcesLookup] = useState<LookupData[]>([]);
  const [typesLookup, setTypesLookup] = useState<LookupData[]>([]);
  const [regionsLookup, setRegionsLookup] = useState<LookupData[]>([]);

  const viewOptions = [
    { key: 'general' as const, label: 'General Analytics' },
    { key: 'vlm' as const, label: 'VLM Analytics' }
  ];

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/images/');
      const maps = await res.json();

      const analytics: AnalyticsData = {
        totalCaptions: maps.length,
        sources: {},
        types: {},
        regions: {},
        models: {},
      };

      maps.forEach((map: MapData) => {
        if (map.source) analytics.sources[map.source] = (analytics.sources[map.source] || 0) + 1;
        if (map.event_type) analytics.types[map.event_type] = (analytics.types[map.event_type] || 0) + 1;
        if (map.countries) {
          map.countries.forEach((c) => {
            if (c.r_code) analytics.regions[c.r_code] = (analytics.regions[c.r_code] || 0) + 1;
          });
        }
        if (map.captions && map.captions.length > 0 && map.captions[0].model) {
          const m = map.captions[0].model;
          const ctr = analytics.models[m] ||= { count: 0, avgAccuracy: 0, avgContext: 0, avgUsability: 0, totalScore: 0 };
          ctr.count++;
          if (map.captions[0].accuracy != null) ctr.avgAccuracy += map.captions[0].accuracy;
          if (map.captions[0].context != null) ctr.avgContext += map.captions[0].context;
          if (map.captions[0].usability != null) ctr.avgUsability += map.captions[0].usability;
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
          analytics.models[model] = { count: 0, avgAccuracy: 0, avgContext: 0, avgUsability: 0, totalScore: 0 };
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

      setData(analytics);
    } catch {
      
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [sourcesLookup, typesLookup, regionsLookup]);

  const fetchLookupData = useCallback(async () => {
    try {
      const [sourcesRes, typesRes, regionsRes] = await Promise.all([
        fetch('/api/sources'),
        fetch('/api/types'),
        fetch('/api/regions')
      ]);
      const sources = await sourcesRes.json();
      const types = await typesRes.json();
      const regions = await regionsRes.json();
      setSourcesLookup(sources);
      setTypesLookup(types);
      setRegionsLookup(regions);
    } catch {
      // Silently handle errors for lookup data
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchLookupData();
  }, [fetchAnalytics, fetchLookupData]);

  const getSourceLabel = useCallback((code: string) => {
    const source = sourcesLookup.find(s => s.s_code === code);
    return source ? source.label : code;
  }, [sourcesLookup]);

  const getTypeLabel = useCallback((code: string) => {
    const type = typesLookup.find(t => t.t_code === code);
    return type ? type.label : code;
  }, [typesLookup]);

  const regionsTableData = useMemo(() => {
    if (!data || !regionsLookup.length) return [];
    
    const allRegions = regionsLookup.reduce((acc, region) => {
      if (region.r_code) {
        acc[region.r_code] = {
          name: region.label,
          count: data.regions[region.r_code] || 0
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
        percentage: data.totalCaptions > 0 ? Math.round((count / data.totalCaptions) * 100) : 0
      }));
  }, [data, regionsLookup]);

  const typesTableData = useMemo(() => {
    if (!data) return [];
    
    return Object.entries(data.types)
      .sort(([,a], [,b]) => b - a)
      .map(([typeKey, count], index) => ({
        id: index + 1,
        name: getTypeLabel(typeKey),
        count,
        percentage: Math.round((count / data.totalCaptions) * 100)
      }));
  }, [data, getTypeLabel]);

  const sourcesTableData = useMemo(() => {
    if (!data) return [];
    
    return Object.entries(data.sources)
      .sort(([,a], [,b]) => b - a)
      .map(([sourceKey, count], index) => ({
        id: index + 1,
        name: getSourceLabel(sourceKey),
        count,
        percentage: Math.round((count / data.totalCaptions) * 100)
      }));
  }, [data, getSourceLabel]);

  const modelsTableData = useMemo(() => {
    if (!data) return [];
    
    return Object.entries(data.models)
      .sort(([,a], [,b]) => b.totalScore - a.totalScore)
      .map(([model, stats], index) => ({
        id: index + 1,
        name: model,
        count: stats.count,
        accuracy: stats.avgAccuracy,
        context: stats.avgContext,
        usability: stats.avgUsability,
        totalScore: stats.totalScore
      }));
  }, [data]);

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
  ], []);

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

  const sourcesChartData = Object.entries(data.sources).filter(([, value]) => value > 0).map(([name, value]) => ({ name, value }));
  const typesChartData = Object.entries(data.types).filter(([, value]) => value > 0).map(([name, value]) => ({ name, value }));
  const regionsChartData = Object.entries(data.regions).filter(([, value]) => value > 0).map(([name, value]) => ({ name, value }));

  const ifrcColors = [
    '#F5333F', '#F64752', '#F75C65', '#F87079', '#F9858C', '#FA999F', '#FBADB2', '#FCC2C5'
  ];

  return (
    <PageContainer>
      <Container
        heading="Analytics Dashboard"
        headingLevel={2}
        withHeaderBorder
        withInternalPadding
        className="max-w-7xl mx-auto"
      >
        <div className={styles.tabSelector}>
          <SegmentInput
            name="analytics-view"
            value={view}
            onChange={(value) => {
              if (value === 'general' || value === 'vlm') {
                setView(value);
              }
            }}
            options={viewOptions}
            keySelector={(o) => o.key}
            labelSelector={(o) => o.label}
          />
        </div>

        {view === 'general' ? (
          <div className={styles.chartGrid}>
            <Container heading="Summary Statistics" headingLevel={3} withHeaderBorder withInternalPadding>
              <div className={styles.summaryStats}>
                <KeyFigure
                  value={data.totalCaptions}
                  label="Total Captions"
                  compactValue
                />
                <KeyFigure
                  value={2000}
                  label="Target Amount"
                  compactValue
                />
              </div>
              <div className={styles.progressSection}>
                <div className={styles.progressLabel}>
                  <span>Progress towards target</span>
                  <span>{Math.round((data.totalCaptions / 2000) * 100)}%</span>
                </div>
                <ProgressBar value={data.totalCaptions} totalValue={2000} />
              </div>
            </Container>

            <Container heading="Regions Distribution" headingLevel={3} withHeaderBorder withInternalPadding>
              <div className={styles.chartSection}>
                <div className={styles.chartContainer}>
                  <PieChart
                    data={regionsChartData}
                    valueSelector={d => d.value}
                    labelSelector={d => d.name}
                    keySelector={d => d.name}
                    colors={ifrcColors}
                    showPercentageInLegend
                  />
                </div>
                <div className={styles.tableContainer}>
                  <Table
                    data={regionsTableData}
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
                    data={sourcesChartData}
                    valueSelector={d => d.value}
                    labelSelector={d => d.name}
                    keySelector={d => d.name}
                    colors={ifrcColors}
                    showPercentageInLegend
                  />
                </div>
                <div className={styles.tableContainer}>
                  <Table
                    data={sourcesTableData}
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
                    data={typesChartData}
                    valueSelector={d => d.value}
                    labelSelector={d => d.name}
                    keySelector={d => d.name}
                    colors={ifrcColors}
                    showPercentageInLegend
                  />
                </div>
                <div className={styles.tableContainer}>
                  <Table
                    data={typesTableData}
                    columns={typesColumns}
                    keySelector={numericIdSelector}
                    filtered={false}
                    pending={false}
                  />
                </div>
              </div>
            </Container>
          </div>
        ) : (
          <div className={styles.chartGrid}>
            <Container heading="Model Performance" headingLevel={3} withHeaderBorder withInternalPadding>
              <div className={styles.modelPerformance}>
                <Table
                  data={modelsTableData}
                  columns={modelsColumns}
                  keySelector={numericIdSelector}
                  filtered={false}
                  pending={false}
                />
              </div>
            </Container>
          </div>
        )}
      </Container>
    </PageContainer>
  );
}
