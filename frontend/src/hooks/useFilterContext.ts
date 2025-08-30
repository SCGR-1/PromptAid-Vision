import { useContext } from 'react';
import { FilterContext } from '../contexts/FilterContext';

export const useFilterContext = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilterContext must be used within a FilterProvider');
  }
  return context;
};
