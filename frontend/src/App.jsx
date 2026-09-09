import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PresentacionProvider } from './context/PresentacionContext';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PresentacionProvider>
          <AppRoutes />
        </PresentacionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
