import { HashRouter, Routes, Route } from 'react-router-dom';
import Pet from './components/Pet';
import Settings from './components/Settings';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Pet />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
