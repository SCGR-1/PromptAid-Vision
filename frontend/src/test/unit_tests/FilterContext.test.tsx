import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FilterProvider } from '../../contexts/FilterContext'
import { useFilterContext } from '../../hooks/useFilterContext'

// Test component to access context
const TestComponent = () => {
  const {
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
  } = useFilterContext()

  return (
    <div>
      <div data-testid="search">{search}</div>
      <div data-testid="srcFilter">{srcFilter}</div>
      <div data-testid="catFilter">{catFilter}</div>
      <div data-testid="regionFilter">{regionFilter}</div>
      <div data-testid="countryFilter">{countryFilter}</div>
      <div data-testid="imageTypeFilter">{imageTypeFilter}</div>
      <div data-testid="showReferenceExamples">{showReferenceExamples.toString()}</div>
      
      <button onClick={() => setSearch('test search')}>Set Search</button>
      <button onClick={() => setSrcFilter('test source')}>Set Source</button>
      <button onClick={() => setCatFilter('test category')}>Set Category</button>
      <button onClick={() => setRegionFilter('test region')}>Set Region</button>
      <button onClick={() => setCountryFilter('test country')}>Set Country</button>
      <button onClick={() => setImageTypeFilter('test image type')}>Set Image Type</button>
      <button onClick={() => setShowReferenceExamples(true)}>Show Examples</button>
      <button onClick={clearAllFilters}>Clear All</button>
    </div>
  )
}

describe('FilterContext', () => {
  it('provides initial state values', () => {
    render(
      <FilterProvider>
        <TestComponent />
      </FilterProvider>
    )

    expect(screen.getByTestId('search')).toHaveTextContent('')
    expect(screen.getByTestId('srcFilter')).toHaveTextContent('')
    expect(screen.getByTestId('catFilter')).toHaveTextContent('')
    expect(screen.getByTestId('regionFilter')).toHaveTextContent('')
    expect(screen.getByTestId('countryFilter')).toHaveTextContent('')
    expect(screen.getByTestId('imageTypeFilter')).toHaveTextContent('')
    expect(screen.getByTestId('showReferenceExamples')).toHaveTextContent('false')
  })

  it('updates search state when setSearch is called', () => {
    render(
      <FilterProvider>
        <TestComponent />
      </FilterProvider>
    )

    const setSearchButton = screen.getByText('Set Search')
    fireEvent.click(setSearchButton)

    expect(screen.getByTestId('search')).toHaveTextContent('test search')
  })

  it('updates source filter state when setSrcFilter is called', () => {
    render(
      <FilterProvider>
        <TestComponent />
      </FilterProvider>
    )

    const setSourceButton = screen.getByText('Set Source')
    fireEvent.click(setSourceButton)

    expect(screen.getByTestId('srcFilter')).toHaveTextContent('test source')
  })

  it('updates category filter state when setCatFilter is called', () => {
    render(
      <FilterProvider>
        <TestComponent />
      </FilterProvider>
    )

    const setCategoryButton = screen.getByText('Set Category')
    fireEvent.click(setCategoryButton)

    expect(screen.getByTestId('catFilter')).toHaveTextContent('test category')
  })

  it('updates region filter state when setRegionFilter is called', () => {
    render(
      <FilterProvider>
        <TestComponent />
      </FilterProvider>
    )

    const setRegionButton = screen.getByText('Set Region')
    fireEvent.click(setRegionButton)

    expect(screen.getByTestId('regionFilter')).toHaveTextContent('test region')
  })

  it('updates country filter state when setCountryFilter is called', () => {
    render(
      <FilterProvider>
        <TestComponent />
      </FilterProvider>
    )

    const setCountryButton = screen.getByText('Set Country')
    fireEvent.click(setCountryButton)

    expect(screen.getByTestId('countryFilter')).toHaveTextContent('test country')
  })

  it('updates image type filter state when setImageTypeFilter is called', () => {
    render(
      <FilterProvider>
        <TestComponent />
      </FilterProvider>
    )

    const setImageTypeButton = screen.getByText('Set Image Type')
    fireEvent.click(setImageTypeButton)

    expect(screen.getByTestId('imageTypeFilter')).toHaveTextContent('test image type')
  })

  it('updates show reference examples state when setShowReferenceExamples is called', () => {
    render(
      <FilterProvider>
        <TestComponent />
      </FilterProvider>
    )

    const showExamplesButton = screen.getByText('Show Examples')
    fireEvent.click(showExamplesButton)

    expect(screen.getByTestId('showReferenceExamples')).toHaveTextContent('true')
  })

  it('clears all filters when clearAllFilters is called', () => {
    render(
      <FilterProvider>
        <TestComponent />
      </FilterProvider>
    )

    // Set some values first
    fireEvent.click(screen.getByText('Set Search'))
    fireEvent.click(screen.getByText('Set Source'))
    fireEvent.click(screen.getByText('Show Examples'))

    // Verify values are set
    expect(screen.getByTestId('search')).toHaveTextContent('test search')
    expect(screen.getByTestId('srcFilter')).toHaveTextContent('test source')
    expect(screen.getByTestId('showReferenceExamples')).toHaveTextContent('true')

    // Clear all filters
    const clearAllButton = screen.getByText('Clear All')
    fireEvent.click(clearAllButton)

    // Verify all values are cleared
    expect(screen.getByTestId('search')).toHaveTextContent('')
    expect(screen.getByTestId('srcFilter')).toHaveTextContent('')
    expect(screen.getByTestId('catFilter')).toHaveTextContent('')
    expect(screen.getByTestId('regionFilter')).toHaveTextContent('')
    expect(screen.getByTestId('countryFilter')).toHaveTextContent('')
    expect(screen.getByTestId('imageTypeFilter')).toHaveTextContent('')
    expect(screen.getByTestId('showReferenceExamples')).toHaveTextContent('false')
  })
})
