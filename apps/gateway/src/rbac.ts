import type { GatewayUser } from './config.js';

export function hasPermission(user: GatewayUser, permission: string): boolean {
  const [resource, action] = permission.split(':');
  return user.permissions.some((candidate) => {
    const [candidateResource, candidateAction] = candidate.split(':');
    return (
      (candidateResource === '*' || candidateResource === resource) &&
      (candidateAction === '*' || candidateAction === action)
    );
  });
}
