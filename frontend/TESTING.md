# Testing Guide

This project uses Vitest for unit testing with React Testing Library for component testing.

## Available Scripts

- `npm test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:ui` - Run tests with UI (requires @vitest/ui)
- `npm run test:coverage` - Run tests with coverage report

## Test File Structure

- Test files should be named `ComponentName.test.tsx` or `ComponentName.spec.tsx`
- Place test files alongside the components they test
- Use the `src/test/` directory for test utilities and setup

## Writing Tests

### Basic Component Test
```tsx
import { render, screen } from '../test/test-utils'
import { describe, it, expect } from 'vitest'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('renders without crashing', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### Testing User Interactions
```tsx
import { fireEvent } from '../test/test-utils'

it('responds to button clicks', () => {
  render(<MyComponent />)
  const button = screen.getByRole('button')
  fireEvent.click(button)
  expect(screen.getByText('Clicked!')).toBeInTheDocument()
})
```

### Testing with Context
Use the custom `render` function from `test-utils.tsx` to automatically wrap components with necessary providers.

## Mocking

### Mocking External Dependencies
```tsx
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))
```

### Mocking API Calls
```tsx
vi.mock('../services/api', () => ({
  fetchData: vi.fn(() => Promise.resolve({ data: 'test' }))
}))
```

## Best Practices

1. Test behavior, not implementation
2. Use semantic queries (getByRole, getByLabelText) over getByTestId
3. Write tests that resemble how users interact with your app
4. Keep tests focused and isolated
5. Use descriptive test names that explain the expected behavior

## Running Specific Tests

```bash
# Run tests matching a pattern
npm test -- --grep "FilterBar"

# Run tests in a specific file
npm test HeaderNav.test.tsx

# Run tests with verbose output
npm test -- --reporter=verbose
```
