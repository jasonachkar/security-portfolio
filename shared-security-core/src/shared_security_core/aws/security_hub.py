"""
AWS Security Hub integration for publishing findings in ASFF format.

ASFF (AWS Security Finding Format) is the standard format for Security Hub findings.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

import boto3
from botocore.config import Config


# AWS configuration from environment
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_ACCOUNT_ID = os.getenv("AWS_ACCOUNT_ID", "")


async def publish_finding_to_security_hub(
    finding_id: str,
    title: str,
    description: str,
    severity: str,
    resource_id: str,
    finding_type: str = "Software and Configuration Checks/Vulnerabilities",
    **kwargs: Any,
) -> str:
    """
    Publish a security finding to AWS Security Hub in ASFF format.

    Args:
        finding_id: Unique finding identifier (e.g., "vuln-scanner/finding/123")
        title: Finding title
        description: Detailed finding description
        severity: Severity level (critical, high, medium, low, info)
        resource_id: Affected resource identifier (URL, IP, etc.)
        finding_type: ASFF finding type category
        **kwargs: Additional ASFF fields

    Returns:
        Finding ARN from Security Hub

    Raises:
        Exception: If Security Hub publish fails

    Example:
        >>> await publish_finding_to_security_hub(
        ...     finding_id="vuln-scanner/finding/123",
        ...     title="SQL Injection Vulnerability",
        ...     description="SQL injection found in login form",
        ...     severity="high",
        ...     resource_id="https://example.com/login",
        ... )
    """
    config = Config(region_name=AWS_REGION)
    securityhub = boto3.client("securityhub", config=config)

    # Map severity to normalized score (0-100)
    severity_map = {
        "critical": 90,
        "high": 70,
        "medium": 40,
        "low": 10,
        "info": 0,
        "informational": 0,
    }

    normalized_severity = severity_map.get(severity.lower(), 50)

    # Build ASFF finding
    asff_finding = {
        "SchemaVersion": "2018-10-08",
        "Id": finding_id,
        "ProductArn": f"arn:aws:securityhub:{AWS_REGION}:{AWS_ACCOUNT_ID}:product/{AWS_ACCOUNT_ID}/default",
        "GeneratorId": "security-platform",
        "AwsAccountId": AWS_ACCOUNT_ID,
        "Types": [finding_type],
        "CreatedAt": datetime.now(timezone.utc).isoformat(),
        "UpdatedAt": datetime.now(timezone.utc).isoformat(),
        "Severity": {
            "Label": severity.upper(),
            "Normalized": normalized_severity,
        },
        "Title": title,
        "Description": description,
        "Resources": [
            {
                "Type": "Other",
                "Id": resource_id,
            }
        ],
        **kwargs,
    }

    # Publish to Security Hub
    response = securityhub.batch_import_findings(Findings=[asff_finding])

    if response["FailedCount"] > 0:
        failed_findings = response.get("FailedFindings", [])
        error_msg = f"Failed to publish finding: {failed_findings}"
        raise Exception(error_msg)

    return finding_id
