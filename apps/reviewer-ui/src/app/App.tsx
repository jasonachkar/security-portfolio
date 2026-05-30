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
import Landing from '../pages/Landing';
import Lab from '../pages/Lab';
import ThreatMap from '../pages/ThreatMap';
import Projects from '../pages/Projects';
import About from '../pages/About';

const TITLES: Record<string, string> = {
  '/': 'Jason Achkar — Cloud Security Portfolio',
  '/lab': 'Lab · Cloud Security Portfolio',
  '/threat-map': 'Threat Map · Cloud Security Portfolio',
  '/projects': 'Projects · Cloud Security Portfolio',
  '/about': 'About · Cloud Security Portfolio',
};

function TitleSync() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = TITLES[pathname] ?? TITLES['/'];
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
          <Route path="/" element={<Landing />} />
          <Route path="/lab" element={<Lab />} />
          <Route path="/threat-map" element={<ThreatMap />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}

export default App;
