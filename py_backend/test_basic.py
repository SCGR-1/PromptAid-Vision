import pytest
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