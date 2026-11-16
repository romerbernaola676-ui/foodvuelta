import logo from '../assets/logo.png'; 
import { Link } from 'react-router-dom'; 
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Header() {
  const [cantidadItems, setCantidadItems] = useState(0);
  const [sesion, setSesion] = useState(null);
  const [tipoUsuario, setTipoUsuario] = useState(null); // 'cliente' o 'vendedor'

  const calcularTotalItems = () => {
    const carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
    const total = carrito.reduce((acc, item) => acc + item.cantidadCompra, 0);
    setCantidadItems(total);
  };

  useEffect(() => {
    calcularTotalItems();
    window.addEventListener('carritoActualizado', calcularTotalItems);
    window.addEventListener('storage', calcularTotalItems);
    
    const verificarUsuario = async (session) => {
      setSesion(session);
      if (session) {
        // Verificar si el usuario actual es un vendedor
        const { data: vendedor } = await supabase
          .from('perfiles_vendedor')
          .select('id')
          .eq('id', session.user.id)
          .single();

        if (vendedor) {
          setTipoUsuario('vendedor');
        } else {
          setTipoUsuario('cliente');
        }
      } else {
        setTipoUsuario(null);
      }
    };

    // Revisar sesión al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      verificarUsuario(session);
    });

    // Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      verificarUsuario(session);
    });
    
    return () => {
      window.removeEventListener('carritoActualizado', calcularTotalItems);
      window.removeEventListener('storage', calcularTotalItems);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="bg-fv-crema shadow-md px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <Link to="/" className="flex items-center gap-3">
        <img src={logo} alt="Logo Foodvuelta" className="w-14 h-14 object-contain" />
        <div>
          <h1 className="text-2xl font-black text-fv-marron leading-none">FOODVUELTA</h1>
          <p className="text-sm text-fv-terracota font-medium">Dale otra vuelta al sabor.</p>
        </div>
      </Link>
      
      <div className="flex items-center gap-4 sm:gap-6">
        
        {/* BOTÓN DINÁMICO: Panel, Perfil o Ingreso */}
        {sesion ? (
          tipoUsuario === 'vendedor' ? (
            <Link to="/panel" className="text-sm font-bold text-fv-marron hover:text-fv-naranja transition-colors">
              🏢 Panel de Control
            </Link>
          ) : (
            <Link to="/mis-pedidos" className="text-sm font-bold text-fv-marron hover:text-fv-naranja transition-colors">
              👤 Mi Perfil
            </Link>
          )
        ) : (
          <Link to="/ingresar" className="text-sm font-bold text-fv-terracota hover:text-fv-naranja transition-colors">
            Ingresar / Registro
          </Link>
        )}
        
        {/* CARRITO: Oculto para los vendedores */}
        {tipoUsuario !== 'vendedor' && (
          <Link to="/carrito" className="relative bg-fv-naranja text-white px-4 py-2 sm:px-5 rounded-full font-bold shadow-sm hover:bg-fv-terracota transition-colors flex items-center gap-2">
            <span>🛒</span>
            <span className="hidden sm:inline">Carrito</span>
            
            {cantidadItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-fv-marron text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                {cantidadItems}
              </span>
            )}
          </Link>
        )}
      </div>
    </header>
  );
}