import { PageContainer, TextInput, SelectInput, MultiSelectInput, Button, Container } from '@ifrc-go/ui';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { StarLineIcon } from '@ifrc-go/icons';
import styles from './ExplorePage.module.css';

interface CaptionWithImageOut {
  cap_id: string;
  image_id: string;
  title: string;
  prompt: string;
  model: string;
  schema_id: string;
  raw_json: any;
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
  const [captions, setCaptions] = useState<CaptionWithImageOut[]>([]);
  const [search, setSearch] = useState('');
  const [srcFilter, setSrcFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [sources, setSources] = useState<{s_code: string, label: string}[]>([]);
  const [types, setTypes] = useState<{t_code: string, label: string}[]>([]);
  const [regions, setRegions] = useState<{r_code: string, label: string}[]>([]);
  const [countries, setCountries] = useState<{c_code: string, label: string, r_code: string}[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);

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
          setCaptions(data);

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
      })
    ]).then(([sourcesData, typesData, regionsData, countriesData]) => {

      
      if (Array.isArray(sourcesData)) {
        setSources(sourcesData);
      } else {

        setSources([]);
      }
      
      if (Array.isArray(typesData)) {
        setTypes(typesData);
      } else {

        setTypes([]);
      }
      
      if (Array.isArray(regionsData)) {
        setRegions(regionsData);
      } else {

        setRegions([]);
      }
      
      if (Array.isArray(countriesData)) {
        setCountries(countriesData);
      } else {

        setCountries([]);
      }
      
      setIsLoadingFilters(false);
    }).catch(() => {

      setSources([]);
      setTypes([]);
      setRegions([]);
      setCountries([]);
      setIsLoadingFilters(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!Array.isArray(captions)) {
      
      return [];
    }
    
    return captions.filter(c => {
      const searchLower = search.toLowerCase();
      const searchMatch = !search || 
        c.file_key.toLowerCase().includes(searchLower) ||
        c.source.toLowerCase().includes(searchLower) ||
        c.event_type.toLowerCase().includes(searchLower) ||
        c.title.toLowerCase().includes(searchLower) ||
        (c.edited && c.edited.toLowerCase().includes(searchLower)) ||
        (c.generated && c.generated.toLowerCase().includes(searchLower));
      
      const sourceMatch = !srcFilter || c.source === srcFilter;
      const typeMatch = !catFilter || c.event_type === catFilter;
      const regionMatch = !regionFilter || (c.countries && c.countries.some(c => c.r_code === regionFilter));
      const countryMatch = !countryFilter || (c.countries && c.countries.some(c => c.c_code === countryFilter));
      const starredMatch = !showStarredOnly || c.starred === true;
      
      return searchMatch && sourceMatch && typeMatch && regionMatch && countryMatch && starredMatch;
    });
  }, [captions, search, srcFilter, catFilter, regionFilter, countryFilter]);

  return (
    <PageContainer>
      <Container
        heading="Explore Examples"
        headingLevel={2}
        withHeaderBorder
        withInternalPadding
        className="max-w-7xl mx-auto"
      >
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-600 mt-1">Browse and search through uploaded crisis maps</p>
            </div>
            <div className="flex gap-2">
              <Button
                name="reference-examples"
                variant={showStarredOnly ? "primary" : "secondary"}
                onClick={() => setShowStarredOnly(!showStarredOnly)}
              >
                <StarLineIcon className="w-4 h-4" />
                <span className="inline ml-2">Reference Examples</span>
              </Button>
              <Button
                name="export"
                variant="secondary"
                onClick={() => {
                  const data = {
                    captions: captions,
                    filters: {
                      sources: sources,
                      types: types,
                      regions: regions,
                      countries: countries
                    },
                    timestamp: new Date().toISOString()
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `promptaid-vision-captions-${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                Export
              </Button>
            </div>
          </div>

          {/* Filters Bar */}
          <Container heading="Search & Filters" headingLevel={3} withHeaderBorder withInternalPadding>
            <div className="flex flex-wrap gap-4 items-center">
              <TextInput
                name="search"
                placeholder="Search by filename, title…"
                value={search}
                onChange={(e) => setSearch(e || '')}
                className="flex-1 min-w-[12rem]"
              />

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

              <SelectInput
                name="type"
                placeholder={isLoadingFilters ? "Loading..." : "All Types"}
                options={types}
                value={catFilter || null}
                onChange={(v) => setCatFilter(v as string || '')}
                keySelector={(o) => o.t_code}
                labelSelector={(o) => o.label}
                required={false}
                disabled={isLoadingFilters}
              />

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
            </div>
          </Container>

          {/* Results Section */}
          <Container heading="Results" headingLevel={3} withHeaderBorder withInternalPadding>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {filtered.length} of {captions.length} examples
                </p>
              </div>

              {/* List */}
              <div className="space-y-4">
                {filtered.map(c => (
                  <div key={c.cap_id} className={styles.mapItem} onClick={() => navigate(`/map/${c.image_id}?captionId=${c.cap_id}`)}>
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
                            {c.source}
                          </span>
                          <span className={styles.metadataTagType}>
                            {c.event_type}
                          </span>
                          <span className={styles.metadataTag}>
                            {c.epsg}
                          </span>
                          <span className={styles.metadataTag}>
                            {c.image_type}
                          </span>
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
          </Container>
        </div>
      </Container>
    </PageContainer>
  );
}
