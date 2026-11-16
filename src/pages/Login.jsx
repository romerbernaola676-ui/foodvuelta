import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast'; // <-- IMPORT AGREGADO

export default function Login() {
  const navigate = useNavigate();
  const [esRegistro, setEsRegistro] = useState(false);
  const [cargando, setCargando] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreLocal, setNombreLocal] = useState('');
  const [telefonoYape, setTelefonoYape] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      if (esRegistro) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        if (data.user) {
          const { error: perfilError } = await supabase
            .from('perfiles_vendedor')
            .insert([{ 
              id: data.user.id, 
              nombre_local: nombreLocal, 
              telefono_yape: telefonoYape,
              saldo_comisiones: 0 
            }]);
          
          if (perfilError) throw perfilError;
        }
        toast.success('¡Restaurante registrado con éxito! Te recomendamos recargar tu saldo en el panel para publicar.', { duration: 5000 }); // <-- TOAST EN VEZ DE ALERT
        navigate('/panel');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('¡Sesión iniciada!'); // <-- TOAST DE ÉXITO
        navigate('/panel');
      }
    } catch (error) {
      toast.error("Error: " + error.message); // <-- TOAST EN VEZ DE ALERT
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="max-w-md mx-auto px-6 py-16">
      <div className="mb-6 flex items-center justify-center">
        <Link to="/" className="text-fv-terracota font-bold hover:underline">← Volver al inicio</Link>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-fv-mostaza/20">
        <h2 className="text-3xl font-black text-fv-marron mb-2 text-center">
          {esRegistro ? 'Registra tu Local' : 'Portal de Vendedores'}
        </h2>
        <p className="text-center text-gray-500 mb-8 text-sm">
          {esRegistro ? 'Vende tu excedente y recupera tus costos.' : 'Gestiona tu inventario y pedidos.'}
        </p>
        
        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          {esRegistro && (
            <>
              <div>
                <label className="block text-sm font-bold text-fv-marron mb-1">Nombre del Restaurante / Local</label>
                <input 
                  required 
                  type="text" 
                  value={nombreLocal} 
                  onChange={(e) => setNombreLocal(e.target.value)} 
                  className="w-full border rounded-xl p-3 bg-gray-50 focus:outline-none focus:border-fv-naranja" 
                  placeholder="Ej. Menús Doña Pepa"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-fv-marron mb-1">Número de Yape (Para recibir pagos)</label>
                <input 
                  required 
                  type="tel" 
                  value={telefonoYape} 
                  onChange={(e) => setTelefonoYape(e.target.value)} 
                  className="w-full border rounded-xl p-3 bg-gray-50 focus:outline-none focus:border-fv-naranja" 
                  placeholder="999 888 777"
                />
              </div>
            </>
          )}
          
          <div>
            <label className="block text-sm font-bold text-fv-marron mb-1">Correo Electrónico</label>
            <input 
              required 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full border rounded-xl p-3 bg-gray-50 focus:outline-none focus:border-fv-naranja" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-fv-marron mb-1">Contraseña</label>
            <input 
              required 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full border rounded-xl p-3 bg-gray-50 focus:outline-none focus:border-fv-naranja" 
            />
          </div>

          <button 
            type="submit" 
            disabled={cargando} 
            className="bg-fv-marron text-white py-3 rounded-xl font-bold hover:bg-fv-terracota mt-4 transition-colors"
          >
            {cargando ? 'Procesando...' : (esRegistro ? 'Crear Cuenta de Vendedor' : 'Ingresar al Panel')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setEsRegistro(!esRegistro)} 
            className="text-fv-naranja font-bold text-sm hover:underline"
          >
            {esRegistro ? '¿Ya tienes cuenta? Inicia sesión aquí' : '¿Quieres vender? Registra tu local gratis'}
          </button>
        </div>
      </div>
    </main>
  );
}