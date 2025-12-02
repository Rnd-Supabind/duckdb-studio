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
        service = await ServiceClient.connect(address)
        req = RegisterNamespaceRequest(
            namespace=namespace,
            workflow_execution_retention_period=Duration(seconds=7 * 24 * 3600),
        )
        try:
            await service.workflow_service.register_namespace(req)
            return True
        except RPCError as err:
            # Namespace may already exist; treat as success
            if "AlreadyExists" in str(err) or "already exists" in str(err):
                return True
            # If register failed, try describe; if it exists, consider success
            try:
                await service.workflow_service.describe_namespace(
                    DescribeNamespaceRequest(namespace=namespace)
                )
                return True
            except Exception:
                return False
    except Exception:
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
