import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function PanelCliente() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let suscripcion; // Variable para guardar la conexión en vivo

    const cargarDatos = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/ingresar'); 
        return;
      }

      const clienteId = session.user.id;

      // Obtener el nombre del cliente
      const { data: perfil } = await supabase
        .from('perfiles_cliente')
        .select('nombre')
        .eq('id', clienteId)
        .single();
      
      if (perfil) setNombre(perfil.nombre);

      // Función para cargar los pedidos
      const fetchPedidos = async () => {
        const { data } = await supabase
          .from('pedidos')
          .select('*')
          .eq('cliente_id', clienteId)
          .order('creado_en', { ascending: false });
        if (data) setPedidos(data);
      };

      await fetchPedidos();
      setCargando(false);

      // --- MAGIA EN TIEMPO REAL ---
      // Escuchamos cualquier actualización en la tabla 'pedidos' que pertenezca a este cliente
      suscripcion = supabase
        .channel('cambios-pedidos')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `cliente_id=eq.${clienteId}` },
          (payload) => {
            // Cuando el restaurante cambia el estado, actualizamos la lista al instante
            setPedidos(pedidosActuales => 
              pedidosActuales.map(p => p.id === payload.new.id ? payload.new : p)
            );
          }
        )
        .subscribe();
    };

    cargarDatos();

    // Limpiar la suscripción cuando el usuario salga de la pantalla
    return () => {
      if (suscripcion) supabase.removeChannel(suscripcion);
    };
  }, [navigate]);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (cargando) return <p className="text-center mt-10 font-bold text-fv-marron">Cargando tu perfil...</p>;

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-fv-mostaza/20">
        <div>
          <h2 className="text-2xl font-black text-fv-marron">Hola, {nombre ? nombre.split(' ')[0] : 'Foodvuelter'} 👋</h2>
          <p className="text-gray-500 text-sm">Aquí están tus rescates de comida.</p>
        </div>
        <button onClick={cerrarSesion} className="text-sm font-bold text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors">
          Cerrar Sesión
        </button>
      </div>

      <h3 className="text-xl font-bold text-fv-marron mb-4">Tus Pedidos</h3>
      
      {pedidos.length === 0 ? (
        <div className="text-center bg-fv-crema/30 p-10 rounded-2xl border-2 border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">Aún no has rescatado ningún plato.</p>
          <Link to="/" className="bg-fv-mostaza text-white px-6 py-3 rounded-xl font-bold hover:bg-fv-naranja">Explorar comida</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pedidos.map(pedido => (
            <div key={pedido.id} className={`p-6 rounded-2xl shadow-sm border-2 relative overflow-hidden transition-all duration-500 ${
              pedido.estado === 'aprobado' ? 'border-green-400 bg-green-50' : 
              pedido.estado === 'rechazado' ? 'border-red-300 bg-red-50 opacity-75' : 
              'border-fv-mostaza bg-white animate-pulse' // Efecto visual mientras espera
            }`}>
              
              <div className="absolute top-0 right-0 px-4 py-1 text-xs font-black rounded-bl-xl text-white tracking-wider" style={{
                backgroundColor: pedido.estado === 'aprobado' ? '#22c55e' : pedido.estado === 'rechazado' ? '#ef4444' : '#eab308'
              }}>
                {pedido.estado === 'aprobado' ? '✅ APROBADO' : pedido.estado === 'rechazado' ? '❌ RECHAZADO' : '⏳ ESPERANDO HABILITACIÓN'}
              </div>

              <div className="mt-4 mb-2">
                <p className="text-xs text-gray-500 mb-1">Código de recojo:</p>
                <div className={`text-3xl font-black tracking-widest ${pedido.estado === 'rechazado' ? 'text-gray-400 line-through' : 'text-fv-marron'}`}>
                  {pedido.codigo_recojo}
                </div>
              </div>
              
              <p className="font-medium text-gray-800 leading-tight mb-4">{pedido.detalles_pedido}</p>
              
              <div className="flex justify-between items-end border-t pt-4 border-gray-200/50">
                <span className="text-xs text-gray-500">
                  {new Date(pedido.creado_en).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="font-black text-fv-naranja text-lg">S/ {pedido.total_pagado.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}