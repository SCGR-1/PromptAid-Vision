import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import HeaderNav from '../../components/HeaderNav'

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

describe('HeaderNav', () => {
  it('renders without crashing', () => {
    render(<HeaderNav />)
    const navElements = screen.getAllByRole('navigation')
    expect(navElements.length).toBeGreaterThan(0)
  })

  it('contains navigation links', () => {
    render(<HeaderNav />)
    expect(screen.getByText(/explore/i)).toBeInTheDocument()
    expect(screen.getByText(/analytics/i)).toBeInTheDocument()
    expect(screen.getByText(/upload/i)).toBeInTheDocument()
  })

  it('displays the PromptAid Vision title', () => {
    render(<HeaderNav />)
    expect(screen.getByText('PromptAid Vision')).toBeInTheDocument()
  })

  it('contains help and dev buttons', () => {
    render(<HeaderNav />)
    expect(screen.getByText(/help & support/i)).toBeInTheDocument()
    expect(screen.getByText(/dev/i)).toBeInTheDocument()
  })
})
