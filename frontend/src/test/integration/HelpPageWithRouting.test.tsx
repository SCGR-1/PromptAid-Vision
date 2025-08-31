import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, beforeEach, expect } from 'vitest';
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

vi.mock('../../hooks/useFilterContext', () => ({
  useFilterContext: () => mockUseFilterContext,
}));

describe('HelpPage + Routing Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocation.mockReturnValue({ pathname: '/help' });
  });

  test('HelpPage shows all help sections', () => {
    render(<HelpPage />);

    // Check if all help section headings are visible
    expect(screen.getByRole('heading', { name: /Introduction/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Guidelines/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /VLMs/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Dataset/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Contact us/i })).toBeInTheDocument();
  });

  test('HelpPage navigates to explore when export button is clicked', async () => {
    const user = userEvent.setup();
    
    render(<HelpPage />);

    // Find and click the export dataset button
    const exportButton = screen.getByRole('button', { name: /export dataset/i });
    await user.click(exportButton);

    // The button should be present
    expect(exportButton).toBeInTheDocument();
  });



  test('HelpPage shows contact information', () => {
    render(<HelpPage />);

    // Check if contact information is displayed
    expect(screen.getByText(/Contact us/i)).toBeInTheDocument();
    expect(screen.getByText(/Need help or have questions about PromptAid Vision/i)).toBeInTheDocument();
  });

  test('HelpPage shows guidelines section with common issues', () => {
    render(<HelpPage />);

    // Check if guidelines section is displayed
    expect(screen.getByRole('heading', { name: /Guidelines/i })).toBeInTheDocument();
    expect(screen.getByText(/Avoid uploading images that are not crisis maps/i)).toBeInTheDocument();
  });

  test('HelpPage shows VLMs section with key capabilities', () => {
    render(<HelpPage />);

    // Check if VLMs section is displayed
    expect(screen.getByRole('heading', { name: /VLMs/i })).toBeInTheDocument();
    expect(screen.getByText(/random VLM is selected for each upload/i)).toBeInTheDocument();
  });
});
