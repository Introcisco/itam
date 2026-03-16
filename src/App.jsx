import { useState, createContext, useContext, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AssetList from './pages/AssetList';
import AssetDetail from './pages/AssetDetail';
import AssetForm from './pages/AssetForm';
import MaintenanceList from './pages/MaintenanceList';
import DisposalList from './pages/DisposalList';
import AuditLog from './pages/AuditLog';
import Reports from './pages/Reports';
import Login from './pages/Login';
import { seedDatabase } from './db/seedData';
import { CheckCircle, AlertCircle, AlertTriangle, X } from 'lucide-react';

// Toast context
const ToastContext = createContext();
export const useToast = () => useContext(ToastContext);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const icons = {
    success: <CheckCircle size={16} />,
    error: <AlertCircle size={16} />,
    warning: <AlertTriangle size={16} />,
  };

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {icons[t.type]}
            <span style={{ flex: 1 }}>{t.message}</span>
            <button className="btn-ghost" onClick={() => removeToast(t.id)} style={{ padding: 2 }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Route guard: redirect to /login if not authenticated
function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
}

// Route guard: redirect logged-in users away from /login
function PublicRoute({ children }) {
  const { currentUser } = useAuth();
  if (currentUser) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  useEffect(() => {
    seedDatabase();
  }, []);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <ToastProvider>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/assets" element={<AssetList />} />
                  <Route path="/assets/new" element={<AssetForm />} />
                  <Route path="/assets/:id" element={<AssetDetail />} />
                  <Route path="/assets/:id/edit" element={<AssetForm />} />
                  <Route path="/maintenance" element={<MaintenanceList />} />
                  <Route path="/disposal" element={<DisposalList />} />
                  <Route path="/audit" element={<AuditLog />} />
                  <Route path="/reports" element={<Reports />} />
                </Routes>
              </Layout>
            </ToastProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
