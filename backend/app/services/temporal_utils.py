from typing import Optional
import re

from temporalio.service import ServiceClient, RPCError
from temporalio.api.workflowservice.v1 import (
    DescribeNamespaceRequest,
    RegisterNamespaceRequest,
)
from google.protobuf.duration_pb2 import Duration


async def ensure_namespace(namespace: str, address: str = "temporal:7233") -> bool:
    """
    Ensure a Temporal namespace exists. Returns True if ensured/created, False otherwise.
    """
    try:
        # Add connection timeout
        import asyncio
        from temporalio.service import ConnectConfig
        
        # Create proper connection config
        connect_config = ConnectConfig(target_host=address)
        
        # Connect with timeout
        try:
            service = await asyncio.wait_for(
                ServiceClient.connect(connect_config),
                timeout=10.0  # 10 second timeout
            )
        except asyncio.TimeoutError:
            print(f"Timeout connecting to Temporal at {address}")
            return False
            
        req = RegisterNamespaceRequest(
            namespace=namespace,
            workflow_execution_retention_period=Duration(seconds=7 * 24 * 3600),
        )
        try:
            await service.workflow_service.register_namespace(req)
            print(f"✓ Created Temporal namespace: {namespace}")
            return True
        except RPCError as err:
            # Namespace may already exist; treat as success
            if "AlreadyExists" in str(err) or "already exists" in str(err):
                print(f"✓ Temporal namespace already exists: {namespace}")
                return True
            # If register failed, try describe; if it exists, consider success
            try:
                await service.workflow_service.describe_namespace(
                    DescribeNamespaceRequest(namespace=namespace)
                )
                print(f"✓ Temporal namespace exists: {namespace}")
                return True
            except Exception as e:
                print(f"✗ Failed to verify namespace {namespace}: {e}")
                return False
    except Exception as e:
        print(f"✗ Error ensuring Temporal namespace {namespace}: {e}")
        return False


def slugify_namespace(name: str) -> str:
    s = name.strip().lower()
    s = re.sub(r"[^a-z0-9._-]+", "-", s)
    s = re.sub(r"[.-]{2,}", "-", s)
    return s.strip("-._") or "user"


def namespace_for_user(username: Optional[str] = None, email: Optional[str] = None, fallback_id: Optional[int] = None) -> str:
    base = username or email or (f"user-{fallback_id}" if fallback_id is not None else "user")
    # For emails, replace @ with -at-
    base = base.replace("@", "-at-") if base else "user"
    slug = slugify_namespace(base)
    return f"user-{slug}"
