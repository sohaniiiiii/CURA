import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Chatbot from './pages/Chatbot';
import Profile from './pages/Profile';
import UseCases from './pages/UseCases';
import Features from './pages/Features';
import About from './pages/About';
import Contact from './pages/Contact';

// PHASE 1 SECURITY FIX: ProtectedRoute guards authenticated-only pages.
// Previously /chatbot and /profile were accessible to any unauthenticated user.
// Old behaviour: <Route path="/chatbot" element={<Chatbot />} />
// New behaviour: wrapped in ProtectedRoute which redirects to /login if not authenticated.
const ProtectedRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null; // wait for auth check before redirecting
  return isAuthenticated ? element : <Navigate to="/login" replace />;
};

function AppRoutes() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        {/* PHASE 1: /chatbot and /profile now require authentication */}
        <Route path="/chatbot" element={<ProtectedRoute element={<Chatbot />} />} />
        <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} />
        <Route path="/*" element={
          <div>
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/use-cases" element={<UseCases />} />
              <Route path="/features" element={<Features />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
            </Routes>
          </div>
        } />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;