"""
AWS CloudWatch Metrics integration for publishing custom metrics.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone

import boto3
from botocore.config import Config


# AWS configuration from environment
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")


class CloudWatchMetrics:
    """
    CloudWatch metrics publisher for security platform services.

    Example:
        >>> metrics = CloudWatchMetrics("SecurityPlatform/VulnerabilityScanner")
        >>> metrics.put_metric("ScansCompleted", 1)
        >>> metrics.put_metric("HighRiskFindings", 5, unit="Count")
    """

    def __init__(self, namespace: str):
        """
        Initialize CloudWatch metrics client.

        Args:
            namespace: CloudWatch namespace (e.g., "SecurityPlatform/VulnerabilityScanner")
        """
        self.namespace = namespace
        config = Config(region_name=AWS_REGION)
        self.cloudwatch = boto3.client("cloudwatch", config=config)

    def put_metric(
        self,
        metric_name: str,
        value: float,
        unit: str = "Count",
        dimensions: dict[str, str] | None = None,
    ) -> None:
        """
        Publish a metric to CloudWatch.

        Args:
            metric_name: Metric name (e.g., "ScansCompleted", "AlertsCreated")
            value: Metric value
            unit: Metric unit (Count, Seconds, Bytes, etc.)
            dimensions: Optional metric dimensions (e.g., {"Environment": "production"})

        Example:
            >>> metrics.put_metric("ScanDuration", 45.2, unit="Seconds")
            >>> metrics.put_metric("FindingsCount", 10, dimensions={"Severity": "High"})
        """
        metric_data = {
            "MetricName": metric_name,
            "Value": value,
            "Unit": unit,
            "Timestamp": datetime.now(timezone.utc),
        }

        if dimensions:
            metric_data["Dimensions"] = [
                {"Name": key, "Value": value} for key, value in dimensions.items()
            ]

        self.cloudwatch.put_metric_data(
            Namespace=self.namespace,
            MetricData=[metric_data],
        )

    def put_multiple_metrics(self, metrics: list[dict]) -> None:
        """
        Publish multiple metrics in a single API call.

        Args:
            metrics: List of metric dicts with keys: name, value, unit (optional), dimensions (optional)

        Example:
            >>> metrics.put_multiple_metrics([
            ...     {"name": "ScansStarted", "value": 1},
            ...     {"name": "ScansCompleted", "value": 1},
            ...     {"name": "FindingsCount", "value": 15, "dimensions": {"Risk": "High"}},
            ... ])
        """
        metric_data = []
        for metric in metrics:
            data = {
                "MetricName": metric["name"],
                "Value": metric["value"],
                "Unit": metric.get("unit", "Count"),
                "Timestamp": datetime.now(timezone.utc),
            }

            if "dimensions" in metric:
                data["Dimensions"] = [
                    {"Name": key, "Value": value}
                    for key, value in metric["dimensions"].items()
                ]

            metric_data.append(data)

        self.cloudwatch.put_metric_data(
            Namespace=self.namespace,
            MetricData=metric_data,
        )
