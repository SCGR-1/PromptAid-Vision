import { PageContainer, Heading, TextInput, SelectInput, MultiSelectInput, Button } from '@ifrc-go/ui';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { StarLineIcon } from '@ifrc-go/icons';

interface MapOut {
  image_id: string;
  file_key: string;
  image_url: string;
  source: string;
  type: string;
  epsg: string;
  image_type: string;
  countries?: {c_code: string, label: string, r_code: string}[];
  caption?: {
    title: string;
    generated: string;
    edited?: string;
    starred?: boolean;
  };
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const [maps, setMaps] = useState<MapOut[]>([]);
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

  const fetchMaps = () => {
    setIsLoadingFilters(true);
    // Fetch maps
    fetch('/api/images/')
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then(data => {
        // Ensure data is an array
        if (Array.isArray(data)) {
          setMaps(data);
          console.log(`Loaded ${data.length} maps`);
          if (data.length > 0) {
            console.log('Sample map data:', {
              image_id: data[0].image_id,
              source: data[0].source,
              type: data[0].type,
              countries: data[0].countries?.length || 0,
              caption: data[0].caption ? 'has caption' : 'no caption'
            });
          }
        } else {
          console.error('Expected array from /api/images/, got:', data);
          setMaps([]);
        }
      })
      .catch(err => {
        console.error('Failed to fetch maps:', err);
        setMaps([]);
      })
      .finally(() => {
        setIsLoadingFilters(false);
      });
  };

  useEffect(() => {
    fetchMaps();
  }, []);

  // Auto-refresh when component becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchMaps();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    // Fetch lookup data
    console.log('Fetching filter data...');
    setIsLoadingFilters(true);
    
    Promise.all([
      fetch('/api/sources').then(r => {
        console.log('Sources response:', r.status, r.statusText);
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      }),
      fetch('/api/types').then(r => {
        console.log('Types response:', r.status, r.statusText);
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      }),
      fetch('/api/regions').then(r => {
        console.log('Regions response:', r.status, r.statusText);
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      }),
      fetch('/api/countries').then(r => {
        console.log('Countries response:', r.status, r.statusText);
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      })
    ]).then(([sourcesData, typesData, regionsData, countriesData]) => {
      console.log('Fetched filter data:', {
        sources: sourcesData.length,
        types: typesData.length,
        regions: regionsData.length,
        countries: countriesData.length
      });
      
      if (Array.isArray(sourcesData)) {
        setSources(sourcesData);
      } else {
        console.error('Expected array from /api/sources, got:', sourcesData);
        setSources([]);
      }
      
      if (Array.isArray(typesData)) {
        setTypes(typesData);
      } else {
        console.error('Expected array from /api/types, got:', typesData);
        setTypes([]);
      }
      
      if (Array.isArray(regionsData)) {
        setRegions(regionsData);
      } else {
        console.error('Expected array from /api/regions, got:', regionsData);
        setRegions([]);
      }
      
      if (Array.isArray(countriesData)) {
        setCountries(countriesData);
      } else {
        console.error('Expected array from /api/countries, got:', countriesData);
        setCountries([]);
      }
      
      setIsLoadingFilters(false);
    }).catch(err => {
      console.error('Failed to fetch filter data:', err);
      // Set empty arrays on error to prevent undefined issues
      setSources([]);
      setTypes([]);
      setRegions([]);
      setCountries([]);
      setIsLoadingFilters(false);
    });
  }, []);

  const filtered = useMemo(() => {
    // Ensure maps is an array before filtering
    if (!Array.isArray(maps)) {
      console.warn('maps is not an array:', maps);
      return [];
    }
    
    return maps.filter(m => {
      // Search in filename, source, type, title, and caption
      const searchLower = search.toLowerCase();
      const searchMatch = !search || 
        m.file_key.toLowerCase().includes(searchLower) ||
        m.source.toLowerCase().includes(searchLower) ||
        m.type.toLowerCase().includes(searchLower) ||
        (m.caption?.title && m.caption.title.toLowerCase().includes(searchLower)) ||
        (m.caption?.edited && m.caption.edited.toLowerCase().includes(searchLower)) ||
        (m.caption?.generated && m.caption.generated.toLowerCase().includes(searchLower));
      
      // Filter by source
      const sourceMatch = !srcFilter || m.source === srcFilter;
      
      // Filter by type
      const typeMatch = !catFilter || m.type === catFilter;
      
      // Filter by region (check if any country in the image belongs to the selected region)
      const regionMatch = !regionFilter || (m.countries && m.countries.some(c => c.r_code === regionFilter));
      
      // Filter by country (check if any country in the image matches the selected country)
      const countryMatch = !countryFilter || (m.countries && m.countries.some(c => c.c_code === countryFilter));
      
      // Filter by starred status
      const starredMatch = !showStarredOnly || (m.caption && m.caption.starred === true);
      
      return searchMatch && sourceMatch && typeMatch && regionMatch && countryMatch && starredMatch;
    });
  }, [maps, search, srcFilter, catFilter, regionFilter, countryFilter]);

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div>
            <Heading level={2}>Explore Examples</Heading>
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
                  maps: maps,
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
                a.download = `promptaid-vision-data-${new Date().toISOString().split('T')[0]}.json`;
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
        <div className="bg-gray-50 rounded-lg p-4">
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
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {filtered.length} of {maps.length} examples
            </p>
          </div>

          {/* List */}
          <div className="space-y-4">
            {filtered.map(m => (
              <div key={m.image_id} className="border border-gray-200 rounded-lg p-4 flex gap-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => navigate(`/map/${m.image_id}`)}>
                <div className="bg-gray-100 flex items-center justify-center text-gray-400 text-xs overflow-hidden rounded" style={{ width: '120px', height: '80px' }}>
                  {m.image_url ? (
                    <img 
                      src={m.image_url} 
                      alt={m.file_key}
                      className="w-full h-full object-cover"
                      style={{ imageRendering: 'pixelated' }}
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = 'Img';
                      }}
                    />
                  ) : (
                    'Img'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 mb-2">
                    {m.caption?.title || 'No title'}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="px-2 py-1 bg-ifrcRed/10 text-ifrcRed text-xs rounded">{m.source}</span>
                    <span className="px-2 py-1 bg-ifrcRed text-xs rounded">{m.type}</span>
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
    </PageContainer>
  );
}
