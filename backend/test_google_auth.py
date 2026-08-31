import sys
import os
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

# Add backend directory to path
sys.path.append("c:/Users/HP/Documents/verinova/backend")

# Set dummy keys/variables
os.environ["TAVILY_API_KEY"] = "dummy_tavily_key"
os.environ["GOOGLE_CLIENT_ID"] = "test_google_client_id"
os.environ["GOOGLE_CLIENT_SECRET"] = "test_google_client_secret"
os.environ["GOOGLE_REDIRECT_URI"] = "http://localhost:8000/api/auth/google/callback"

from main import app, get_db
import main
main.GOOGLE_CLIENT_ID = "test_google_client_id"
main.GOOGLE_CLIENT_SECRET = "test_google_client_secret"
main.GOOGLE_REDIRECT_URI = "http://localhost:8000/api/auth/google/callback"
os.environ["GOOGLE_CLIENT_ID"] = "test_google_client_id"
os.environ["GOOGLE_CLIENT_SECRET"] = "test_google_client_secret"
os.environ["GOOGLE_REDIRECT_URI"] = "http://localhost:8000/api/auth/google/callback"
import models

class TestGoogleAuth(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)
        self.mock_db = MagicMock()
        
        # Override the database dependency
        app.dependency_overrides[get_db] = lambda: self.mock_db

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_google_login_redirect(self):
        """Test that the Google login endpoint returns a 302 redirect to Google."""
        response = self.client.get("/api/auth/google/login", follow_redirects=False)
        self.assertEqual(response.status_code, 302)
        location = response.headers.get("location", "")
        self.assertIn("accounts.google.com", location)
        self.assertIn("client_id=test_google_client_id", location)
        self.assertIn("redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fapi%2Fauth%2Fgoogle%2Fcallback", location)

    @patch("main.make_http_request")
    def test_google_callback_success(self, mock_make_request):
        """Test that a successful Google OAuth callback authenticates the user and redirects to frontend."""
        # 1. Mock Google endpoints response
        def side_effect(url, **kwargs):
            if "oauth2.googleapis.com/token" in url:
                return {"access_token": "mock_access_token"}
            elif "googleapis.com/oauth2/v3/userinfo" in url:
                return {
                    "email": "google-test@verinova.com",
                    "name": "Google Test User",
                    "sub": "google_12345",
                    "picture": "http://example.com/pic.jpg"
                }
            return {}
        mock_make_request.side_effect = side_effect

        # 2. Mock database query outcomes
        # User lookup returns None (new user)
        mock_query_user = MagicMock()
        mock_query_user.filter.return_value.first.return_value = None
        
        # OAuthAccount lookup returns None
        mock_query_oauth = MagicMock()
        mock_query_oauth.filter.return_value.first.return_value = None

        def mock_query(model):
            if model == models.User:
                return mock_query_user
            elif model == models.OAuthAccount:
                return mock_query_oauth
            return MagicMock()

        self.mock_db.query.side_effect = mock_query

        # 3. Call callback endpoint
        response = self.client.get("/api/auth/google/callback?code=mock_code", follow_redirects=False)
        
        # 4. Check redirects
        self.assertEqual(response.status_code, 302)
        location = response.headers.get("location", "")
        self.assertIn("/auth/callback", location)
        self.assertIn("token=", location)
        self.assertIn("new_user=true", location)

        # 5. Check user & oauth account addition
        self.assertTrue(self.mock_db.add.called)
        self.assertTrue(self.mock_db.commit.called)

    @patch("main.make_http_request")
    def test_google_callback_failure(self, mock_make_request):
        """Test that a failed token exchange redirect handles the error properly."""
        mock_make_request.side_effect = Exception("Google token exchange error")

        response = self.client.get("/api/auth/google/callback?code=mock_code", follow_redirects=False)
        self.assertEqual(response.status_code, 302)
        location = response.headers.get("location", "")
        self.assertIn("/auth/callback", location)
        self.assertIn("error=", location)

if __name__ == "__main__":
    unittest.main()
