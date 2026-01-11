# Cloud Security Platform

Enterprise-grade security platform demonstrating cloud security engineering expertise, multi-service architecture, and real-time threat intelligence.

## Architecture

**7 Microservices:**
1. **Auth Service** (Port 8083) - JWT authentication with RBAC
2. **Vulnerability Scanner** (Port 8080) - OWASP ZAP integration
3. **Network Traffic Analyzer** (Port 8081) - Real-time packet capture
4. **Security Assessment Orchestrator** (Port 8082) - Multi-tool coordination
5. **Threat Intelligence Service** (Port 8084) - CVE/MITRE ATT&CK enrichment
6. **Alert Correlation Service** (Port 8085) - Incident response
7. **Compliance Service** (Port 8086) - NIST/PCI-DSS/CIS reporting

**Unified React UI** (Port 80) - Real-time dashboards

## Features

### Authentication & Authorization
- Multi-user JWT authentication
- Role-Based Access Control (Admin, Analyst, Auditor)
- Session management and revocation
- Audit logging

### Cloud Integration (AWS)
- VPC Flow Logs ingestion
- Security Hub findings publishing (ASFF format)
- ECS container scanning
- CloudWatch metrics

### Threat Intelligence
- CVE data from NVD API
- MITRE ATT&CK framework mapping
- IOC tracking from threat feeds
- Automated finding enrichment

### Security Scanning
- Web application vulnerability scanning (OWASP ZAP)
- Network traffic analysis with anomaly detection
- Container image scanning (Trivy)
- Multi-tool security assessments (Nmap, ZAP, Trivy)

### Incident Response
- Alert correlation across all sources
- Incident timeline tracking
- Custom correlation rules
- Investigation workflows

### Compliance
- Framework mapping (NIST 800-53, PCI-DSS, CIS Controls)
- Automated compliance reporting
- PDF report generation
- Coverage gap analysis

## Tech Stack

**Backend:**
- FastAPI (Python 3.12)
- PostgreSQL 16
- Redis 7
- Celery (async task processing)
- SQLAlchemy ORM
- Alembic migrations

**Frontend:**
- React 19
- TypeScript
- Tailwind CSS
- Zustand (state management)
- React Query (data fetching)
- Recharts (visualizations)

**Infrastructure:**
- Docker & Docker Compose
- Traefik API Gateway
- OWASP ZAP
- tshark/Wireshark

## Quick Start

### Prerequisites
- Docker & Docker Compose
- 8GB RAM minimum
- Linux/macOS (for network capture)

### Run All Services

```bash
# Clone repository
git clone <repo-url>
cd security-portfolio

# Start all services
docker-compose up -d

# Wait for services to be healthy
docker-compose ps

# Run database migrations
docker-compose exec auth-service alembic upgrade head
docker-compose exec vuln-scanner alembic upgrade head
docker-compose exec network-analyzer alembic upgrade head
docker-compose exec orchestrator alembic upgrade head

# Access UI
open http://localhost

# Default credentials
# Username: admin
# Password: changeme
```

### API Gateway

All backend services are accessible through Traefik on port 8000:

- Auth: http://localhost:8000/api/auth/*
- Scans: http://localhost:8000/api/scans/*
- Network: http://localhost:8000/api/network/*
- Assessments: http://localhost:8000/api/assessments/*
- Alerts: http://localhost:8000/api/alerts/*
- Intel: http://localhost:8000/api/intel/*
- Compliance: http://localhost:8000/api/compliance/*

### API Documentation

- Auth Service: http://localhost:8083/docs
- Vuln Scanner: http://localhost:8080/docs
- Network Analyzer: http://localhost:8081/docs
- Orchestrator: http://localhost:8082/docs
- Traefik Dashboard: http://localhost:8081

## Development

### Run Individual Service

```bash
cd auth-service
python -m venv venv
source venv/bin/activate
pip install -e .
uvicorn auth_service.api.main:app --reload --port 8083
```

### Run Tests

```bash
# Auth service tests
cd auth-service
pytest

# Vuln scanner tests
cd vulnerability-scanner
pytest
```

## AWS Configuration

### VPC Flow Logs

1. Create S3 bucket for VPC flow logs
2. Enable VPC flow logs in AWS Console
3. Set environment variables:
   ```bash
   AWS_REGION=us-east-1
   AWS_ACCOUNT_ID=123456789012
   AWS_VPC_FLOW_LOGS_BUCKET=my-vpc-flow-logs
   ```

### Security Hub

1. Enable Security Hub in AWS Console
2. Configure IAM permissions
3. Findings will be automatically published

### ECS Scanning

1. Ensure IAM role has ECS describe permissions
2. Use `/api/assessments/ecs/scan` endpoint

## Security

**Authentication:**
- JWT tokens with 15-minute expiry
- Refresh tokens with 7-day expiry
- Bcrypt password hashing
- Session revocation tracking

**Authorization:**
- Granular RBAC permissions (resource:action)
- Permission-based endpoint protection
- Audit logging for all actions

**Network:**
- CORS configuration
- Rate limiting via Traefik
- HTTPS enforcement (production)

## Default Roles

**Admin:**
- Full access to all resources
- User management
- Configuration management

**Analyst:**
- Create/read scans and assessments
- Read/update alerts and incidents
- Read threat intelligence

**Auditor:**
- Read-only access to all resources
- Access to audit logs
- Compliance report viewing

## Project Structure

```
security-portfolio/
├── shared-security-core/       # Shared utilities (JWT, RBAC, AWS)
├── auth-service/               # Authentication service
├── vulnerability-scanner/      # OWASP ZAP scanner
├── network-traffic-analyzer/   # Network monitoring
├── security-assessment-orchestrator/  # Multi-tool orchestration
├── threat-intel-service/       # Threat intelligence (planned)
├── alert-correlation-service/  # Alert correlation (planned)
├── compliance-service/         # Compliance reporting (planned)
├── security-platform-ui/       # React UI (planned)
├── traefik/                    # API gateway config
├── scripts/                    # Deployment scripts
└── docker-compose.yml          # Full stack orchestration
```

## Roadmap

- [x] Auth Service with RBAC
- [x] Vulnerability Scanner
- [x] Network Analyzer
- [x] Assessment Orchestrator
- [x] Shared security core package
- [x] API Gateway (Traefik)
- [ ] Threat Intelligence Service
- [ ] Alert Correlation Service
- [ ] Compliance Reporting Service
- [ ] React UI with real-time dashboards
- [ ] Scheduled scans
- [ ] Webhook notifications
- [ ] Kubernetes deployment

## License

MIT

## Author

Built to demonstrate cloud security engineering expertise for cybersecurity roles.
