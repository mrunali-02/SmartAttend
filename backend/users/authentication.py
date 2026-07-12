import os
import logging
import jwt
from jwt import PyJWKClient
from django.contrib.auth import get_user_model
from rest_framework import authentication, exceptions

from ai.models import AIPreferences

User = get_user_model()
logger = logging.getLogger(__name__)

class ClerkAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None

        try:
            parts = auth_header.split()
            if len(parts) != 2 or parts[0].lower() != 'bearer':
                return None
            token = parts[1]
        except Exception:
            return None

        import sys
        # Verify JWT Token using Clerk JWKS
        try:
            # 1. Unverified decode to extract Issuer (iss)
            unverified_payload = jwt.decode(token, options={"verify_signature": False, "verify_exp": False})
            issuer = unverified_payload.get('iss')
            
            # If running in unit tests or local dev without a real key, use unverified decode directly
            if ('test' in sys.argv or os.environ.get('DEBUG') == 'True') and (not issuer or 'clerk.accounts' not in issuer):
                payload = unverified_payload
            else:
                if not issuer:
                    raise exceptions.AuthenticationFailed('Token payload does not contain issuer claim.')
                    
                # 2. Get Signing Key dynamically from Clerk JWKS endpoint
                jwks_url = f"{issuer.rstrip('/')}/.well-known/jwks.json"
                jwk_client = PyJWKClient(jwks_url)
                signing_key = jwk_client.get_signing_key_from_jwt(token)
                
                # 3. Cryptographically verify the token signature with 10 minutes clock leeway
                payload = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=['RS256'],
                    options={"verify_aud": False},
                    leeway=600
                )
            
        except jwt.ExpiredSignatureError as e:
            if os.environ.get('DEBUG') == 'True' or 'test' in sys.argv:
                logger.warning(f"Clerk token has expired ({str(e)}). Falling back to mock verification.")
                try:
                    payload = jwt.decode(token, options={"verify_signature": False, "verify_exp": False})
                except Exception:
                    raise exceptions.AuthenticationFailed('Invalid Clerk token.')
            else:
                raise exceptions.AuthenticationFailed('Clerk token has expired.')
        except Exception as e:
            # Fallback to local offline mock decoding ONLY if in local developer mode and key signature fails
            if os.environ.get('DEBUG') == 'True' or 'test' in sys.argv:
                logger.warning(f"Signature check failed ({str(e)}). Falling back to mock verification.")
                try:
                    payload = jwt.decode(token, options={"verify_signature": False, "verify_exp": False})
                except Exception:
                    raise exceptions.AuthenticationFailed('Invalid Clerk token.')
            else:
                raise exceptions.AuthenticationFailed(f'Clerk authentication error: {str(e)}')

        # Extract details
        clerk_id = payload.get('sub')
        if not clerk_id:
            raise exceptions.AuthenticationFailed('Token payload does not contain user identifier.')

        # Retrieve email details (Clerk JWTs can store email as claim email or email_address)
        email = request.headers.get('HTTP_X_USER_EMAIL') or request.headers.get('X-User-Email') or payload.get('email') or payload.get('email_address') or payload.get('primary_email_address')
        if not email:
            email = f"{clerk_id}@clerk.local"

        name = request.headers.get('HTTP_X_USER_NAME') or request.headers.get('X-User-Name') or payload.get('name') or payload.get('full_name') or payload.get('first_name') or "Google User"
        picture = request.headers.get('HTTP_X_USER_IMAGE') or request.headers.get('X-User-Image') or payload.get('picture') or payload.get('image_url')

        # Retrieve / Create user
        try:
            user = User.objects.get(clerk_user_id=clerk_id)
        except User.DoesNotExist:
            user = User.objects.filter(email=email).first()
            if user:
                user.clerk_user_id = clerk_id
                if not user.full_name and name:
                    user.full_name = name
                if not user.name and name:
                    user.name = name
                if picture:
                    user.profile_photo_url = picture
                user.save()
            else:
                user = User.objects.create_user(
                    email=email,
                    clerk_user_id=clerk_id,
                    full_name=name,
                    name=name,
                    profile_photo_url=picture
                )
                
            # Initialize preferences
            AIPreferences.objects.get_or_create(user=user)

        return (user, None)
