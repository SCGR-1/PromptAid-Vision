# Frontend Integration Tests

This directory contains integration tests that verify how different components work together in the PromptAid Vision frontend application.

## 🎯 What are Integration Tests?

Integration tests verify that:
- **Components interact correctly** with each other
- **Context providers** work with their consumers
- **Routing** functions properly between components
- **State management** flows correctly through the app
- **User workflows** work end-to-end across multiple components

## 📁 Test Files

### 1. **FilterBarWithFilterContext.test.tsx** (4 tests)
Tests the integration between `FilterBar` component and `FilterContext`:
- Filter updates trigger context changes
- Clear button resets context
- Loading states are properly displayed
- Current filters are shown from context

### 2. **HeaderNavWithRouting.test.tsx** (5 tests)
Tests the integration between `HeaderNav` component and routing:
- Logo click navigates to explore page
- Help link navigation works
- Admin link visibility based on user role
- Current page highlighting

### 3. **ExportModalWithAdminContext.test.tsx** (8 tests)
Tests the integration between `ExportModal` component and `AdminContext`:
- Admin-only features visibility
- Image selection handling
- Export button states
- Modal interactions

### 4. **HelpPageWithRouting.test.tsx** (7 tests)
Tests the integration between `HelpPage` component and routing:
- All help sections are displayed
- Back button navigation
- Admin-specific help visibility
- Contact information display

### 5. **AppWorkflow.test.tsx** (6 tests)
Tests complete application workflows:
- Complete user workflow (navigate, filter, export)
- Admin workflow (access admin features)
- Filter workflow (apply and clear filters)
- Navigation workflow (page transitions)
- Context integration (filters and admin state)
- Error handling workflow

## 🚀 Running Integration Tests

### Run All Integration Tests
```bash
npm run test:integration
```

### Run Specific Integration Test
```bash
npx vitest run src/test/integration/FilterBarWithFilterContext.test.tsx
```

### Run in Watch Mode
```bash
npx vitest src/test/integration --reporter=verbose
```

## 🧪 Test Structure

Each integration test follows this pattern:

```typescript
describe('Component + Context Integration', () => {
  beforeEach(() => {
    // Setup mocks and reset state
  });

  test('Specific integration scenario', async () => {
    // Render components with providers
    // Simulate user interactions
    // Verify component interactions
    // Check context state changes
  });
});
```

## 🔧 Mocking Strategy

Integration tests use strategic mocking:

- **Context Hooks**: Mock `useFilterContext` and `useAdminContext`
- **Routing**: Mock `useNavigate` and `useLocation`
- **External Libraries**: Mock `jszip` for export functionality
- **Component Dependencies**: Mock child components when needed

## 📊 Test Coverage

Integration tests cover:

| Component | Context Integration | Routing Integration | Workflow Integration |
|-----------|-------------------|-------------------|-------------------|
| FilterBar | ✅ FilterContext | ❌ | ❌ |
| HeaderNav | ✅ AdminContext | ✅ React Router | ❌ |
| ExportModal | ✅ AdminContext | ❌ | ❌ |
| HelpPage | ✅ AdminContext | ✅ React Router | ❌ |
| App Workflow | ✅ All Contexts | ✅ React Router | ✅ Complete Workflows |

## 🎭 Test Scenarios

### User Workflows
1. **Filter and Export**: Apply filters → Select images → Export data
2. **Navigation**: Move between pages → Use back buttons → Logo navigation
3. **Admin Access**: Login → Access admin features → Manage data

### Component Interactions
1. **FilterBar ↔ FilterContext**: State updates, loading states
2. **HeaderNav ↔ AdminContext**: Role-based visibility
3. **ExportModal ↔ AdminContext**: Feature access control
4. **HelpPage ↔ Routing**: Navigation and page state

### Error Handling
1. **Empty States**: Handle missing data gracefully
2. **Loading States**: Show appropriate loading indicators
3. **Access Control**: Hide features based on user permissions

## 🚨 Common Issues

### Mock Configuration
- Ensure all context hooks are properly mocked
- Verify routing mocks return expected values
- Check that component props match expected interfaces

### Async Operations
- Use `await userEvent.setup()` for user interactions
- Wait for state updates with `waitFor`
- Handle async context changes properly

### Component Rendering
- Wrap components with necessary providers
- Mock external dependencies (JSZip, etc.)
- Ensure test environment supports all required APIs

## 🔍 Debugging Tips

1. **Check Mock Returns**: Verify mocked functions return expected values
2. **Component Props**: Ensure components receive required props
3. **Provider Wrapping**: Check that all necessary context providers are included
4. **Async Timing**: Use `waitFor` for state changes and async operations

## 📈 Adding New Integration Tests

To add a new integration test:

1. **Identify Integration Points**: Determine which components interact
2. **Choose Test Scope**: Decide on the level of integration to test
3. **Mock Dependencies**: Mock external services and context hooks
4. **Test User Flows**: Focus on realistic user interactions
5. **Verify State Changes**: Check that state flows correctly between components

## 🎯 Best Practices

- **Test Real Interactions**: Focus on actual user workflows
- **Minimize Mocking**: Only mock what's necessary for isolation
- **Verify Integration**: Ensure components actually work together
- **Test Edge Cases**: Include error states and boundary conditions
- **Keep Tests Focused**: Each test should verify one integration aspect

Integration tests ensure that your components work together as expected, providing confidence that the application functions correctly as a whole system.
