import { HashRouter, Routes, Route } from 'react-router-dom';
import Pet from './components/Pet';
import Settings from './components/Settings';
import MockSettings from './components/MockSettings';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Pet />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/mock-settings" element={<MockSettings />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
