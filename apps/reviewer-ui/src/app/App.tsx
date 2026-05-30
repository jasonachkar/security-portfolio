import { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import NavBar from '../components/NavBar';
import Lab from '../pages/Lab';
import ThreatMap from '../pages/ThreatMap';
import NetworkAnalyzer from '../pages/NetworkAnalyzer';
import VulnerabilityScanner from '../pages/VulnerabilityScanner';
import GatewayExplorer from '../pages/GatewayExplorer';

const TITLES: Record<string, string> = {
  '/lab': 'Infra Lab - Cloud Security Portfolio',
  '/threat-map': 'Threat Map - Cloud Security Portfolio',
  '/network': 'Network Analyzer - Cloud Security Portfolio',
  '/scanner': 'Vulnerability Scanner - Cloud Security Portfolio',
  '/gateway': 'API Gateway - Cloud Security Portfolio',
};

function TitleSync() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = TITLES[pathname] ?? TITLES['/lab'];
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <TitleSync />
      <NavBar />
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Navigate to="/lab" replace />} />
          <Route path="/lab" element={<Lab />} />
          <Route path="/threat-map" element={<ThreatMap />} />
          <Route path="/network" element={<NetworkAnalyzer />} />
          <Route path="/scanner" element={<VulnerabilityScanner />} />
          <Route path="/gateway" element={<GatewayExplorer />} />
          <Route path="*" element={<Navigate to="/lab" replace />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}

export default App;
