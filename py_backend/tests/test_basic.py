import pytest
import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_app_health():
    """Basic health check test"""
    response = client.get("/docs")
    assert response.status_code == 200

def test_app_exists():
    """Test that the app exists"""
    assert app is not None 