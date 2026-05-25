locals {
  name_prefix = "${var.project_name}-${var.environment}"
  tags = {
    project     = "defensive-security-platform-lab"
    environment = var.environment
    purpose     = "portfolio-cloud-demo"
  }
}

resource "azurerm_resource_group" "this" {
  name     = "rg-${local.name_prefix}"
  location = var.location
  tags     = local.tags
}

resource "azurerm_log_analytics_workspace" "this" {
  name                = "log-${local.name_prefix}"
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.tags
}

resource "azurerm_container_registry" "this" {
  name                = replace("acr${local.name_prefix}", "-", "")
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  sku                 = "Basic"
  admin_enabled       = false
  tags                = local.tags
}

resource "azurerm_container_app_environment" "this" {
  name                       = "cae-${local.name_prefix}"
  location                   = azurerm_resource_group.this.location
  resource_group_name        = azurerm_resource_group.this.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id
  tags                       = local.tags
}

resource "random_password" "gateway_jwt_secret" {
  length  = 48
  special = false
}

module "scanner" {
  source                       = "../../modules/container-app"
  name                         = "ca-${local.name_prefix}-scanner"
  resource_group_name          = azurerm_resource_group.this.name
  container_app_environment_id = azurerm_container_app_environment.this.id
  image                        = var.scanner_image
  target_port                  = 8080
  external_enabled             = false
  env_vars = {
    APP_ENV         = "cloud-demo"
    CLOUD_DEMO_MODE = "true"
    AUTH_TOKEN      = "gateway-only"
    JWT_SECRET      = random_password.gateway_jwt_secret.result
    ALLOWED_TARGETS = "demo-app.local,localhost,127.0.0.1"
  }
}

module "network" {
  source                       = "../../modules/container-app"
  name                         = "ca-${local.name_prefix}-network"
  resource_group_name          = azurerm_resource_group.this.name
  container_app_environment_id = azurerm_container_app_environment.this.id
  image                        = var.network_image
  target_port                  = 8081
  external_enabled             = false
  env_vars = {
    APP_ENV         = "cloud-demo"
    CLOUD_DEMO_MODE = "true"
    AUTH_TOKEN      = "gateway-only"
    JWT_SECRET      = random_password.gateway_jwt_secret.result
  }
}

module "assessment" {
  source                       = "../../modules/container-app"
  name                         = "ca-${local.name_prefix}-assessment"
  resource_group_name          = azurerm_resource_group.this.name
  container_app_environment_id = azurerm_container_app_environment.this.id
  image                        = var.assessment_image
  target_port                  = 8082
  external_enabled             = false
  env_vars = {
    APP_ENV         = "cloud-demo"
    CLOUD_DEMO_MODE = "true"
    ENABLE_NMAP     = "false"
    ENABLE_ZAP      = "false"
    ENABLE_TRIVY    = "false"
    AUTH_TOKEN      = "gateway-only"
    JWT_SECRET      = random_password.gateway_jwt_secret.result
    ALLOWED_TARGETS = "demo-app.local,localhost,127.0.0.1"
  }
}

module "gateway" {
  source                       = "../../modules/container-app"
  name                         = "ca-${local.name_prefix}-gateway"
  resource_group_name          = azurerm_resource_group.this.name
  container_app_environment_id = azurerm_container_app_environment.this.id
  image                        = var.gateway_image
  target_port                  = 3000
  external_enabled             = true
  env_vars = {
    APP_ENV            = "cloud-demo"
    JWT_SECRET         = random_password.gateway_jwt_secret.result
    SCANNER_URL        = "https://${module.scanner.fqdn}"
    NETWORK_URL        = "https://${module.network.fqdn}"
    ASSESSMENT_URL     = "https://${module.assessment.fqdn}"
    UPSTREAM_ALLOWLIST = "${module.scanner.fqdn},${module.network.fqdn},${module.assessment.fqdn}"
  }
}

resource "azurerm_static_web_app" "reviewer" {
  name                = "swa-${local.name_prefix}-reviewer"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  sku_tier            = "Free"
  sku_size            = "Free"
  tags                = local.tags
}
