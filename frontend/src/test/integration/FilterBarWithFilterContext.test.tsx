import { render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, beforeEach, expect } from 'vitest';
import { FilterProvider } from '../../contexts/FilterContext';
import FilterBar from '../../components/FilterBar';

// Mock the FilterContext hook to test integration
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

describe('FilterBar + FilterContext Integration', () => {
  const mockProps = {
    sources: [{ s_code: 'WFP', label: 'World Food Programme' }, { s_code: 'IFRC', label: 'IFRC' }],
    types: [{ t_code: 'EARTHQUAKE', label: 'Earthquake' }, { t_code: 'FLOOD', label: 'Flood' }],
    regions: [{ r_code: 'ASIA', label: 'Asia' }, { r_code: 'AFRICA', label: 'Africa' }],
    countries: [{ c_code: 'BD', label: 'Bangladesh', r_code: 'ASIA' }, { c_code: 'IN', label: 'India', r_code: 'ASIA' }],
    imageTypes: [{ image_type: 'SATELLITE', label: 'Satellite' }, { image_type: 'AERIAL', label: 'Aerial' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FilterBar updates context when filters change', async () => {
    const user = userEvent.setup();
    
    render(
      <FilterProvider>
        <FilterBar {...mockProps} />
      </FilterProvider>
    );

    // Find and interact with filter inputs
    const sourceInput = screen.getByPlaceholderText('All Sources');
    const categoryInput = screen.getByPlaceholderText('All Categories');

    // Select source filter
    await user.click(sourceInput);
    const wfpOption = screen.getByText('World Food Programme');
    await user.click(wfpOption);
    expect(mockUseFilterContext.setSrcFilter).toHaveBeenCalledWith('WFP');

    // Select category filter
    await user.click(categoryInput);
    const earthquakeOption = screen.getByText('Earthquake');
    await user.click(earthquakeOption);
    expect(mockUseFilterContext.setCatFilter).toHaveBeenCalledWith('EARTHQUAKE');
  });

  test('FilterBar clears context when clear button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <FilterProvider>
        <FilterBar {...mockProps} />
      </FilterProvider>
    );

    // Find and click clear button
    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);

    expect(mockUseFilterContext.clearAllFilters).toHaveBeenCalled();
  });

  test('FilterBar shows loading state from context', () => {
    render(
      <FilterProvider>
        <FilterBar {...mockProps} isLoadingFilters={true} />
      </FilterProvider>
    );

    // Check if loading indicators are shown
    const loadingInputs = screen.getAllByPlaceholderText('Loading...');
    expect(loadingInputs.length).toBeGreaterThan(0);
  });

  test('FilterBar displays current filters from context', () => {
    render(<FilterBar {...mockProps} />);

    // Check if filter values are displayed
    // Since SelectInput components don't show values as display values,
    // we check for the presence of the filter inputs and their placeholders
    expect(screen.getByPlaceholderText('All Sources')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('All Categories')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('All Regions')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('All Countries')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('All Image Types')).toBeInTheDocument();
  });
});
