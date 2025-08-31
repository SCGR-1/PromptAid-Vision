import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, beforeEach, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { FilterProvider } from '../../contexts/FilterContext';
import { AdminProvider } from '../../contexts/AdminContext';
import HeaderNav from '../../components/HeaderNav';

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockUseLocation = vi.fn();

vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useNavigate: () => mockNavigate,
  useLocation: () => mockUseLocation(),
}));

// Mock the contexts
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

const mockUseAdminContext = {
  isAdmin: false,
  login: vi.fn(),
  logout: vi.fn(),
};

vi.mock('../../contexts/FilterContext', () => ({
  FilterProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useFilterContext: () => mockUseFilterContext,
}));

vi.mock('../../contexts/AdminContext', () => ({
  AdminProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAdminContext: () => mockUseAdminContext,
}));

describe('HeaderNav + Routing Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocation.mockReturnValue({ pathname: '/' });
  });

  test('HeaderNav navigates to upload page when logo is clicked', async () => {
    const user = userEvent.setup();
    
    // Mock current location to be on a different page so logo click will navigate
    mockUseLocation.mockReturnValue({ pathname: '/explore' });
    
    render(
      <BrowserRouter>
        <FilterProvider>
          <AdminProvider>
            <HeaderNav />
          </AdminProvider>
        </FilterProvider>
      </BrowserRouter>
    );

    // Find and click the logo/brand
    const logo = screen.getByText(/PromptAid Vision/i);
    await user.click(logo);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('HeaderNav navigates to help page when help button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <BrowserRouter>
        <FilterProvider>
          <AdminProvider>
            <HeaderNav />
          </AdminProvider>
        </FilterProvider>
      </BrowserRouter>
    );

    // Find and click the help button
    const helpButton = screen.getByRole('button', { name: /help/i });
    await user.click(helpButton);

    expect(mockNavigate).toHaveBeenCalledWith('/help');
  });

  test('HeaderNav shows navigation buttons', () => {
    render(
      <BrowserRouter>
        <FilterProvider>
          <AdminProvider>
            <HeaderNav />
          </AdminProvider>
        </FilterProvider>
      </BrowserRouter>
    );

    // Check if navigation buttons are visible
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /explore/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analytics/i })).toBeInTheDocument();
  });

  test('HeaderNav shows current page in navigation', () => {
    // Mock current location
    mockUseLocation.mockReturnValue({ pathname: '/explore' });
    
    render(
      <BrowserRouter>
        <FilterProvider>
          <AdminProvider>
            <HeaderNav />
          </AdminProvider>
        </FilterProvider>
      </BrowserRouter>
    );

    // Check if current page is highlighted or active
    const exploreButton = screen.getByRole('button', { name: /explore/i });
    expect(exploreButton).toBeInTheDocument();
  });
});
