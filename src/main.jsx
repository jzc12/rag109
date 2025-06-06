import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import BackendOff from './pages/BackendOff.jsx'
import { selectAvailableBackend } from './utils/url'

function Root() {
  const [loading, setLoading] = useState(true);
  const [backendUrl, setBackendUrl] = useState(null);

  useEffect(() => {
    const fetchBackend = async () => {
      await selectAvailableBackend()
        .then(url => {
          setBackendUrl(url);
          console.log("ac");
          setLoading(false);
        });
    };
    fetchBackend();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!backendUrl) {
    return <BackendOff />;
  }

  return (
    <StrictMode>
      <App />
    </StrictMode>
  );
}

createRoot(document.getElementById('root')).render(<Root />);
