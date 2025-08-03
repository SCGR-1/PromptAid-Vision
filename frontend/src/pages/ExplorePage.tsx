import { PageContainer, Heading, TextInput, SearchSelectInput, SearchMultiSelectInput } from '@ifrc-go/ui';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

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
    generated: string;
    edited?: string;
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
  const [sources, setSources] = useState<{s_code: string, label: string}[]>([]);
  const [types, setTypes] = useState<{t_code: string, label: string}[]>([]);
  const [regions, setRegions] = useState<{r_code: string, label: string}[]>([]);
  const [countries, setCountries] = useState<{c_code: string, label: string, r_code: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMaps = () => {
    setIsLoading(true);
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
        setIsLoading(false);
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
    Promise.all([
      fetch('/api/sources').then(r => r.json()),
      fetch('/api/types').then(r => r.json()),
      fetch('/api/regions').then(r => r.json()),
      fetch('/api/countries').then(r => r.json())
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
    }).catch(err => {
      console.error('Failed to fetch filter data:', err);
    });
  }, []);

  // Add refresh function
  const handleRefresh = () => {
    fetchMaps();
  };

  const filtered = useMemo(() => {
    // Ensure maps is an array before filtering
    if (!Array.isArray(maps)) {
      console.warn('maps is not an array:', maps);
      return [];
    }
    
    return maps.filter(m => {
      // Search in filename, source, type, and caption
      const searchLower = search.toLowerCase();
      const searchMatch = !search || 
        m.file_key.toLowerCase().includes(searchLower) ||
        m.source.toLowerCase().includes(searchLower) ||
        m.type.toLowerCase().includes(searchLower) ||
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
      
      return searchMatch && sourceMatch && typeMatch && regionMatch && countryMatch;
    });
  }, [maps, search, srcFilter, catFilter, regionFilter, countryFilter]);



  return (
    <PageContainer>
      <div className="flex justify-between items-center">
        <Heading level={2}>Explore Examples</Heading>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-4 py-2 bg-ifrcRed text-white rounded hover:bg-ifrcRed/90 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* ── Filters Bar ──────────────────────────────── */}
      <div className="mt-4 flex flex-wrap gap-4 items-center">
        <TextInput
          name="search"
          placeholder="Search by filename…"
          value={search}
          onChange={(e) => setSearch(e || '')}
          className="flex-1 min-w-[12rem]"
        />

        <SearchSelectInput
          name="source"
          placeholder="All Sources"
          options={sources}
          value={srcFilter || null}
          onChange={(v) => setSrcFilter(v as string || '')}
          keySelector={(o) => o.s_code}
          labelSelector={(o) => o.label}
          selectedOnTop={false}
        />

        <SearchMultiSelectInput
          name="type"
          placeholder="All Types"
          options={types}
          value={catFilter ? [catFilter] : []}
          onChange={(v) => setCatFilter((v as string[])[0] || '')}
          keySelector={(o) => o.t_code}
          labelSelector={(o) => o.label}
          selectedOnTop={false}
        />

        <SearchSelectInput
          name="region"
          placeholder="All Regions"
          options={regions}
          value={regionFilter || null}
          onChange={(v) => setRegionFilter(v as string || '')}
          keySelector={(o) => o.r_code}
          labelSelector={(o) => o.label}
          selectedOnTop={false}
        />

        <SearchSelectInput
          name="country"
          placeholder="All Countries"
          options={countries}
          value={countryFilter || null}
          onChange={(v) => setCountryFilter(v as string || '')}
          keySelector={(o) => o.c_code}
          labelSelector={(o) => o.label}
          selectedOnTop={false}
        />
      </div>

      {/* ── List ─────────────────────────────────────── */}
      <div className="mt-6 space-y-4">
        {filtered.map(m => (
          <div key={m.image_id} className="border rounded-lg p-4 flex gap-4 cursor-pointer" onClick={() => navigate(`/map/${m.image_id}`)}>
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
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-ifrcRed/10 text-ifrcRed text-xs rounded">{m.source}</span>
                <span className="px-2 py-1 bg-ifrcRed/10 text-ifrcRed text-xs rounded">{m.type}</span>
              </div>
              <p className="mt-2 text-sm text-gray-700 line-clamp-2">
                {m.caption?.edited || m.caption?.generated || '— no caption yet —'}
              </p>
            </div>
          </div>
        ))}

        {!filtered.length && (
          <p className="text-center text-gray-500">No examples found.</p>
        )}
      </div>
    </PageContainer>
  );
}
