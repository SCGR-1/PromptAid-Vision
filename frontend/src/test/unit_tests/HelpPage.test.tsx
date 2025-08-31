import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import HelpPage from '../../pages/HelpPage'

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

// Mock the useFilterContext hook
vi.mock('../../hooks/useFilterContext', () => ({
  useFilterContext: () => ({
    setShowReferenceExamples: vi.fn(),
  }),
}))

describe('HelpPage', () => {
  it('renders the help page title and sections', () => {
    render(<HelpPage />)
    
    // Check main sections
    expect(screen.getByText('Introduction')).toBeInTheDocument()
    expect(screen.getByText('Guidelines')).toBeInTheDocument()
    expect(screen.getByText('VLMs')).toBeInTheDocument()
    expect(screen.getByText('Dataset')).toBeInTheDocument()
    expect(screen.getByText('Contact us')).toBeInTheDocument()
  })

  it('displays introduction content', () => {
    render(<HelpPage />)
    
    expect(screen.getByText(/PromptAid Vision is a tool that generates textual descriptions/)).toBeInTheDocument()
    expect(screen.getByText(/This prototype is for collecting data for the fine-tuning/)).toBeInTheDocument()
  })

  it('displays guidelines list', () => {
    render(<HelpPage />)
    
    expect(screen.getByText(/Avoid uploading images that are not crisis maps/)).toBeInTheDocument()
    expect(screen.getByText(/Confirm the image details prior to modifying/)).toBeInTheDocument()
    expect(screen.getByText(/Before the modification, please read the description/)).toBeInTheDocument()
    expect(screen.getByText(/Click the "Submit" button to save the description/)).toBeInTheDocument()
  })

  it('displays VLM information', () => {
    render(<HelpPage />)
    
    expect(screen.getByText(/PromptAid Vision uses a variety of Visual Language Models/)).toBeInTheDocument()
    expect(screen.getByText(/A random VLM is selected for each upload/)).toBeInTheDocument()
  })

  it('displays dataset information', () => {
    render(<HelpPage />)
    
    expect(screen.getByText(/All users are able to export the dataset/)).toBeInTheDocument()
    expect(screen.getByText(/You could apply filters when exporting/)).toBeInTheDocument()
  })

  it('displays contact information', () => {
    render(<HelpPage />)
    
    expect(screen.getByText(/Need help or have questions about PromptAid Vision/)).toBeInTheDocument()
    expect(screen.getByText(/Our team is here to support you/)).toBeInTheDocument()
  })

  it('contains action buttons', () => {
    render(<HelpPage />)
    
    expect(screen.getByRole('button', { name: /upload now/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /see examples/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /view vlm details/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /export dataset/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /get in touch/i })).toBeInTheDocument()
  })

  it('renders all help sections with proper structure', () => {
    render(<HelpPage />)
    
    // Check that all sections have content
    const sections = screen.getAllByRole('heading', { level: 3 })
    expect(sections).toHaveLength(5)
    
    // Verify section titles
    const sectionTitles = sections.map(section => section.textContent)
    expect(sectionTitles).toContain('Introduction')
    expect(sectionTitles).toContain('Guidelines')
    expect(sectionTitles).toContain('VLMs')
    expect(sectionTitles).toContain('Dataset')
    expect(sectionTitles).toContain('Contact us')
  })
})
