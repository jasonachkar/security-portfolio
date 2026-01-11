"""Finding enrichment service."""

import httpx
from sqlalchemy.orm import Session
from shared_security_core.logging import get_logger

from threat_intel.infra.db.models import FindingEnrichment, ThreatIndicator
from threat_intel.services.cve_lookup import fetch_cve_from_nvd
from threat_intel.services.mitre_sync import map_cwe_to_techniques
from threat_intel.infra.settings import Settings

log = get_logger(__name__)
settings = Settings()


async def enrich_finding(
    db: Session,
    source_service: str,
    source_finding_id: int
) -> FindingEnrichment:
    """
    Enrich a finding from another service with threat intelligence.

    Steps:
    1. Fetch finding details from source service
    2. Extract CVE IDs and fetch CVE data
    3. Map CWEs to MITRE ATT&CK techniques
    4. Check for IOC matches (IPs, domains, URLs)
    5. Store enrichment data

    Args:
        db: Database session
        source_service: Source service name (vuln_scanner, network_analyzer)
        source_finding_id: Finding ID in source service

    Returns:
        FindingEnrichment record
    """
    # Check if already enriched
    existing = db.query(FindingEnrichment).filter(
        FindingEnrichment.source_service == source_service,
        FindingEnrichment.source_finding_id == source_finding_id
    ).first()

    if existing:
        log.info("finding_already_enriched", service=source_service, finding_id=source_finding_id)
        return existing

    # Fetch finding details from source service
    finding_data = await fetch_finding_from_service(source_service, source_finding_id)

    if not finding_data:
        log.warning("finding_not_found", service=source_service, finding_id=source_finding_id)
        # Create empty enrichment
        enrichment = FindingEnrichment(
            source_service=source_service,
            source_finding_id=source_finding_id,
            enrichment_metadata={"status": "not_found"}
        )
        db.add(enrichment)
        db.commit()
        return enrichment

    # Extract CVE IDs from finding
    cve_ids = extract_cve_ids(finding_data)

    # Fetch CVE data for each CVE
    cwe_ids = []
    for cve_id in cve_ids:
        cve_entry = await fetch_cve_from_nvd(cve_id, db)
        if cve_entry and cve_entry.cwe_ids:
            cwe_ids.extend(cve_entry.cwe_ids)

    # Map CWEs to MITRE techniques
    mitre_techniques = []
    for cwe_id in set(cwe_ids):
        techniques = await map_cwe_to_techniques(db, cwe_id)
        mitre_techniques.extend([t.technique_id for t in techniques])

    # Check for IOC matches
    matched_indicators = []
    iocs = extract_iocs_from_finding(finding_data)

    for ioc in iocs:
        matches = db.query(ThreatIndicator).filter(
            ThreatIndicator.value == ioc
        ).all()
        matched_indicators.extend([m.id for m in matches])

    # Create enrichment record
    enrichment = FindingEnrichment(
        source_service=source_service,
        source_finding_id=source_finding_id,
        cve_ids=cve_ids if cve_ids else None,
        mitre_techniques=list(set(mitre_techniques)) if mitre_techniques else None,
        matched_indicators=matched_indicators if matched_indicators else None,
        enrichment_metadata={
            "cwe_ids": cwe_ids,
            "iocs_checked": len(iocs),
            "status": "completed"
        }
    )

    db.add(enrichment)
    db.commit()
    db.refresh(enrichment)

    log.info(
        "finding_enriched",
        service=source_service,
        finding_id=source_finding_id,
        cves=len(cve_ids),
        techniques=len(mitre_techniques),
        indicators=len(matched_indicators)
    )

    return enrichment


async def fetch_finding_from_service(service: str, finding_id: int) -> dict | None:
    """
    Fetch finding details from source service API.

    Args:
        service: Service name (vuln_scanner, network_analyzer)
        finding_id: Finding ID

    Returns:
        Finding data as dict or None if not found
    """
    # Map service names to endpoints
    service_endpoints = {
        "vuln_scanner": f"http://vuln-scanner:8080/api/scans/findings/{finding_id}",
        "network_analyzer": f"http://network-analyzer:8081/api/network/anomalies/{finding_id}",
    }

    endpoint = service_endpoints.get(service)
    if not endpoint:
        log.warning("unknown_service", service=service)
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(endpoint)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        log.error("fetch_finding_error", service=service, finding_id=finding_id, error=str(e))
        return None


def extract_cve_ids(finding_data: dict) -> list[str]:
    """
    Extract CVE IDs from finding data.

    Searches name, description, and evidence fields for CVE patterns.
    """
    import re

    cve_pattern = r'CVE-\d{4}-\d{4,7}'
    cve_ids = set()

    # Search in common fields
    fields_to_search = [
        finding_data.get("name", ""),
        finding_data.get("description", ""),
        finding_data.get("solution", ""),
        str(finding_data.get("evidence", "")),
    ]

    for field in fields_to_search:
        matches = re.findall(cve_pattern, field, re.IGNORECASE)
        cve_ids.update([m.upper() for m in matches])

    return list(cve_ids)


def extract_iocs_from_finding(finding_data: dict) -> list[str]:
    """
    Extract IOCs (IPs, domains, URLs) from finding data.

    Returns list of IOC values to check against threat intelligence.
    """
    import re

    iocs = set()

    # Extract URLs
    url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
    urls = re.findall(url_pattern, str(finding_data))
    iocs.update(urls)

    # Extract IP addresses
    ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
    ips = re.findall(ip_pattern, str(finding_data))
    iocs.update(ips)

    # Extract domains from URLs
    domain_pattern = r'(?:https?://)?([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)'
    domains = re.findall(domain_pattern, str(finding_data))
    iocs.update(domains)

    # Filter out common false positives
    filtered_iocs = [
        ioc for ioc in iocs
        if ioc and not ioc.startswith("127.") and not ioc.startswith("192.168.")
    ]

    return filtered_iocs[:50]  # Limit to 50 IOCs to avoid excessive checks
