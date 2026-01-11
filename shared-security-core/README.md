# Shared Security Core

Common utilities, models, and authentication components shared across all security platform services.

## Components

- **auth/**: JWT authentication and RBAC middleware
- **aws/**: AWS SDK helpers (Security Hub, CloudWatch)
- **db/**: Common SQLAlchemy base classes and mixins
- **models/**: Shared Pydantic models
- **logging.py**: Standardized logging configuration

## Installation

Install as a local dependency in other services:

```toml
[project]
dependencies = [
    "shared-security-core @ file:///../shared-security-core",
    # ... other deps
]
```

## Usage

```python
from shared_security_core.auth.rbac import require_jwt_token, require_permission
from shared_security_core.aws.security_hub import publish_finding_to_security_hub

# In FastAPI routes:
@router.get("/", dependencies=[Depends(require_permission("scans", "read"))])
def list_scans(current_user: TokenPayload = Depends(require_jwt_token)):
    # current_user contains user_id, username, role, permissions
    pass
```
