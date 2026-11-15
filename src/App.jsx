import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Panel from './pages/Panel';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#fdf8f5]">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/carrito" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/panel" element={<Panel />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
