export interface InfraNode {
  id: string;
  type: string;
  label: string;
  cloud?: 'aws' | 'azure' | 'gcp';
  config?: Record<string, unknown>;
}

export interface InfraEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface InfraGraph {
  nodes: InfraNode[];
  edges: InfraEdge[];
}

export interface Finding {
  id: string;
  nodeId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description: string;
  remediation: string;
  framework: string; // e.g. "CIS AWS 1.4", "NIST 800-53"
}

export function validateInfraGraph(graph: InfraGraph): Finding[] {
  const findings: Finding[] = [];
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const connectedTo = new Map<string, string[]>();

  graph.edges.forEach((e) => {
    if (!connectedTo.has(e.source)) connectedTo.set(e.source, []);
    connectedTo.get(e.source)!.push(e.target);
    // Treat connections as undirected for "is associated with" style checks.
    if (!connectedTo.has(e.target)) connectedTo.set(e.target, []);
    connectedTo.get(e.target)!.push(e.source);
  });

  const hasWAF = graph.nodes.some((n) => n.type === 'waf');
  const hasCloudTrail = graph.nodes.some((n) => n.type === 'cloudtrail');
  const hasVPC = graph.nodes.some((n) => n.type === 'vpc');
  const hasAzureMonitor = graph.nodes.some((n) => n.type === 'azure-monitor');
  const hasGcpLogging = graph.nodes.some((n) => n.type === 'gcp-logging');

  for (const node of graph.nodes) {
    const connections = connectedTo.get(node.id) || [];
    const connectedTypes = connections.map((id) => nodeMap.get(id)?.type);

    switch (node.type) {
      case 's3': {
        const isPublic = (node.config?.public_access as boolean) ?? false;
        const hasEncryption = (node.config?.encryption as boolean) ?? false;
        const hasVersioning = (node.config?.versioning as boolean) ?? false;

        if (isPublic) {
          findings.push({
            id: `${node.id}-public`,
            nodeId: node.id,
            severity: 'CRITICAL',
            title: 'S3 Bucket Has Public Access Enabled',
            description: `The S3 bucket "${node.label}" is publicly accessible. This can expose sensitive data to the internet.`,
            remediation:
              'Enable S3 Block Public Access at the bucket and account level. Review bucket policies and ACLs. Enforce via AWS Config rule s3-bucket-public-read-prohibited.',
            framework: 'CIS AWS 2.1.5',
          });
        }
        if (!hasEncryption) {
          findings.push({
            id: `${node.id}-encryption`,
            nodeId: node.id,
            severity: 'HIGH',
            title: 'S3 Bucket Missing Server-Side Encryption',
            description: `"${node.label}" does not have SSE enabled. Data at rest is unprotected.`,
            remediation:
              'Enable SSE-S3 or SSE-KMS encryption on the bucket. Use a bucket policy to deny unencrypted uploads via the aws:SecureTransport condition.',
            framework: 'CIS AWS 2.1.1',
          });
        }
        if (!hasVersioning) {
          findings.push({
            id: `${node.id}-versioning`,
            nodeId: node.id,
            severity: 'MEDIUM',
            title: 'S3 Versioning Not Enabled',
            description: `"${node.label}" has no versioning. Data loss from accidental deletion or overwrites cannot be recovered.`,
            remediation:
              'Enable versioning on the bucket and consider MFA delete for added protection.',
            framework: 'CIS AWS 2.1.3',
          });
        }
        break;
      }

      case 'ec2': {
        const hasPublicIP = (node.config?.public_ip as boolean) ?? true;
        const sshOpen = (node.config?.ssh_open as boolean) ?? false;
        const rdpOpen = (node.config?.rdp_open as boolean) ?? false;

        if (sshOpen) {
          findings.push({
            id: `${node.id}-ssh`,
            nodeId: node.id,
            severity: 'CRITICAL',
            title: 'EC2 Instance SSH Open to 0.0.0.0/0',
            description: `"${node.label}" has port 22 open to the entire internet. This is a primary attack vector for brute-force attacks.`,
            remediation:
              'Restrict SSH to specific IP ranges or use AWS Systems Manager Session Manager to eliminate SSH exposure entirely. Remove the 0.0.0.0/0 inbound rule from the security group.',
            framework: 'CIS AWS 5.2',
          });
        }
        if (rdpOpen) {
          findings.push({
            id: `${node.id}-rdp`,
            nodeId: node.id,
            severity: 'CRITICAL',
            title: 'EC2 Instance RDP Open to 0.0.0.0/0',
            description: `"${node.label}" has port 3389 (RDP) open to the internet.`,
            remediation:
              'Restrict RDP access to known IP ranges or use a VPN/bastion host. Consider AWS Systems Manager Fleet Manager for RDP without opening port 3389.',
            framework: 'CIS AWS 5.3',
          });
        }
        if (hasPublicIP && !connectedTypes.includes('security-group')) {
          findings.push({
            id: `${node.id}-no-sg`,
            nodeId: node.id,
            severity: 'HIGH',
            title: 'EC2 Instance Not Associated with a Security Group',
            description: `"${node.label}" is publicly reachable but has no Security Group attached in this topology.`,
            remediation:
              'Attach a Security Group with least-privilege ingress/egress rules. Deny all inbound by default.',
            framework: 'NIST 800-53 SC-7',
          });
        }
        break;
      }

      case 'rds': {
        const isPublic = (node.config?.publicly_accessible as boolean) ?? false;
        const hasEncryption = (node.config?.encryption as boolean) ?? false;
        const deletionProtection =
          (node.config?.deletion_protection as boolean) ?? false;

        if (isPublic) {
          findings.push({
            id: `${node.id}-public`,
            nodeId: node.id,
            severity: 'CRITICAL',
            title: 'RDS Instance Publicly Accessible',
            description: `"${node.label}" has PubliclyAccessible=true, exposing the database endpoint to the internet.`,
            remediation:
              'Set PubliclyAccessible to false. Place RDS in a private subnet. Use a bastion host or VPN for admin access.',
            framework: 'CIS AWS 2.3.2',
          });
        }
        if (!hasEncryption) {
          findings.push({
            id: `${node.id}-encryption`,
            nodeId: node.id,
            severity: 'HIGH',
            title: 'RDS Instance Storage Not Encrypted',
            description: `"${node.label}" does not have storage encryption enabled.`,
            remediation:
              'Enable encryption at rest using AWS KMS. Note: encryption must be enabled at creation time — snapshot and restore for existing instances.',
            framework: 'CIS AWS 2.3.1',
          });
        }
        if (!deletionProtection) {
          findings.push({
            id: `${node.id}-deletion`,
            nodeId: node.id,
            severity: 'MEDIUM',
            title: 'RDS Deletion Protection Disabled',
            description: `"${node.label}" can be deleted without protection, risking irreversible data loss.`,
            remediation: 'Enable DeletionProtection on the RDS instance.',
            framework: 'NIST 800-53 CP-9',
          });
        }
        break;
      }

      case 'security-group': {
        const allowsAll = (node.config?.allow_all_inbound as boolean) ?? false;
        if (allowsAll) {
          findings.push({
            id: `${node.id}-allowall`,
            nodeId: node.id,
            severity: 'CRITICAL',
            title: 'Security Group Allows All Inbound Traffic',
            description: `"${node.label}" has an inbound rule of 0.0.0.0/0 on all ports (0-65535). This is equivalent to having no firewall.`,
            remediation:
              'Apply least-privilege ingress rules. Only open specific ports to specific CIDR blocks. Use the principle of deny-by-default.',
            framework: 'CIS AWS 5.1',
          });
        }
        break;
      }

      case 'iam-role': {
        const isAdmin = (node.config?.admin_policy as boolean) ?? false;
        const noMFA = (node.config?.no_mfa as boolean) ?? false;

        if (isAdmin) {
          findings.push({
            id: `${node.id}-admin`,
            nodeId: node.id,
            severity: 'CRITICAL',
            title: 'IAM Role Has AdministratorAccess Policy',
            description: `"${node.label}" is attached to AdministratorAccess (Action: *, Resource: *). This violates least privilege.`,
            remediation:
              'Replace AdministratorAccess with a custom policy granting only the minimum required permissions. Use IAM Access Analyzer to identify unused permissions.',
            framework: 'CIS AWS 1.16',
          });
        }
        if (noMFA) {
          findings.push({
            id: `${node.id}-mfa`,
            nodeId: node.id,
            severity: 'HIGH',
            title: 'IAM Console Access Without MFA Enforcement',
            description: `"${node.label}" allows console access without enforcing MFA, enabling account takeover via credential theft alone.`,
            remediation:
              'Attach an IAM policy that denies all actions unless aws:MultiFactorAuthPresent is true.',
            framework: 'CIS AWS 1.10',
          });
        }
        break;
      }

      case 'api-gateway': {
        if (!hasWAF) {
          findings.push({
            id: `${node.id}-no-waf`,
            nodeId: node.id,
            severity: 'HIGH',
            title: 'API Gateway Not Protected by WAF',
            description: `"${node.label}" is exposed without AWS WAF. This leaves it vulnerable to SQL injection, XSS, and volumetric abuse.`,
            remediation:
              'Associate an AWS WAF WebACL with the API Gateway stage. Enable AWS managed rule groups at minimum.',
            framework: 'NIST 800-53 SI-3',
          });
        }
        break;
      }

      case 'lambda': {
        const hasPublicURL = (node.config?.public_url as boolean) ?? false;
        const hasResourcePolicy =
          (node.config?.resource_policy as boolean) ?? false;

        if (hasPublicURL && !hasResourcePolicy) {
          findings.push({
            id: `${node.id}-public-url`,
            nodeId: node.id,
            severity: 'HIGH',
            title: 'Lambda Function URL Has No Resource Policy',
            description: `"${node.label}" has a public function URL with no resource policy restricting callers. Anyone on the internet can invoke it.`,
            remediation:
              'Add a resource-based policy to the Lambda function restricting invocations to specific principals or VPCs.',
            framework: 'NIST 800-53 AC-3',
          });
        }
        break;
      }

      case 'azure-blob': {
        const isPublic = (node.config?.public_access as boolean) ?? false;
        const hasEncryption = (node.config?.encryption as boolean) ?? true;

        if (isPublic) {
          findings.push({
            id: `${node.id}-public`,
            nodeId: node.id,
            severity: 'CRITICAL',
            title: 'Azure Blob Public Access Enabled',
            description: `"${node.label}" allows public blob access. This can expose object data without authentication.`,
            remediation:
              'Disable public blob access at the storage account and container level. Prefer private endpoints and managed identity access.',
            framework: 'CIS Azure 3.7',
          });
        }
        if (!hasEncryption) {
          findings.push({
            id: `${node.id}-encryption`,
            nodeId: node.id,
            severity: 'HIGH',
            title: 'Azure Storage Encryption Evidence Missing',
            description: `"${node.label}" does not include encryption evidence in the lab graph.`,
            remediation:
              'Document Microsoft-managed or customer-managed key encryption and require HTTPS-only transport.',
            framework: 'CIS Azure 3.x',
          });
        }
        break;
      }

      case 'azure-nsg': {
        const allowsAll = (node.config?.allow_all_inbound as boolean) ?? false;
        if (allowsAll) {
          findings.push({
            id: `${node.id}-allowall`,
            nodeId: node.id,
            severity: 'CRITICAL',
            title: 'Azure NSG Allows All Inbound Traffic',
            description: `"${node.label}" contains a broad inbound rule equivalent to any source and any destination port.`,
            remediation:
              'Replace broad inbound rules with least-privilege source CIDRs, destination ports, and just-in-time access for administration.',
            framework: 'CIS Azure 6.1',
          });
        }
        break;
      }

      case 'azure-vm': {
        const sshOpen = (node.config?.ssh_open as boolean) ?? false;
        const rdpOpen = (node.config?.rdp_open as boolean) ?? false;
        if (sshOpen || rdpOpen) {
          findings.push({
            id: `${node.id}-admin-open`,
            nodeId: node.id,
            severity: 'CRITICAL',
            title: 'Azure VM Administrative Port Exposed',
            description: `"${node.label}" exposes SSH or RDP to broad internet access in the model.`,
            remediation:
              'Use Azure Bastion, VPN, just-in-time access, private IP administration, and restrictive NSG rules.',
            framework: 'CIS Azure 6.2/6.3',
          });
        }
        break;
      }

      case 'azure-apim': {
        if (!connectedTypes.includes('azure-waf')) {
          findings.push({
            id: `${node.id}-no-waf`,
            nodeId: node.id,
            severity: 'HIGH',
            title: 'Azure API Management Missing WAF Path',
            description: `"${node.label}" is not associated with an Azure WAF node in this graph.`,
            remediation:
              'Place Application Gateway WAF or Front Door WAF in front of public API ingress and document managed rules.',
            framework: 'Azure Well-Architected Security',
          });
        }
        break;
      }

      case 'azure-sql': {
        const publicNetwork = (node.config?.public_network_access as boolean) ?? false;
        const auditEnabled = (node.config?.audit_enabled as boolean) ?? true;
        if (publicNetwork) {
          findings.push({
            id: `${node.id}-public-network`,
            nodeId: node.id,
            severity: 'HIGH',
            title: 'Azure SQL Public Network Access Enabled',
            description: `"${node.label}" is reachable through public networking in the lab graph.`,
            remediation:
              'Disable public network access where practical, use private endpoints, and restrict firewall rules.',
            framework: 'CIS Azure 4.x',
          });
        }
        if (!auditEnabled) {
          findings.push({
            id: `${node.id}-audit`,
            nodeId: node.id,
            severity: 'MEDIUM',
            title: 'Azure SQL Audit Evidence Missing',
            description: `"${node.label}" does not include auditing evidence in the lab graph.`,
            remediation: 'Enable SQL auditing and route logs to Log Analytics or a storage account.',
            framework: 'CIS Azure 4.x',
          });
        }
        break;
      }

      case 'gcp-storage': {
        const isPublic = (node.config?.public_access as boolean) ?? false;
        const uniformAccess = (node.config?.uniform_access as boolean) ?? true;
        if (isPublic) {
          findings.push({
            id: `${node.id}-public`,
            nodeId: node.id,
            severity: 'CRITICAL',
            title: 'GCS Bucket Public Access Enabled',
            description: `"${node.label}" allows public access in the model.`,
            remediation:
              'Remove allUsers/allAuthenticatedUsers grants and enforce public access prevention and uniform bucket-level access.',
            framework: 'CIS GCP 5.1',
          });
        }
        if (!uniformAccess) {
          findings.push({
            id: `${node.id}-uniform-access`,
            nodeId: node.id,
            severity: 'HIGH',
            title: 'GCS Uniform Bucket-Level Access Disabled',
            description: `"${node.label}" does not enforce uniform bucket-level access.`,
            remediation: 'Enable uniform bucket-level access and manage access through IAM.',
            framework: 'CIS GCP 5.x',
          });
        }
        break;
      }

      case 'gcp-firewall': {
        const allowsAll = (node.config?.allow_all_inbound as boolean) ?? false;
        if (allowsAll) {
          findings.push({
            id: `${node.id}-allowall`,
            nodeId: node.id,
            severity: 'CRITICAL',
            title: 'GCP Firewall Rule Allows All Inbound Traffic',
            description: `"${node.label}" allows broad inbound access in the model.`,
            remediation:
              'Restrict source ranges and destination ports. Use least-privilege firewall rules and hierarchical policies.',
            framework: 'CIS GCP 3.6',
          });
        }
        break;
      }

      case 'gcp-iam': {
        const primitiveRole = (node.config?.primitive_role as boolean) ?? false;
        if (primitiveRole) {
          findings.push({
            id: `${node.id}-primitive`,
            nodeId: node.id,
            severity: 'HIGH',
            title: 'GCP Primitive IAM Role Assigned',
            description: `"${node.label}" represents primitive Owner/Editor/Viewer-style access.`,
            remediation:
              'Replace primitive roles with predefined or custom least-privilege roles. Use IAM Recommender to reduce scope.',
            framework: 'CIS GCP 1.4',
          });
        }
        break;
      }

      case 'gcp-compute': {
        const sshOpen = (node.config?.ssh_open as boolean) ?? false;
        if (sshOpen) {
          findings.push({
            id: `${node.id}-ssh`,
            nodeId: node.id,
            severity: 'CRITICAL',
            title: 'GCP Compute SSH Open to Internet',
            description: `"${node.label}" exposes SSH broadly in the lab graph.`,
            remediation:
              'Use IAP TCP forwarding, OS Login, private IP administration, and restricted firewall source ranges.',
            framework: 'CIS GCP 3.6',
          });
        }
        break;
      }

      case 'gcp-apigee': {
        if (!connectedTypes.includes('gcp-armor')) {
          findings.push({
            id: `${node.id}-no-armor`,
            nodeId: node.id,
            severity: 'HIGH',
            title: 'Apigee Missing Cloud Armor Path',
            description: `"${node.label}" is not associated with a Cloud Armor node in this graph.`,
            remediation:
              'Document Cloud Armor edge policy coverage for public API ingress where applicable.',
            framework: 'Google Cloud Security Foundations',
          });
        }
        break;
      }
    }
  }

  // Global topology checks
  if (!hasCloudTrail && graph.nodes.length > 2) {
    findings.push({
      id: 'global-no-cloudtrail',
      nodeId: '',
      severity: 'HIGH',
      title: 'No CloudTrail Logging in This Infrastructure',
      description:
        'This infrastructure has no CloudTrail node. Without audit logging, there is no visibility into API calls, user actions, or security events.',
      remediation:
        'Add a CloudTrail trail with multi-region logging, log file validation, and S3 bucket delivery. Enable CloudWatch Logs integration for alerting.',
      framework: 'CIS AWS 3.1',
    });
  }

  if (
    !hasVPC &&
    graph.nodes.some((n) => ['ec2', 'rds', 'lambda'].includes(n.type))
  ) {
    findings.push({
      id: 'global-no-vpc',
      nodeId: '',
      severity: 'HIGH',
      title: 'Compute Resources Not Inside a VPC',
      description:
        'EC2, RDS, or Lambda resources exist without a VPC, meaning they are in the AWS default network boundary with no isolation.',
      remediation:
        'Create a custom VPC with public and private subnets. Place compute in private subnets and use a NAT Gateway for outbound traffic.',
      framework: 'CIS AWS 5.1',
    });
  }

  if (graph.nodes.some((n) => n.cloud === 'azure' || n.type.startsWith('azure-')) && graph.nodes.length > 2 && !hasAzureMonitor) {
    findings.push({
      id: 'global-no-azure-monitor',
      nodeId: '',
      severity: 'HIGH',
      title: 'Azure Monitor / Log Analytics Missing',
      description:
        'Azure resources exist without Azure Monitor or Log Analytics evidence in the graph.',
      remediation:
        'Add Azure Monitor and route platform logs to Log Analytics for detection and investigation evidence.',
      framework: 'CIS Azure 5.x',
    });
  }

  if (graph.nodes.some((n) => n.cloud === 'gcp' || n.type.startsWith('gcp-')) && graph.nodes.length > 2 && !hasGcpLogging) {
    findings.push({
      id: 'global-no-gcp-logging',
      nodeId: '',
      severity: 'HIGH',
      title: 'GCP Cloud Logging Missing',
      description:
        'GCP resources exist without Cloud Logging evidence in the graph.',
      remediation:
        'Add Cloud Logging sinks and retention evidence for audit and detection coverage.',
      framework: 'CIS GCP 2.x',
    });
  }

  return findings;
}

export function generateTerraform(graph: InfraGraph): string {
  const lines: string[] = [
    "# Generated by Jason Achkar's Security Portfolio Lab",
    '# https://github.com/jasonachkar/security-portfolio',
    '',
    'terraform {',
    '  required_providers {',
    '    aws = {',
    '      source  = "hashicorp/aws"',
    '      version = "~> 5.0"',
    '    }',
    '  }',
    '}',
    '',
    'provider "aws" {',
    '  region = "us-east-1"',
    '}',
    '',
  ];

  for (const node of graph.nodes) {
    const resourceName = node.id.replace(/[^A-Za-z0-9_]/g, '_');
    const cloud = node.cloud ?? (node.type.startsWith('azure-') ? 'azure' : node.type.startsWith('gcp-') ? 'gcp' : 'aws');
    switch (node.type) {
      case 'vpc':
        lines.push(`resource "aws_vpc" "${resourceName}" {`);
        lines.push('  cidr_block           = "10.0.0.0/16"');
        lines.push('  enable_dns_hostnames = true');
        lines.push('  enable_dns_support   = true');
        lines.push(`  tags = { Name = "${node.label}" }`);
        lines.push('}', '');
        break;
      case 's3':
        lines.push(`resource "aws_s3_bucket" "${resourceName}" {`);
        lines.push(`  bucket = "${node.label.toLowerCase().replace(/\s+/g, '-')}"`);
        lines.push(`  tags = { Name = "${node.label}" }`);
        lines.push('}', '');
        lines.push(`resource "aws_s3_bucket_server_side_encryption_configuration" "${resourceName}_enc" {`);
        lines.push(`  bucket = aws_s3_bucket.${resourceName}.id`);
        lines.push('  rule { apply_server_side_encryption_by_default { sse_algorithm = "AES256" } }');
        lines.push('}', '');
        lines.push(`resource "aws_s3_bucket_public_access_block" "${resourceName}_block" {`);
        lines.push(`  bucket = aws_s3_bucket.${resourceName}.id`);
        lines.push('  block_public_acls       = true');
        lines.push('  block_public_policy     = true');
        lines.push('  ignore_public_acls      = true');
        lines.push('  restrict_public_buckets = true');
        lines.push('}', '');
        break;
      case 'ec2':
        lines.push(`resource "aws_instance" "${resourceName}" {`);
        lines.push('  ami           = "ami-0c02fb55956c7d316"');
        lines.push('  instance_type = "t3.micro"');
        lines.push(`  tags = { Name = "${node.label}" }`);
        lines.push('}', '');
        break;
      case 'rds':
        lines.push(`resource "aws_db_instance" "${resourceName}" {`);
        lines.push('  engine               = "postgres"');
        lines.push('  engine_version       = "15.4"');
        lines.push('  instance_class       = "db.t3.micro"');
        lines.push('  allocated_storage    = 20');
        lines.push('  storage_encrypted    = true');
        lines.push('  publicly_accessible  = false');
        lines.push('  deletion_protection  = true');
        lines.push('  skip_final_snapshot  = false');
        lines.push(`  identifier = "${node.label.toLowerCase().replace(/\s+/g, '-')}"`);
        lines.push('  username = "admin"');
        lines.push('  password = var.db_password');
        lines.push(`  tags = { Name = "${node.label}" }`);
        lines.push('}', '');
        break;
      case 'security-group':
        lines.push(`resource "aws_security_group" "${resourceName}" {`);
        lines.push(`  name        = "${node.label}"`);
        lines.push('  description = "Managed by Security Portfolio Lab"');
        lines.push('  egress {');
        lines.push('    from_port   = 0');
        lines.push('    to_port     = 0');
        lines.push('    protocol    = "-1"');
        lines.push('    cidr_blocks = ["0.0.0.0/0"]');
        lines.push('  }');
        lines.push(`  tags = { Name = "${node.label}" }`);
        lines.push('}', '');
        break;
      case 'waf':
        lines.push(`resource "aws_wafv2_web_acl" "${resourceName}" {`);
        lines.push(`  name  = "${node.label}"`);
        lines.push('  scope = "REGIONAL"');
        lines.push('  default_action { allow {} }');
        lines.push('  visibility_config {');
        lines.push('    cloudwatch_metrics_enabled = true');
        lines.push('    metric_name                = "WAF"');
        lines.push('    sampled_requests_enabled   = true');
        lines.push('  }');
        lines.push(`  tags = { Name = "${node.label}" }`);
        lines.push('}', '');
        break;
      default:
        lines.push(`# ${cloud.toUpperCase()} demonstration resource: ${node.label}`);
        lines.push(`resource "portfolio_lab_${cloud}_${node.type.replace(/-/g, '_')}" "${resourceName}" {`);
        lines.push(`  name = "${node.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}"`);
        lines.push(`  cloud = "${cloud}"`);
        lines.push('  evidence_required = true');
        lines.push('}', '');
        break;
    }
  }

  return lines.join('\n');
}
