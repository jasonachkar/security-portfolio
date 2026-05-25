variable "name" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "container_app_environment_id" {
  type = string
}

variable "image" {
  type = string
}

variable "target_port" {
  type = number
}

variable "external_enabled" {
  type    = bool
  default = false
}

variable "env_vars" {
  type    = map(string)
  default = {}
}

variable "cpu" {
  type    = number
  default = 0.5
}

variable "memory" {
  type    = string
  default = "1Gi"
}
