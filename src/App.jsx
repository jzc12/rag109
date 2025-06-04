import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminKnowledgeBase from './pages/AdminKnowledgeBase';
import Login from './pages/Login';
import Chat from './pages/Chat';
import CityAnalysis from './pages/CityAnalysis';
import './App.css';

function App() {
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

export default App;
