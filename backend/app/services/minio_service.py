from minio import Minio
from minio.error import S3Error
import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class MinIOService:
    def __init__(self):
        self.endpoint = os.getenv("MINIO_ENDPOINT", "minio:9000")
        self.access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        self.secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
        self.secure = os.getenv("MINIO_SECURE", "false").lower() == "true"
        
        self.client = Minio(
            self.endpoint,
            access_key=self.access_key,
            secret_key=self.secret_key,
            secure=self.secure
        )
    
    def create_user_bucket(self, username: str) -> bool:
        """
        Create a bucket for a user with uploads and transformed subfolders
        Bucket name format: user-{username}
        """
        bucket_name = f"user-{username.lower()}"
        
        try:
            # Check if bucket already exists
            if self.client.bucket_exists(bucket_name):
                logger.info(f"Bucket {bucket_name} already exists")
                return True
            
            # Create bucket
            self.client.make_bucket(bucket_name)
            logger.info(f"Created bucket: {bucket_name}")
            
            # Create folder structure by uploading empty  objects with trailing slashes
            # MinIO/S3 doesn't have real folders, but this creates folder-like structure
            folders = ["uploads/", "transformed/"]
            for folder in folders:
                # Upload empty object to create folder
                from io import BytesIO
                self.client.put_object(
                    bucket_name,
                    folder + ".keep",  # .keep file to preserve folder structure
                    BytesIO(b""),
                    0
                )
                logger.info(f"Created folder: {folder} in bucket {bucket_name}")
            
            return True
            
        except S3Error as e:
            logger.error(f"Failed to create bucket for user {username}: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error creating bucket for user {username}: {e}")
            return False
    
    def list_user_buckets(self, username: str) -> list:
        """List all buckets for a user"""
        prefix = f"user-{username.lower()}"
        try:
            buckets = self.client.list_buckets()
            return [b.name for b in buckets if b.name.startswith(prefix)]
        except S3Error as e:
            logger.error(f"Failed to list buckets for user {username}: {e}")
            return []
    
    def upload_file(self, bucket_name: str, object_name: str, file_path: str) -> bool:
        """Upload a file to MinIO"""
        try:
            self.client.fput_object(bucket_name, object_name, file_path)
            logger.info(f"Uploaded {file_path} to {bucket_name}/{object_name}")
            return True
        except S3Error as e:
            logger.error(f"Failed to upload file: {e}")
            return False
    
    def list_objects(self, bucket_name: str, prefix: str = "") -> list:
        """List objects in a bucket with optional prefix"""
        try:
            objects = self.client.list_objects(bucket_name, prefix=prefix, recursive=True)
            return [obj.object_name for obj in objects]
        except S3Error as e:
            logger.error(f"Failed to list objects in {bucket_name}: {e}")
            return []
    
    def get_bucket_info(self, username: str) -> dict:
        """Get information about user's bucket"""
        bucket_name = f"user-{username.lower()}"
        try:
            if not self.client.bucket_exists(bucket_name):
                return {"exists": False}
            
            # Count objects in each folder
            uploads_count = len(self.list_objects(bucket_name, "uploads/"))
            transformed_count = len(self.list_objects(bucket_name, "transformed/"))
            
            return {
                "exists": True,
                "name": bucket_name,
                "uploads_count": uploads_count,
                "transformed_count": transformed_count
            }
        except S3Error as e:
            logger.error(f"Failed to get bucket info: {e}")
            return {"exists": False, "error": str(e)}

# Singleton instance
minio_service = MinIOService()
