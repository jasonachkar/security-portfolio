# API Gateway Security

The gateway is the public backend front door for local and cloud-demo modes.

Controls:

- JWT access tokens with short TTL.
- httpOnly refresh token cookie for browser flows.
- Refresh token rotation.
- Refresh token reuse detection and family revocation.
- RBAC permission checks.
- Request validation with strict schemas.
- Rate limiting per client IP.
- Security headers.
- Request IDs.
- Audit events for login failure, successful login, refresh rotation, reuse detection, logout, rate limit, permission denial, and proxy attempts.
- Fixed upstream service registry for scanner, network, and assessment APIs.

The gateway does not accept arbitrary upstream URLs from users. Proxy destinations are configured service IDs and checked against an allowlist.
