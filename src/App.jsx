import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; 
import Header from './components/Header';
import Home from './pages/Home';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Panel from './pages/Panel';
import AuthCliente from './pages/AuthCliente';
import PanelCliente from './pages/PanelCliente';
import AdminPanel from './pages/AdminPanel'; // <-- NUEVO IMPORT

function App() {
  return (
    <Router>
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        }}
      />
      
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/carrito" element={<Cart />} />
        
        <Route path="/login" element={<Login />} />
        <Route path="/panel" element={<Panel />} />
        
        <Route path="/ingresar" element={<AuthCliente />} />
        <Route path="/mis-pedidos" element={<PanelCliente />} />

        <Route path="/admin" element={<AdminPanel />} /> {/* <-- NUEVA RUTA ADMIN */}
      </Routes>
    </Router>
  );
}

export default App;