import React from 'react';
import { Container, TextInput, SelectInput, MultiSelectInput, Button } from '@ifrc-go/ui';
import { useFilterContext } from '../contexts/FilterContext';
import styles from './FilterBar.module.css';

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
  const {
    search, setSearch,
    srcFilter, setSrcFilter,
    catFilter, setCatFilter,
    regionFilter, setRegionFilter,
    countryFilter, setCountryFilter,
    imageTypeFilter, setImageTypeFilter,
    showReferenceExamples, setShowReferenceExamples,
    clearAllFilters
  } = useFilterContext();

  return (
    <div className="mb-6 space-y-4">
      {/* Layer 1: Search, Reference Examples, Clear Filters */}
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
          <Button
            name="reference-examples"
            variant={showReferenceExamples ? "primary" : "secondary"}
            onClick={() => setShowReferenceExamples(!showReferenceExamples)}
            className="whitespace-nowrap"
          >
            <span className="mr-2">
              {showReferenceExamples ? "★" : "☆"}
            </span>
            Reference Examples
          </Button>
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

      {/* Layer 2: 5 Filter Bars */}
      <div className="flex flex-wrap items-center gap-4">
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

        <Container withInternalPadding className="bg-white/20 backdrop-blur-sm rounded-md p-2">
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
      </div>
    </div>
  );
}
