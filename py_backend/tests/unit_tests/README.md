# Unit Tests for PromptAid Vision Backend

This directory contains **pure unit tests** for the PromptAid Vision backend application. These tests are designed to be fast, isolated, and run without external dependencies.

## 🧪 **What Are Unit Tests?**

Unit tests are tests that:
- ✅ Test individual functions/methods in isolation
- ✅ Mock external dependencies (databases, APIs, file systems)
- ✅ Run quickly (milliseconds, not seconds)
- ✅ Don't require running services
- ✅ Don't make network calls
- ✅ Don't require database connections

## 📁 **Test Organization**

### **Services Layer**
- **`test_schema_validator.py`** - Schema validation logic tests
- **`test_image_preprocessor.py`** - Image processing and validation tests
- **`test_vlm_service.py`** - VLM service logic tests (mocked APIs)

### **Basic Tests**
- **`test_basic.py`** - Basic testing infrastructure verification

## 🚀 **Running Unit Tests**

### **Run All Unit Tests**
```bash
cd py_backend/tests/unit_tests
python run_unit_tests.py
```

### **Run Individual Test Files**
```bash
cd py_backend/tests/unit_tests
python -m unittest test_schema_validator.py
python -m unittest test_image_preprocessor.py
python -m unittest test_vlm_service.py
python -m unittest test_basic.py
```

### **Run Specific Test Classes**
```bash
cd py_backend/tests/unit_tests
python -m unittest test_schema_validator.TestSchemaValidator
python -m unittest test_image_preprocessor.TestImagePreprocessor
python -m unittest test_vlm_service.TestVLMServiceManager
```

### **Run Specific Test Methods**
```bash
cd py_backend/tests/unit_tests
python -m unittest test_schema_validator.TestSchemaValidator.test_validate_crisis_map_data_valid
```

## 🔧 **Test Structure**

Each test file follows this pattern:

```python
class TestComponentName(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures"""
        pass
    
    def test_method_name_scenario(self):
        """Test description"""
        # Arrange - Set up test data
        # Act - Execute the method being tested
        # Assert - Verify the results
        pass
```

## 📊 **Test Coverage**

### **Schema Validator (15+ tests)**
- Crisis map data validation
- Drone data validation
- Data cleaning and transformation
- Error handling for invalid data
- Schema validation against JSON schemas

### **Image Preprocessor (10+ tests)**
- MIME type detection
- Preprocessing requirements checking
- Image format conversion
- Configuration constants
- PyMuPDF availability

### **VLM Service (15+ tests)**
- Service registration and management
- Model type enumeration
- Stub service functionality
- Service availability checking

### **Basic Tests (8 tests)**
- Python environment verification
- Testing infrastructure validation
- Basic operations testing

## 🎯 **Best Practices**

### **Test Naming**
- Use descriptive test names: `test_validate_crisis_map_data_missing_analysis`
- Follow pattern: `test_methodName_scenario`

### **Test Organization**
- Group related tests in test classes
- Use `setUp()` for common test data
- Use `tearDown()` for cleanup if needed

### **Assertions**
- Use specific assertions: `assertEqual()`, `assertIn()`, `assertTrue()`
- Avoid generic `assert` statements
- Test both positive and negative cases

### **Mocking**
- Mock external dependencies
- Mock database connections
- Mock API calls
- Mock file system operations

## 🚨 **What NOT to Test**

- ❌ Database connections (use mocks)
- ❌ External API calls (use mocks)
- ❌ File system operations (use mocks)
- ❌ Network requests
- ❌ Slow operations

## 🔍 **Debugging Tests**

### **Verbose Output**
```bash
python -m unittest -v test_schema_validator.py
```

### **Stop on First Failure**
```bash
python -m unittest -f test_schema_validator.py
```

### **Run with Coverage**
```bash
pip install coverage
coverage run -m unittest discover
coverage report
coverage html  # Generate HTML report
```

## 📈 **Adding New Tests**

1. **Create test file**: `test_new_component.py`
2. **Import the component**: `from app.components.new_component import NewComponent`
3. **Create test class**: `class TestNewComponent(unittest.TestCase):`
4. **Write test methods**: Follow the Arrange-Act-Assert pattern
5. **Mock dependencies**: Use `unittest.mock` for external dependencies
6. **Run tests**: Ensure they pass before committing

## 🎉 **Benefits of Unit Tests**

- **Fast Feedback**: Tests run in milliseconds
- **Isolated Testing**: No external dependencies
- **Easy Debugging**: Clear failure points
- **Confidence**: Know your code works in isolation
- **Documentation**: Tests show how to use your code
- **Refactoring Safety**: Catch regressions quickly

## 🔗 **Related Documentation**

- [Python unittest documentation](https://docs.python.org/3/library/unittest.html)
- [unittest.mock documentation](https://docs.python.org/3/library/unittest.mock.html)
- [Test-Driven Development](https://en.wikipedia.org/wiki/Test-driven_development)
