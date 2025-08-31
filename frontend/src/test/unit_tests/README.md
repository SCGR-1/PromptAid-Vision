# Frontend Unit Tests

This directory contains unit tests for individual React components, contexts, and pages.

## Structure

```
unit_tests/
├── HeaderNav.test.tsx          # Tests for HeaderNav component
├── FilterBar.test.tsx          # Tests for FilterBar component  
├── ExportModal.test.tsx        # Tests for ExportModal component
├── FilterContext.test.tsx      # Tests for FilterContext
├── HelpPage.test.tsx           # Tests for HelpPage
└── README.md                   # This file
```

## Test Categories

### Component Tests
- **HeaderNav.test.tsx**: Tests navigation rendering, logo display, and button presence
- **FilterBar.test.tsx**: Tests filter controls, input rendering, and loading states
- **ExportModal.test.tsx**: Tests export modal functionality, bulk/single modes, and user interactions

### Context Tests
- **FilterContext.test.tsx**: Tests FilterContext state management, updates, and provider functionality

### Page Tests
- **HelpPage.test.tsx**: Tests help page content, sections, and action buttons

## Running Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch

# Run unit tests with coverage
npm run test:unit:coverage
```

## Test Patterns

### Component Testing
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ComponentName from '../../components/ComponentName'

describe('ComponentName', () => {
  it('renders without crashing', () => {
    render(<ComponentName />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### Context Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ContextProvider } from '../../contexts/ContextName'
import { useContextName } from '../../hooks/useContextName'

// Test component to access context
const TestComponent = () => {
  const context = useContextName()
  return <div data-testid="context-value">{context.value}</div>
}
```

### Mocking
```typescript
// Mock external dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
}))

// Mock hooks
vi.mock('../../hooks/useHookName', () => ({
  useHookName: () => ({
    value: 'test',
    setValue: vi.fn(),
  }),
}))
```

## Best Practices

1. **Test individual components in isolation**
2. **Mock external dependencies**
3. **Test user interactions and state changes**
4. **Use descriptive test names**
5. **Keep tests focused and simple**
6. **Test both success and error cases**

## Coverage Goals

- **Components**: 90%+ coverage
- **Contexts**: 95%+ coverage  
- **Pages**: 85%+ coverage
- **Overall**: 90%+ coverage
