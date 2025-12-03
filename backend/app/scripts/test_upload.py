"""
Script to test file upload via API.
Usage: python -m app.scripts.test_upload <username> <password> <file_path>
"""

import sys
import os
import requests

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_upload(username, password, file_path):
    base_url = "http://localhost:8000/api/v1"
    
    # 1. Login
    print(f"Logging in as {username}...")
    response = requests.post(f"{base_url}/auth/login", json={"username": username, "password": password})
    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        return False
    
    token = response.json()["access_token"]
    print("Login successful, token received")
    
    # 2. Upload file
    print(f"Uploading file {file_path}...")
    headers = {"Authorization": f"Bearer {token}"}
    files = {"file": open(file_path, "rb")}
    
    response = requests.post(
        f"{base_url}/storage/upload?folder=uploads",
        headers=headers,
        files=files
    )
    
    if response.status_code != 200:
        print(f"Upload failed: {response.text}")
        return False
    
    print(f"Upload successful: {response.json()}")
    return True

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python -m app.scripts.test_upload <username> <password> <file_path>")
        sys.exit(1)
    
    username = sys.argv[1]
    password = sys.argv[2]
    file_path = sys.argv[3]
    
    success = test_upload(username, password, file_path)
    sys.exit(0 if success else 1)
