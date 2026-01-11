"""CVE lookup and caching service using NVD API."""

import httpx
from sqlalchemy.orm import Session
from sqlalchemy import or_
from shared_security_core.logging import get_logger

from threat_intel.infra.db.models import CVEEntry
from threat_intel.infra.settings import Settings

log = get_logger(__name__)
settings = Settings()


async def fetch_cve_from_nvd(cve_id: str, db: Session) -> CVEEntry | None:
    """
    Fetch CVE data from NVD API 2.0 and cache in database.

    Args:
        cve_id: CVE identifier (e.g., CVE-2024-1234)
        db: Database session

    Returns:
        CVEEntry object or None if not found
    """
    # NVD API 2.0 endpoint
    url = f"https://services.nvd.nist.gov/rest/json/cves/2.0?cveId={cve_id}"

    headers = {}
    if settings.nvd_api_key:
        headers["apiKey"] = settings.nvd_api_key

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()

            if not data.get("vulnerabilities"):
                log.warning("cve_not_found", cve_id=cve_id)
                return None

            cve_data = data["vulnerabilities"][0]["cve"]

            # Extract CVSS v3 score
            cvss_v3_score = None
            cvss_v3_vector = None
            severity = None

            if "metrics" in cve_data:
                if "cvssMetricV31" in cve_data["metrics"]:
                    cvss_v31 = cve_data["metrics"]["cvssMetricV31"][0]["cvssData"]
                    cvss_v3_score = cvss_v31.get("baseScore")
                    cvss_v3_vector = cvss_v31.get("vectorString")
                    severity = cvss_v31.get("baseSeverity")
                elif "cvssMetricV30" in cve_data["metrics"]:
                    cvss_v30 = cve_data["metrics"]["cvssMetricV30"][0]["cvssData"]
                    cvss_v3_score = cvss_v30.get("baseScore")
                    cvss_v3_vector = cvss_v30.get("vectorString")
                    severity = cvss_v30.get("baseSeverity")

            # Extract CWE IDs
            cwe_ids = []
            if "weaknesses" in cve_data:
                for weakness in cve_data["weaknesses"]:
                    for desc in weakness.get("description", []):
                        if desc["value"].startswith("CWE-"):
                            cwe_ids.append(desc["value"])

            # Extract references
            references = []
            if "references" in cve_data:
                references = [
                    {"url": ref["url"], "source": ref.get("source", ""), "tags": ref.get("tags", [])}
                    for ref in cve_data["references"][:10]  # Limit to 10 references
                ]

            # Extract description
            description = ""
            if "descriptions" in cve_data:
                for desc in cve_data["descriptions"]:
                    if desc["lang"] == "en":
                        description = desc["value"]
                        break

            # Create CVEEntry
            cve_entry = CVEEntry(
                cve_id=cve_id,
                published_date=cve_data.get("published"),
                last_modified=cve_data.get("lastModified"),
                description=description,
                cvss_v3_score=cvss_v3_score,
                cvss_v3_vector=cvss_v3_vector,
                severity=severity,
                cwe_ids=cwe_ids if cwe_ids else None,
                references={"references": references} if references else None,
            )

            db.add(cve_entry)
            db.commit()
            db.refresh(cve_entry)

            log.info("cve_fetched", cve_id=cve_id, severity=severity, cvss=cvss_v3_score)
            return cve_entry

    except httpx.HTTPError as e:
        log.error("nvd_api_error", cve_id=cve_id, error=str(e))
        return None
    except Exception as e:
        log.error("cve_fetch_error", cve_id=cve_id, error=str(e))
        return None


async def search_cves(
    db: Session,
    query: str,
    severity: str | None = None,
    limit: int = 20,
    offset: int = 0
) -> list[CVEEntry]:
    """
    Search CVE entries in local database.

    Args:
        db: Database session
        query: Search query (searches CVE ID and description)
        severity: Filter by severity
        limit: Max results
        offset: Pagination offset

    Returns:
        List of matching CVE entries
    """
    db_query = db.query(CVEEntry).filter(
        or_(
            CVEEntry.cve_id.ilike(f"%{query}%"),
            CVEEntry.description.ilike(f"%{query}%")
        )
    )

    if severity:
        db_query = db_query.filter(CVEEntry.severity == severity.upper())

    results = db_query.order_by(CVEEntry.published_date.desc()).limit(limit).offset(offset).all()
    return results
