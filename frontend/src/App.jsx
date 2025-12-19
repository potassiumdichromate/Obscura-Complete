import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './context/AppContext';
import Header from './components/Header';
import Home from './pages/Home';
import Alice from './pages/Alice';
import Bob from './pages/Bob';
import Platform from './pages/Platform';
import ProofDashboard from './pages/ProofDashboard';

function App() {
  return (
    <AppProvider>
      <Router>
        <div className="min-h-screen bg-miden-darker blockchain-grid">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/alice" element={<Alice />} />
            <Route path="/bob" element={<Bob />} />
            <Route path="/platform" element={<Platform />} />
            <Route path="/proofs" element={<ProofDashboard />} />
          </Routes>
          
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1e293b',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(16px)',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;
