import React from 'react';
import { render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, beforeEach, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { FilterProvider } from '../../contexts/FilterContext';
import { AdminProvider } from '../../contexts/AdminContext';
import HeaderNav from '../../components/HeaderNav';
import FilterBar from '../../components/FilterBar';
import ExportModal from '../../components/ExportModal';
import HelpPage from '../../pages/HelpPage';

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockUseLocation = vi.fn();

vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useNavigate: () => mockNavigate,
  useLocation: () => mockUseLocation(),
}));

// Mock the useFilterContext hook
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

// Mock the useAdminContext hook
const mockUseAdminContext = {
  isAdmin: true,
  login: vi.fn(),
  logout: vi.fn(),
};

vi.mock('../../hooks/useFilterContext', () => ({
  useFilterContext: () => mockUseFilterContext,
}));

vi.mock('../../hooks/useAdminContext', () => ({
  useAdminContext: () => mockUseAdminContext,
}));

// Mock JSZip
vi.mock('jszip', () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(() => ({
    file: vi.fn(),
    generateAsync: vi.fn().mockResolvedValue('mock-zip-data'),
  })),
}));

describe('App Workflow Integration', () => {
  const mockProps = {
    sources: [{ s_code: 'WFP', label: 'World Food Programme' }, { s_code: 'IFRC', label: 'IFRC' }],
    types: [{ t_code: 'EARTHQUAKE', label: 'Earthquake' }, { t_code: 'FLOOD', label: 'Flood' }],
    regions: [{ r_code: 'ASIA', label: 'Asia' }, { r_code: 'AFRICA', label: 'Africa' }],
    countries: [{ c_code: 'BD', label: 'Bangladesh', r_code: 'ASIA' }, { c_code: 'IN', label: 'India', r_code: 'ASIA' }],
    imageTypes: [{ image_type: 'SATELLITE', label: 'Satellite' }, { image_type: 'AERIAL', label: 'Aerial' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocation.mockReturnValue({ pathname: '/' });
  });

  test('Complete user workflow: navigate, filter, and export', async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();
    const mockOnExport = vi.fn();
    
    render(
      <BrowserRouter>
        <FilterProvider>
          <AdminProvider>
            <HeaderNav />
            <FilterBar {...mockProps} />
            <ExportModal
              isOpen={true}
              onClose={mockOnClose}
              onExport={mockOnExport}
              filteredCount={2}
              totalCount={10}
              hasFilters={true}
              crisisMapsCount={1}
              droneImagesCount={1}
              variant="bulk"
            />
          </AdminProvider>
        </FilterProvider>
      </BrowserRouter>
    );

    // Step 1: Navigate to help page
    const helpButton = screen.getByRole('button', { name: /help/i });
    await user.click(helpButton);
    expect(mockNavigate).toHaveBeenCalledWith('/help');

    // Step 2: Apply filters
    const sourceInput = screen.getByPlaceholderText('All Sources');
    const categoryInput = screen.getByPlaceholderText('All Categories');
    
    await user.click(sourceInput);
    const wfpOption = screen.getByText('World Food Programme');
    await user.click(wfpOption);
    expect(mockUseFilterContext.setSrcFilter).toHaveBeenCalledWith('WFP');

    await user.click(categoryInput);
    const earthquakeOption = screen.getByText('Earthquake');
    await user.click(earthquakeOption);
    expect(mockUseFilterContext.setCatFilter).toHaveBeenCalledWith('EARTHQUAKE');

    // Step 3: Check export modal
    expect(screen.getByText(/Crisis Maps/i)).toBeInTheDocument();
    expect(screen.getByText(/Drone Images/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export selected/i })).toBeInTheDocument();
  });

  test('Admin workflow: access admin features and manage data', async () => {
    // Mock admin state
    mockUseAdminContext.isAdmin = true;
    
    render(
      <BrowserRouter>
        <FilterProvider>
          <AdminProvider>
            <HeaderNav />
            <ExportModal
              isOpen={true}
              onClose={vi.fn()}
              onExport={vi.fn()}
              filteredCount={1}
              totalCount={10}
              hasFilters={true}
              crisisMapsCount={1}
              droneImagesCount={0}
              variant="bulk"
            />
          </AdminProvider>
        </FilterProvider>
      </BrowserRouter>
    );

    // Step 1: Check admin navigation
    const adminButton = screen.getByRole('button', { name: /dev/i });
    expect(adminButton).toBeInTheDocument();

    // Step 2: Check admin export features
    expect(screen.getByText(/Export Dataset/i)).toBeInTheDocument();
    expect(screen.getByText(/Crisis Maps/i)).toBeInTheDocument();
    expect(screen.getByText(/Drone Images/i)).toBeInTheDocument();
  });

  test('Filter workflow: apply and clear filters', async () => {
    const user = userEvent.setup();
    
    render(
      <BrowserRouter>
        <FilterProvider>
          <AdminProvider>
            <FilterBar {...mockProps} />
          </AdminProvider>
        </FilterProvider>
      </BrowserRouter>
    );

    // Step 1: Apply multiple filters
    const sourceInput = screen.getByPlaceholderText('All Sources');
    const categoryInput = screen.getByPlaceholderText('All Categories');
    
    await user.click(sourceInput);
    const ifrcOption = screen.getByText('IFRC');
    await user.click(ifrcOption);
    
    await user.click(categoryInput);
    const floodOption = screen.getByText('Flood');
    await user.click(floodOption);

    // Step 2: Verify filters are set
    expect(mockUseFilterContext.setSrcFilter).toHaveBeenCalledWith('IFRC');
    expect(mockUseFilterContext.setCatFilter).toHaveBeenCalledWith('FLOOD');

    // Step 3: Clear all filters
    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);
    
    expect(mockUseFilterContext.clearAllFilters).toHaveBeenCalled();
  });

  test('Navigation workflow: move between different pages', async () => {
    const user = userEvent.setup();
    
    render(
      <BrowserRouter>
        <FilterProvider>
          <AdminProvider>
            <HeaderNav />
            <HelpPage />
          </AdminProvider>
        </FilterProvider>
      </BrowserRouter>
    );

    // Step 1: Navigate to help page
    const helpButton = screen.getByRole('button', { name: /help/i });
    await user.click(helpButton);
    expect(mockNavigate).toHaveBeenCalledWith('/help');

    // Step 2: Check that help page is rendered
    expect(screen.getByRole('heading', { name: /Introduction/i })).toBeInTheDocument();
  });

  test('Context integration: filters and admin state work together', () => {
    // Mock admin state
    mockUseAdminContext.isAdmin = true;
    
    render(
      <BrowserRouter>
        <FilterProvider>
          <AdminProvider>
            <HeaderNav />
            <FilterBar {...mockProps} />
            <ExportModal
              isOpen={true}
              onClose={vi.fn()}
              onExport={vi.fn()}
              filteredCount={1}
              totalCount={10}
              hasFilters={true}
              crisisMapsCount={1}
              droneImagesCount={0}
              variant="bulk"
            />
          </AdminProvider>
        </FilterProvider>
      </BrowserRouter>
    );

    // Check that admin features are available
    expect(screen.getByRole('button', { name: /dev/i })).toBeInTheDocument();
    expect(screen.getByText(/Export Dataset/i)).toBeInTheDocument();

    // Check that filter functionality is available
    expect(screen.getByPlaceholderText('All Sources')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('All Categories')).toBeInTheDocument();
  });

  test('Error handling workflow: handle missing data gracefully', () => {
    render(
      <BrowserRouter>
        <FilterProvider>
          <AdminProvider>
            <ExportModal
              isOpen={true}
              onClose={vi.fn()}
              onExport={vi.fn()}
              filteredCount={0}
              totalCount={10}
              hasFilters={true}
              crisisMapsCount={0}
              droneImagesCount={0}
              variant="bulk"
            />
          </AdminProvider>
        </FilterProvider>
      </BrowserRouter>
    );

    // Check that empty state is handled gracefully
    expect(screen.getByText(/Crisis Maps \(0 images\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Drone Images \(0 images\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export selected/i })).toBeInTheDocument();
  });
});
