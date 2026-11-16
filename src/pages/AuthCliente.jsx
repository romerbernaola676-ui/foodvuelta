import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast'; // <-- NUEVO IMPORT

export default function AuthCliente() {
  const navigate = useNavigate();
  const [esRegistro, setEsRegistro] = useState(false);
  const [cargando, setCargando] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      if (esRegistro) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (data.user) {
          const { error: perfilError } = await supabase
            .from('perfiles_cliente')
            .insert([{ id: data.user.id, nombre, telefono }]);
          
          if (perfilError) throw perfilError;
        }
        
        // <-- NUEVA NOTIFICACIÓN DE ÉXITO
        toast.success('¡Cuenta creada con éxito! Ya puedes pedir comida.', { duration: 4000 });
        navigate('/');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        // <-- NUEVA NOTIFICACIÓN DE ÉXITO
        toast.success('¡Bienvenido de vuelta!');
        navigate('/mis-pedidos');
      }
    } catch (error) {
      // <-- NUEVA NOTIFICACIÓN DE ERROR
      toast.error(error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="max-w-md mx-auto px-6 py-16">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-fv-mostaza/20">
        <h2 className="text-3xl font-black text-fv-marron mb-2 text-center">
          {esRegistro ? 'Únete a Foodvuelta' : 'Bienvenido de vuelta'}
        </h2>
        <p className="text-center text-gray-500 mb-8 text-sm">
          {esRegistro ? 'Rescata comida deliciosa a precios increíbles.' : 'Inicia sesión para ver tus pedidos.'}
        </p>
        
        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          {esRegistro && (
            <>
              <div>
                <label className="block text-sm font-bold text-fv-marron mb-1">Nombre completo</label>
                <input required type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full border rounded-xl p-3 bg-gray-50 focus:outline-none focus:border-fv-naranja" />
              </div>
              <div>
                <label className="block text-sm font-bold text-fv-marron mb-1">Celular / WhatsApp</label>
                <input required type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full border rounded-xl p-3 bg-gray-50 focus:outline-none focus:border-fv-naranja" />
              </div>
            </>
          )}
          
          <div>
            <label className="block text-sm font-bold text-fv-marron mb-1">Correo Electrónico</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded-xl p-3 bg-gray-50 focus:outline-none focus:border-fv-naranja" />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-fv-marron mb-1">Contraseña</label>
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded-xl p-3 bg-gray-50 focus:outline-none focus:border-fv-naranja" />
          </div>

          <button type="submit" disabled={cargando} className="bg-fv-terracota text-white py-3 rounded-xl font-bold hover:bg-red-600 mt-4 transition-colors">
            {cargando ? 'Procesando...' : (esRegistro ? 'Crear Cuenta' : 'Ingresar')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => setEsRegistro(!esRegistro)} className="text-fv-naranja font-bold text-sm hover:underline">
            {esRegistro ? '¿Ya tienes cuenta? Inicia sesión aquí' : '¿No tienes cuenta? Regístrate gratis'}
          </button>
        </div>
      </div>
    </main>
  );
}