import jwt
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

User = get_user_model()

class ClerkAuthTestCase(APITestCase):
    def test_clerk_auth_auto_creates_user(self):
        # Create a mock JWT payload
        payload = {
            "sub": "user_clerk_12345",
            "email": "clerk_student@college.edu",
            "name": "Clerk Student",
            "picture": "https://clerk.com/avatar.png"
        }
        
        # Encode token (without verify key to trigger the dev signature skip)
        token = jwt.encode(payload, "secret_key", algorithm="HS256")
        
        # Verify no user exists initially
        self.assertEqual(User.objects.filter(email="clerk_student@college.edu").count(), 0)
        
        # Hit profile API with auth headers
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/users/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify user was created automatically
        self.assertEqual(User.objects.filter(email="clerk_student@college.edu").count(), 1)
        user = User.objects.get(email="clerk_student@college.edu")
        self.assertEqual(user.full_name, "Clerk Student")
        self.assertEqual(user.clerk_user_id, "user_clerk_12345")
        
        # Verify settings and preferences was auto created
        self.assertTrue(hasattr(user, 'ai_preferences'))
