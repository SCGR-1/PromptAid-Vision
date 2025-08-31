import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ExportModal from '../../components/ExportModal'

describe('ExportModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    onExport: vi.fn(),
    filteredCount: 150,
    totalCount: 200,
    hasFilters: true,
    crisisMapsCount: 100,
    droneImagesCount: 50,
    isLoading: false,
    variant: 'bulk' as const,
    onNavigateToList: vi.fn(),
    onNavigateAndExport: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Bulk Export Mode', () => {
    it('renders when open', () => {
      render(<ExportModal {...mockProps} />)
      expect(screen.getByText('Export Dataset')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(<ExportModal {...mockProps} isOpen={false} />)
      expect(screen.queryByText('Export Dataset')).not.toBeInTheDocument()
    })

    it('displays export mode options', () => {
      render(<ExportModal {...mockProps} />)
      expect(screen.getByText('Standard')).toBeInTheDocument()
      expect(screen.getByText('Fine-tuning')).toBeInTheDocument()
    })

    it('shows dataset split configuration for fine-tuning mode', () => {
      render(<ExportModal {...mockProps} />)
      
      // Switch to fine-tuning mode
      const fineTuningOption = screen.getByText('Fine-tuning')
      fireEvent.click(fineTuningOption)
      
      expect(screen.getByText('Dataset Split Configuration')).toBeInTheDocument()
      expect(screen.getByLabelText('Train (%)')).toBeInTheDocument()
      expect(screen.getByLabelText('Test (%)')).toBeInTheDocument()
      expect(screen.getByLabelText('Val (%)')).toBeInTheDocument()
    })

    it('displays image type checkboxes with counts', () => {
      render(<ExportModal {...mockProps} />)
      expect(screen.getByText('Crisis Maps (100 images)')).toBeInTheDocument()
      expect(screen.getByText('Drone Images (50 images)')).toBeInTheDocument()
    })

    it('calls onClose when cancel button is clicked', () => {
      render(<ExportModal {...mockProps} />)
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)
      expect(mockProps.onClose).toHaveBeenCalled()
    })

    it('calls onExport when export button is clicked', () => {
      render(<ExportModal {...mockProps} />)
      const exportButton = screen.getByRole('button', { name: /export selected/i })
      fireEvent.click(exportButton)
      expect(mockProps.onExport).toHaveBeenCalledWith('standard', ['crisis_map', 'drone_image'])
    })
  })

  describe('Single Export Mode', () => {
    const singleProps = { ...mockProps, variant: 'single' as const }

    it('renders single export UI when variant is single', () => {
      render(<ExportModal {...singleProps} />)
      expect(screen.getByText('Export Single Item')).toBeInTheDocument()
    })

    it('shows single export message', () => {
      render(<ExportModal {...singleProps} />)
      expect(screen.getByText('This only exports the 1 item currently on display.')).toBeInTheDocument()
    })

    it('displays navigate to list button', () => {
      render(<ExportModal {...singleProps} />)
      expect(screen.getByRole('button', { name: /navigate to list view/i })).toBeInTheDocument()
    })

    it('calls onNavigateAndExport when navigate button is clicked', () => {
      render(<ExportModal {...singleProps} />)
      const navigateButton = screen.getByRole('button', { name: /navigate to list view/i })
      fireEvent.click(navigateButton)
      expect(mockProps.onNavigateAndExport).toHaveBeenCalled()
    })

    it('calls onExport when continue button is clicked', () => {
      render(<ExportModal {...singleProps} />)
      const continueButton = screen.getByRole('button', { name: /continue/i })
      fireEvent.click(continueButton)
      expect(mockProps.onExport).toHaveBeenCalledWith('standard', ['crisis_map', 'drone_image'])
    })
  })

  describe('Loading State', () => {
    it('disables checkboxes when loading', () => {
      render(<ExportModal {...mockProps} isLoading={true} />)
      const crisisMapsCheckbox = screen.getByRole('checkbox', { name: /crisis maps/i })
      const droneImagesCheckbox = screen.getByRole('checkbox', { name: /drone images/i })
      
      expect(crisisMapsCheckbox).toBeDisabled()
      expect(droneImagesCheckbox).toBeDisabled()
    })
  })
})
