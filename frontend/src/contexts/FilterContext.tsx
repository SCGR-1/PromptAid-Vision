import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface FilterContextType {
  // Search and filter state
  search: string;
  srcFilter: string;
  catFilter: string;
  regionFilter: string;
  countryFilter: string;
  imageTypeFilter: string;
  showReferenceExamples: boolean;
  
  // Setter functions
  setSearch: (value: string) => void;
  setSrcFilter: (value: string) => void;
  setCatFilter: (value: string) => void;
  setRegionFilter: (value: string) => void;
  setCountryFilter: (value: string) => void;
  setImageTypeFilter: (value: string) => void;
  setShowReferenceExamples: (value: boolean) => void;
  
  // Utility function to clear all filters
  clearAllFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const useFilterContext = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilterContext must be used within a FilterProvider');
  }
  return context;
};

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
  const [showReferenceExamples, setShowReferenceExamples] = useState(false);

  const clearAllFilters = () => {
    setSearch('');
    setSrcFilter('');
    setCatFilter('');
    setRegionFilter('');
    setCountryFilter('');
    setImageTypeFilter('');
    setShowReferenceExamples(false);
  };

  const value: FilterContextType = {
    search,
    srcFilter,
    catFilter,
    regionFilter,
    countryFilter,
    imageTypeFilter,
    showReferenceExamples,
    setSearch,
    setSrcFilter,
    setCatFilter,
    setRegionFilter,
    setCountryFilter,
    setImageTypeFilter,
    setShowReferenceExamples,
    clearAllFilters,
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};
