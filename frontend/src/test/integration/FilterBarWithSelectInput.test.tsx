import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, beforeEach, expect } from 'vitest';
import { FilterProvider } from '../../contexts/FilterContext';
import FilterBar from '../../components/FilterBar';

// Mock the FilterContext hook
const mockUseFilterContext = {
  search: '',
  srcFilter: '',
  catFilter: '',
  regionFilter: '',
  countryFilter: '',
  imageTypeFilter: '',
  showReferenceExamples: false,
  setSearch: vi.fn(),
  setSrcFilter: vi.fn(),
  setCatFilter: vi.fn(),
  setRegionFilter: vi.fn(),
  setCountryFilter: vi.fn(),
  setImageTypeFilter: vi.fn(),
  setShowReferenceExamples: vi.fn(),
  clearAllFilters: vi.fn(),
};

vi.mock('../../hooks/useFilterContext', () => ({
  useFilterContext: () => mockUseFilterContext,
}));

describe('FilterBar + SelectInput Integration', () => {
  const mockProps = {
    sources: [
      { s_code: 'WFP', label: 'World Food Programme' },
      { s_code: 'IFRC', label: 'IFRC' },
      { s_code: 'UNICEF', label: 'UNICEF' }
    ],
    types: [
      { t_code: 'EARTHQUAKE', label: 'Earthquake' },
      { t_code: 'FLOOD', label: 'Flood' },
      { t_code: 'DROUGHT', label: 'Drought' }
    ],
    regions: [
      { r_code: 'ASIA', label: 'Asia' },
      { r_code: 'AFRICA', label: 'Africa' },
      { r_code: 'EUROPE', label: 'Europe' }
    ],
    countries: [
      { c_code: 'BD', label: 'Bangladesh', r_code: 'ASIA' },
      { c_code: 'IN', label: 'India', r_code: 'ASIA' },
      { c_code: 'KE', label: 'Kenya', r_code: 'AFRICA' }
    ],
    imageTypes: [
      { image_type: 'SATELLITE', label: 'Satellite' },
      { image_type: 'AERIAL', label: 'Aerial' },
      { image_type: 'GROUND', label: 'Ground' }
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FilterBar renders all SelectInput components with correct options', () => {
    render(
      <FilterProvider>
        <FilterBar {...mockProps} />
      </FilterProvider>
    );

    // Check that all filter inputs are rendered
    expect(screen.getByPlaceholderText('All Sources')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('All Categories')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('All Regions')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('All Countries')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('All Image Types')).toBeInTheDocument();
  });

  test('FilterBar passes correct options to SelectInput components', async () => {
    const user = userEvent.setup();
    
    render(
      <FilterProvider>
        <FilterBar {...mockProps} />
      </FilterProvider>
    );

    // Open source dropdown
    const sourceInput = screen.getByPlaceholderText('All Sources');
    await user.click(sourceInput);

    // Check that all source options are available
    expect(screen.getByText('World Food Programme')).toBeInTheDocument();
    expect(screen.getByText('IFRC')).toBeInTheDocument();
    expect(screen.getByText('UNICEF')).toBeInTheDocument();

    // Open category dropdown
    const categoryInput = screen.getByPlaceholderText('All Categories');
    await user.click(categoryInput);

    // Check that all category options are available
    expect(screen.getByText('Earthquake')).toBeInTheDocument();
    expect(screen.getByText('Flood')).toBeInTheDocument();
    expect(screen.getByText('Drought')).toBeInTheDocument();
  });

  test('FilterBar handles SelectInput selections correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <FilterProvider>
        <FilterBar {...mockProps} />
      </FilterProvider>
    );

    // Select a source
    const sourceInput = screen.getByPlaceholderText('All Sources');
    await user.click(sourceInput);
    const wfpOption = screen.getByText('World Food Programme');
    await user.click(wfpOption);
    expect(mockUseFilterContext.setSrcFilter).toHaveBeenCalledWith('WFP');

    // Select a category
    const categoryInput = screen.getByPlaceholderText('All Categories');
    await user.click(categoryInput);
    const earthquakeOption = screen.getByText('Earthquake');
    await user.click(earthquakeOption);
    expect(mockUseFilterContext.setCatFilter).toHaveBeenCalledWith('EARTHQUAKE');

    // Select a region
    const regionInput = screen.getByPlaceholderText('All Regions');
    await user.click(regionInput);
    const asiaOption = screen.getByText('Asia');
    await user.click(asiaOption);
    expect(mockUseFilterContext.setRegionFilter).toHaveBeenCalledWith('ASIA');
  });

  test('FilterBar clears all SelectInput selections when clear button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <FilterProvider>
        <FilterBar {...mockProps} />
      </FilterProvider>
    );

    // Set some filters first
    const sourceInput = screen.getByPlaceholderText('All Sources');
    await user.click(sourceInput);
    const wfpOption = screen.getByText('World Food Programme');
    await user.click(wfpOption);

    const categoryInput = screen.getByPlaceholderText('All Categories');
    await user.click(categoryInput);
    const earthquakeOption = screen.getByText('Earthquake');
    await user.click(earthquakeOption);

    // Click clear button
    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);

    // All filters should be cleared
    expect(mockUseFilterContext.clearAllFilters).toHaveBeenCalled();
  });

  test('FilterBar shows loading state in SelectInput components', () => {
    render(
      <FilterProvider>
        <FilterBar {...mockProps} isLoadingFilters={true} />
      </FilterProvider>
    );

    // Check that loading placeholders are shown
    const loadingInputs = screen.getAllByPlaceholderText('Loading...');
    expect(loadingInputs.length).toBeGreaterThan(0);
  });

  test('FilterBar handles empty options gracefully', () => {
    const emptyProps = {
      sources: [],
      types: [],
      regions: [],
      countries: [],
      imageTypes: [],
    };

    render(
      <FilterProvider>
        <FilterBar {...emptyProps} />
      </FilterProvider>
    );

    // Should still render the filter inputs
    expect(screen.getByPlaceholderText('All Sources')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('All Categories')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('All Regions')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('All Countries')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('All Image Types')).toBeInTheDocument();
  });

  test('FilterBar maintains filter state across re-renders', async () => {
    const user = userEvent.setup();
    
    const { rerender } = render(
      <FilterProvider>
        <FilterBar {...mockProps} />
      </FilterProvider>
    );

    // Set a filter
    const sourceInput = screen.getByPlaceholderText('All Sources');
    await user.click(sourceInput);
    const wfpOption = screen.getByText('World Food Programme');
    await user.click(wfpOption);
    expect(mockUseFilterContext.setSrcFilter).toHaveBeenCalledWith('WFP');

    // Re-render with same props
    rerender(
      <FilterProvider>
        <FilterBar {...mockProps} />
      </FilterProvider>
    );

    // Filter state should be maintained
    expect(mockUseFilterContext.setSrcFilter).toHaveBeenCalledTimes(1);
  });
});
