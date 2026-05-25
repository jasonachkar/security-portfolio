"""MITRE ATT&CK framework synchronization service."""

import httpx
import json
from sqlalchemy.orm import Session
from shared_security_core.logging import get_logger

from threat_intel.infra.db.models import MitreAttackTechnique

log = get_logger(__name__)


async def sync_mitre_attack_framework(db: Session) -> int:
    """
    Download and sync MITRE ATT&CK Enterprise framework from official STIX repository.

    Returns:
        Number of techniques synced
    """
    # MITRE ATT&CK Enterprise framework (STIX 2.1 format)
    url = "https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            stix_data = response.json()

            techniques_synced = 0

            # Process STIX objects
            for obj in stix_data.get("objects", []):
                if obj.get("type") == "attack-pattern":
                    # This is a technique
                    technique_id = None
                    for external_ref in obj.get("external_references", []):
                        if external_ref.get("source_name") == "mitre-attack":
                            technique_id = external_ref.get("external_id")
                            break

                    if not technique_id:
                        continue

                    # Extract platforms
                    platforms = obj.get("x_mitre_platforms", [])

                    # Extract tactics (kill chain phases)
                    tactics = []
                    for phase in obj.get("kill_chain_phases", []):
                        if phase.get("kill_chain_name") == "mitre-attack":
                            tactics.append(phase.get("phase_name"))

                    # Extract data sources
                    data_sources = []
                    for ds in obj.get("x_mitre_data_sources", []):
                        if isinstance(ds, str):
                            data_sources.append(ds)

                    # Extract detection guidance
                    detection = obj.get("x_mitre_detection", "")

                    # Extract mitigations (store as metadata for now)
                    mitigations = {}
                    if "x_mitre_version" in obj:
                        mitigations["version"] = obj["x_mitre_version"]

                    # Check if technique already exists
                    existing = db.query(MitreAttackTechnique).filter(
                        MitreAttackTechnique.technique_id == technique_id
                    ).first()

                    if existing:
                        # Update existing technique
                        existing.name = obj.get("name", "")
                        existing.description = obj.get("description", "")
                        existing.tactics = tactics if tactics else None
                        existing.platforms = platforms if platforms else None
                        existing.data_sources = data_sources if data_sources else None
                        existing.detection = detection if detection else None
                        existing.mitigations = mitigations if mitigations else None
                    else:
                        # Create new technique
                        technique = MitreAttackTechnique(
                            technique_id=technique_id,
                            name=obj.get("name", ""),
                            description=obj.get("description", ""),
                            tactics=tactics if tactics else None,
                            platforms=platforms if platforms else None,
                            data_sources=data_sources if data_sources else None,
                            detection=detection if detection else None,
                            mitigations=mitigations if mitigations else None,
                        )
                        db.add(technique)

                    techniques_synced += 1

            db.commit()
            log.info("mitre_attack_synced", techniques_count=techniques_synced)
            return techniques_synced

    except httpx.HTTPError as e:
        log.error("mitre_sync_http_error", error=str(e))
        db.rollback()
        return 0
    except Exception as e:
        log.error("mitre_sync_error", error=str(e))
        db.rollback()
        return 0


async def map_cwe_to_techniques(db: Session, cwe_id: str) -> list[MitreAttackTechnique]:
    """
    Map CWE weakness to MITRE ATT&CK techniques.

    This is a simplified mapping. In production, you'd use a more comprehensive
    CWE-to-MITRE mapping database.

    Args:
        db: Database session
        cwe_id: CWE identifier (e.g., CWE-79)

    Returns:
        List of potentially related MITRE techniques
    """
    # Common CWE to MITRE technique mappings
    cwe_mappings = {
        "CWE-79": ["T1059"],  # XSS -> Command and Scripting Interpreter
        "CWE-89": ["T1190"],  # SQL Injection -> Exploit Public-Facing Application
        "CWE-78": ["T1059"],  # OS Command Injection -> Command and Scripting Interpreter
        "CWE-22": ["T1005"],  # Path Traversal -> Data from Local System
        "CWE-352": ["T1185"],  # CSRF -> Browser Session Hijacking
        "CWE-434": ["T1190"],  # Unrestricted Upload -> Exploit Public-Facing Application
        "CWE-94": ["T1059"],  # Code Injection -> Command and Scripting Interpreter
        "CWE-918": ["T1090"],  # SSRF -> Proxy
        "CWE-601": ["T1566"],  # Open Redirect -> Phishing
        "CWE-798": ["T1552"],  # Hardcoded Credentials -> Unsecured Credentials
    }

    technique_ids = cwe_mappings.get(cwe_id, [])

    if not technique_ids:
        return []

    techniques = db.query(MitreAttackTechnique).filter(
        MitreAttackTechnique.technique_id.in_(technique_ids)
    ).all()

    return techniques
