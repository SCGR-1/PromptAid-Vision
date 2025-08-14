import { PageContainer, TextInput, SelectInput, MultiSelectInput, Container, SegmentInput } from '@ifrc-go/ui';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [search, setSearch] = useState('');
  const [srcFilter, setSrcFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [sources, setSources] = useState<{s_code: string, label: string}[]>([]);
  const [types, setTypes] = useState<{t_code: string, label: string}[]>([]);
  const [regions, setRegions] = useState<{r_code: string, label: string}[]>([]);
  const [countries, setCountries] = useState<{c_code: string, label: string, r_code: string}[]>([]);
  const [imageTypes, setImageTypes] = useState<{image_type: string, label: string}[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);

  const viewOptions = [
    { key: 'explore' as const, label: 'Explore' },
    { key: 'mapDetails' as const, label: 'Map Details' }
  ];

  const fetchCaptions = () => {
    setIsLoadingFilters(true);
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
            const hasCaption = item.title && item.generated && item.model;
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
        setIsLoadingFilters(false);
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
      
      return matchesSearch && matchesSource && matchesCategory && matchesRegion && matchesCountry;
    });
  }, [captions, search, srcFilter, catFilter, regionFilter, countryFilter]);


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
        </div>

        {view === 'explore' ? (
          <div className="space-y-6">
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
              </div>
            </div>

            {/* Results Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {filtered.length} of {captions.length} examples
                </p>
              </div>

              {/* List */}
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
                        {c.title}
                      </h3>
                      <div className={styles.mapItemMetadata}>
                        <div className={styles.metadataTags}>
                          <span className={styles.metadataTagSource}>
                            {sources.find(s => s.s_code === c.source)?.label || c.source}
                          </span>
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
      </Container>
    </PageContainer>
  );
}
