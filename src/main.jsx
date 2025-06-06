import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import BackendOff from './pages/BackendOff.jsx'
import { selectAvailableBackend } from './utils/url'

function Root() {
  const [loading, setLoading] = useState(true);
  const [backendUrl, setBackendUrl] = useState(null);

  useEffect(() => {
    selectAvailableBackend()
      .then(url => {
        setBackendUrl(url);
        setLoading(false);
      })
      .catch(error => {
        console.error(error);
        setLoading(false);
      });
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
