import os
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Use HTTPBearer to extract the token from the Authorization header.
security = HTTPBearer()

def initialize_firebase():
    """
    Initializes Firebase Admin SDK using credentials from an environment variable.
    The environment variable FIREBASE_CREDENTIALS should point to your service account JSON file.
    """
    cred_path = os.getenv("FIREBASE_CREDENTIALS", "path/to/serviceAccountKey.json")
    try:
        # Check if Firebase app is already initialized.
        firebase_admin.get_app()
    except ValueError:
        # Initialize the Firebase app if not already done.
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)

# Initialize Firebase as soon as the module is imported.
initialize_firebase()

def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    FastAPI dependency function to verify the Firebase ID token.
    It expects an Authorization header with a Bearer token.
    
    Returns:
        Decoded token if verification is successful.
    
    Raises:
        HTTPException with 401 status if the token is invalid or expired.
    """
    token = credentials.credentials
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase token.",
        )
