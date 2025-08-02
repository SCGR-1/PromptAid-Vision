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
  caption?: {
    generated: string;
  };
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const [maps, setMaps] = useState<MapOut[]>([]);
  const [search, setSearch] = useState('');
  const [srcFilter, setSrcFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [sources, setSources] = useState<{s_code: string, label: string}[]>([]);
  const [types, setTypes] = useState<{t_code: string, label: string}[]>([]);

  useEffect(() => {
    // Fetch maps
    fetch('/api/images/').then(r => r.json()).then(setMaps);
    
    // Fetch lookup data
    fetch('/api/sources').then(r => r.json()).then(setSources);
    fetch('/api/types').then(r => r.json()).then(setTypes);
  }, []);

  const filtered = useMemo(() => {
    return maps.filter(m => {
      return (
        m.file_key.toLowerCase().includes(search.toLowerCase()) &&
        (!srcFilter || m.source === srcFilter) &&
        (!catFilter || m.type === catFilter)
      );
    });
  }, [maps, search, srcFilter, catFilter]);

  const sourceOptions   = sources.map(s => ({ value: s.s_code, label: s.label }));
  const typeOptions = types.map(t => ({ value: t.t_code, label: t.label }));

  return (
    <PageContainer>
      <Heading level={2}>Explore Examples</Heading>

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
          options={sourceOptions}
          value={srcFilter || null}
          onChange={(v) => setSrcFilter(v as string || '')}
          keySelector={(o) => o.value}
          labelSelector={(o) => o.label}
          selectedOnTop={false}
        />

        <SearchMultiSelectInput
          name="type"
          placeholder="All Types"
          options={typeOptions}
          value={catFilter ? [catFilter] : []}
          onChange={(v) => setCatFilter((v as string[])[0] || '')}
          keySelector={(o) => o.value}
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
                {m.caption?.generated || '— no caption yet —'}
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
