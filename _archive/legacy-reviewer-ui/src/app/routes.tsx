import type { ComponentType, ReactNode } from 'react';
import { Boxes, Cloud, FileCheck, FlaskConical, KeyRound, Radar, ShieldCheck, Workflow } from 'lucide-react';
import { StartHere } from '../pages/StartHere';
import { Architecture } from '../pages/Architecture';
import { SecureGateway } from '../pages/SecureGateway';
import { AssessmentPipeline } from '../pages/AssessmentPipeline';
import { NetworkTelemetry } from '../pages/NetworkTelemetry';
import { AzureDeployment } from '../pages/AzureDeployment';
import { Evidence } from '../pages/Evidence';
import { LabSandbox } from '../pages/LabSandbox';

export interface NavRoute {
  path: string;
  label: string;
  title: string;
  eyebrow: string;
  icon: ComponentType<{ size?: number }>;
  element: ReactNode;
  home?: boolean;
}

export const NAV_ROUTES: NavRoute[] = [
  {
    path: '/',
    label: 'Start Here',
    title: 'Defensive Security Platform Lab',
    eyebrow: 'Cloud security / DevSecOps portfolio lab',
    icon: ShieldCheck,
    element: <StartHere />,
    home: true,
  },
  {
    path: '/architecture',
    label: 'Architecture',
    title: 'Architecture',
    eyebrow: 'Local full-tool lab · Azure cloud-demo',
    icon: Boxes,
    element: <Architecture />,
  },
  {
    path: '/gateway',
    label: 'Secure Gateway',
    title: 'Secure Gateway',
    eyebrow: 'The only public front door',
    icon: KeyRound,
    element: <SecureGateway />,
  },
  {
    path: '/assessment-pipeline',
    label: 'Assessment Pipeline',
    title: 'Assessment Pipeline',
    eyebrow: 'Defensive · allowlisted · no exploitation',
    icon: Workflow,
    element: <AssessmentPipeline />,
  },
  {
    path: '/network-telemetry',
    label: 'Network Telemetry',
    title: 'Network Telemetry',
    eyebrow: 'tshark telemetry · local capture',
    icon: Radar,
    element: <NetworkTelemetry />,
  },
  {
    path: '/azure-deployment',
    label: 'Azure Deployment',
    title: 'Azure Deployment',
    eyebrow: 'Cloud-demo architecture · not a live deploy',
    icon: Cloud,
    element: <AzureDeployment />,
  },
  {
    path: '/evidence',
    label: 'Evidence',
    title: 'Evidence',
    eyebrow: 'Click through to the proof',
    icon: FileCheck,
    element: <Evidence />,
  },
  {
    path: '/sandbox',
    label: 'Lab Sandbox',
    title: 'Lab Sandbox',
    eyebrow: 'Optional · demo data by default',
    icon: FlaskConical,
    element: <LabSandbox />,
  },
];

export function routeForPath(pathname: string): NavRoute {
  return NAV_ROUTES.find((route) => route.path === pathname) ?? NAV_ROUTES[0];
}
