import { render, screen, fireEvent } from '../test-utils'
import { describe, it, expect, vi } from 'vitest'
import FilterBar from '../../components/FilterBar'

// Mock the useFilterContext hook
vi.mock('../../hooks/useFilterContext', () => ({
  useFilterContext: () => ({
    search: '',
    setSearch: vi.fn(),
    srcFilter: '',
    setSrcFilter: vi.fn(),
    catFilter: '',
    setCatFilter: vi.fn(),
    regionFilter: '',
    setRegionFilter: vi.fn(),
    countryFilter: '',
    setCountryFilter: vi.fn(),
    imageTypeFilter: '',
    setImageTypeFilter: vi.fn(),
    showReferenceExamples: false,
    setShowReferenceExamples: vi.fn(),
    clearAllFilters: vi.fn()
  })
}))

const mockProps = {
  sources: [{ s_code: 'test', label: 'Test Source' }],
  types: [{ t_code: 'test', label: 'Test Type' }],
  regions: [{ r_code: 'test', label: 'Test Region' }],
  countries: [{ c_code: 'test', label: 'Test Country', r_code: 'test' }],
  imageTypes: [{ image_type: 'test', label: 'Test Image Type' }]
}

describe('FilterBar', () => {
  it('renders filter controls', () => {
    render(<FilterBar {...mockProps} />)
    expect(screen.getByPlaceholderText('Search examples...')).toBeInTheDocument()
    expect(screen.getByText('Reference Examples')).toBeInTheDocument()
    expect(screen.getByText('Clear Filters')).toBeInTheDocument()
  })

  it('renders all filter inputs', () => {
    render(<FilterBar {...mockProps} />)
    expect(screen.getByPlaceholderText('All Sources')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('All Categories')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('All Regions')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('All Countries')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('All Image Types')).toBeInTheDocument()
  })

  it('shows loading state when isLoadingFilters is true', () => {
    render(<FilterBar {...mockProps} isLoadingFilters={true} />)
    const loadingInputs = screen.getAllByPlaceholderText('Loading...')
    expect(loadingInputs.length).toBeGreaterThan(0)
  })
})
