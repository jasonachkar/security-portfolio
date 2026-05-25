# ADR 0004: Only Gateway Has External Ingress

Status: Accepted

The gateway is the authorization, validation, rate limit, audit, and proxy boundary. Exposing internal scanner or telemetry services directly would weaken the story and increase risk. Azure cloud-demo keeps internal services private.
