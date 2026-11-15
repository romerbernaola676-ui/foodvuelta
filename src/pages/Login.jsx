import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Credenciales incorrectas');
    } else {
      navigate('/panel');
    }
  };

  return (
    <main className="max-w-md mx-auto px-6 py-20">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-fv-mostaza/20">
        <h2 className="text-2xl font-black text-fv-marron mb-6 text-center">Acceso Vendedores</h2>
        
        {error && <p className="bg-red-100 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</p>}
        
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold text-fv-marron mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              required
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-fv-naranja"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-fv-marron mb-1">Contraseña</label>
            <input 
              type="password" 
              required
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-fv-naranja"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="bg-fv-mostaza text-white py-3 rounded-xl font-bold hover:bg-fv-naranja transition-colors mt-2">
            Ingresar
          </button>
        </form>
      </div>
    </main>
  );
}