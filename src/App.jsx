// src\APP.jsx

// src/App.jsx

import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminKnowledgeBase from './pages/AdminKnowledgeBase';
import Login from './pages/Login';
import Chat from './pages/Chat';
import CityAnalysis from './pages/CityAnalysis';
import BackendOff from './pages/BackendOff';
import { selectAvailableBackend } from './utils/url';
import './App.css';

function App() {
  const [backendStatus, setBackendStatus] = useState('loading'); // loading, online, offline

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const url = await selectAvailableBackend();
        if (url) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch (error) {
        console.error("Error checking backend:", error);
        setBackendStatus('offline');
      }
    };
    checkBackend();
  }, []);

  if (backendStatus === 'loading') {
    return <div>Loading...</div>; // Or a more sophisticated loading spinner
  } else if (backendStatus === 'offline') {
    return <BackendOff />;
  } else {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/city-analysis" element={<CityAnalysis />} />
          <Route path="/admin/knowledgebase" element={<AdminKnowledgeBase />} />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    );
  }
}

export default App;

