import React, { useState, useEffect } from 'react';
import { Container, TextInput, SelectInput, MultiSelectInput, Button } from '@ifrc-go/ui';
import { FilterLineIcon } from '@ifrc-go/icons';
import { useFilterContext } from '../hooks/useFilterContext';

interface FilterBarProps {
  sources: {s_code: string, label: string}[];
  types: {t_code: string, label: string}[];
  regions: {r_code: string, label: string}[];
  countries: {c_code: string, label: string, r_code: string}[];
  imageTypes: {image_type: string, label: string}[];
  isLoadingFilters?: boolean;
}

export default function FilterBar({ 
  sources, 
  types, 
  regions, 
  countries, 
  imageTypes, 
  isLoadingFilters = false 
}: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  
  const {
    search, setSearch,
    srcFilter, setSrcFilter,
    catFilter, setCatFilter,
    regionFilter, setRegionFilter,
    countryFilter, setCountryFilter,
    imageTypeFilter, setImageTypeFilter,
    uploadTypeFilter, setUploadTypeFilter,
    generatedMethodFilter, setGeneratedMethodFilter,
    clearAllFilters
  } = useFilterContext();

  // Sync local search input with context search value
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  return (
    <div className="mb-6 space-y-4">
      {/* Layer 1: Search, Filter Button, Clear Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2">
          <Button
            name="toggle-filters"
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
            className="whitespace-nowrap"
            title={showFilters ? 'Hide Filters' : 'Show Filters'}
          >
            <FilterLineIcon className="w-4 h-4" />
          </Button>
        </Container>

        <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2 flex-1 min-w-[300px]">
          <TextInput
            name="search"
            placeholder="Search"
            value={searchInput}
            onChange={(v) => setSearchInput(v || '')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSearch(searchInput);
              }
            }}
          />
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

      {/* Layer 2: Filter Dropdown */}
      {showFilters && (
        <div className="bg-white/20 backdrop-blur-sm rounded-md p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Container withInternalPadding className="p-2">
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

        <Container withInternalPadding className="p-2">
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

        <Container withInternalPadding className="p-2">
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

        <Container withInternalPadding className="p-2">
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

        <Container withInternalPadding className="p-2">
          <SelectInput
            name="imageType"
            placeholder={isLoadingFilters ? "Loading..." : "All Image Types"}
            options={imageTypes}
            value={imageTypeFilter || null}
            onChange={(v) => setImageTypeFilter(v as string || '')}
            keySelector={(o) => o.image_type}
            labelSelector={(o) => o.label}
            required={false}
            disabled={isLoadingFilters}
          />
        </Container>

        <Container withInternalPadding className="p-2">
          <SelectInput
            name="uploadType"
            placeholder="All Upload Types"
            options={[
              { key: 'single', label: 'Single Upload' },
              { key: 'multiple', label: 'Multiple Upload' }
            ]}
            value={uploadTypeFilter || null}
            onChange={(v) => setUploadTypeFilter(v as string || '')}
            keySelector={(o) => o.key}
            labelSelector={(o) => o.label}
            required={false}
            disabled={false}
          />
        </Container>

        <Container withInternalPadding className="p-2">
          <SelectInput
            name="generatedMethod"
            placeholder="All Generated Methods"
            options={[
              { key: 'manual', label: 'Manual' },
              { key: 'generated', label: 'Generated' }
            ]}
            value={generatedMethodFilter || null}
            onChange={(v) => setGeneratedMethodFilter(v as string || '')}
            keySelector={(o) => o.key}
            labelSelector={(o) => o.label}
            required={false}
            disabled={false}
          />
        </Container>
          </div>
        </div>
      )}
    </div>
  );
}
