output "resource_group_name" {
  value = azurerm_resource_group.this.name
}

output "acr_login_server" {
  value = azurerm_container_registry.this.login_server
}

output "gateway_fqdn" {
  value = module.gateway.fqdn
}

output "reviewer_static_web_app_name" {
  value = azurerm_static_web_app.reviewer.name
}
