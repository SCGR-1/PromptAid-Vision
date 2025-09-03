import React, { createContext, useState } from 'react';
import type { ReactNode } from 'react';

interface FilterContextType {
  // Search and filter state
  search: string;
  srcFilter: string;
  catFilter: string;
  regionFilter: string;
  countryFilter: string;
  imageTypeFilter: string;
  uploadTypeFilter: string;
  showReferenceExamples: boolean;
  
  // Setter functions
  setSearch: (value: string) => void;
  setSrcFilter: (value: string) => void;
  setCatFilter: (value: string) => void;
  setRegionFilter: (value: string) => void;
  setCountryFilter: (value: string) => void;
  setImageTypeFilter: (value: string) => void;
  setUploadTypeFilter: (value: string) => void;
  setShowReferenceExamples: (value: boolean) => void;
  
  // Utility function to clear all filters
  clearAllFilters: () => void;
}

export const FilterContext = createContext<FilterContextType | undefined>(undefined);

interface FilterProviderProps {
  children: ReactNode;
}

export const FilterProvider: React.FC<FilterProviderProps> = ({ children }) => {
  const [search, setSearch] = useState('');
  const [srcFilter, setSrcFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [imageTypeFilter, setImageTypeFilter] = useState('');
  const [uploadTypeFilter, setUploadTypeFilter] = useState('');
  const [showReferenceExamples, setShowReferenceExamples] = useState(false);

  const clearAllFilters = () => {
    setSearch('');
    setSrcFilter('');
    setCatFilter('');
    setRegionFilter('');
    setCountryFilter('');
    setImageTypeFilter('');
    setUploadTypeFilter('');
    setShowReferenceExamples(false);
  };

  const value: FilterContextType = {
    search,
    srcFilter,
    catFilter,
    regionFilter,
    countryFilter,
    imageTypeFilter,
    uploadTypeFilter,
    showReferenceExamples,
    setSearch,
    setSrcFilter,
    setCatFilter,
    setRegionFilter,
    setCountryFilter,
    setImageTypeFilter,
    setUploadTypeFilter,
    setShowReferenceExamples,
    clearAllFilters,
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};


