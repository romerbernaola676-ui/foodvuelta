import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [recargas, setRecargas] = useState([]);
  const [totalGanado, setTotalGanado] = useState(0);

  useEffect(() => {
    const verificarAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      // Verificar si el correo está en la tabla de administradores
      const { data: admin } = await supabase
        .from('administradores')
        .select('email')
        .eq('email', session.user.email)
        .single();

      if (!admin) {
        toast.error('Acceso denegado. No eres administrador.');
        navigate('/');
        return;
      }

      cargarDatos();
    };
    verificarAdmin();
  }, [navigate]);

  const cargarDatos = async () => {
    // 1. Cargar recargas pendientes
    const { data: dataRecargas } = await supabase
      .from('recargas')
      .select('*, perfiles_vendedor(nombre_local)')
      .order('creado_en', { ascending: false });
    
    if (dataRecargas) setRecargas(dataRecargas);

    // 2. Calcular ganancias totales (Suma de comisiones de todos los pedidos aprobados)
    const { data: pedidos } = await supabase.from('pedidos').select('total_pagado').eq('estado', 'aprobado');
    if (pedidos) {
      const ganancias = pedidos.reduce((acc, p) => acc + (p.total_pagado * 0.10), 0);
      setTotalGanado(ganancias);
    }
    setCargando(false);
  };

  const procesarRecarga = async (recarga, aprobar) => {
    const confirmar = window.confirm(`¿Seguro que deseas ${aprobar ? 'APROBAR' : 'RECHAZAR'} esta recarga de S/ ${recarga.monto}?`);
    if (!confirmar) return;

    const nuevoEstado = aprobar ? 'aprobado' : 'rechazado';
    
    // 1. Actualizar estado de la recarga
    await supabase.from('recargas').update({ estado: nuevoEstado }).eq('id', recarga.id);

    // 2. Si se aprueba, sumarle el saldo al vendedor
    if (aprobar) {
      const { data: perfil } = await supabase.from('perfiles_vendedor').select('saldo_comisiones').eq('id', recarga.vendedor_id).single();
      if (perfil) {
        await supabase.from('perfiles_vendedor')
          .update({ saldo_comisiones: perfil.saldo_comisiones + recarga.monto })
          .eq('id', recarga.vendedor_id);
      }
      toast.success(`Recarga aprobada. Saldo sumado a ${recarga.perfiles_vendedor.nombre_local}`);
    } else {
      toast.success('Recarga rechazada.');
    }
    
    cargarDatos();
  };

  if (cargando) return <p className="text-center mt-10 font-bold">Verificando credenciales de administrador...</p>;

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="bg-fv-marron text-white p-8 rounded-3xl shadow-md mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black mb-1">Panel de Administrador 👑</h2>
          <p className="text-sm text-fv-crema">Control de finanzas de Foodvuelta</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-fv-crema mb-1">Ganancias Históricas (10%)</p>
          <h3 className="text-4xl font-black text-fv-mostaza">S/ {totalGanado.toFixed(2)}</h3>
        </div>
      </div>

      <h3 className="text-xl font-bold text-fv-marron mb-4">Gestión de Recargas</h3>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {recargas.length === 0 ? (
          <p className="p-6 text-center text-gray-500">No hay recargas registradas.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recargas.map(r => (
              <li key={r.id} className="p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-gray-50">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg text-fv-marron">{r.perfiles_vendedor.nombre_local}</span>
                    <span className={`text-xs font-black px-2 py-1 rounded ${
                      r.estado === 'aprobado' ? 'bg-green-100 text-green-700' : r.estado === 'rechazado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {r.estado.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Solicita: <span className="font-black text-fv-naranja text-lg">S/ {r.monto.toFixed(2)}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(r.creado_en).toLocaleString()}</p>
                </div>

                <div className="flex items-center gap-3">
                  <a href={r.voucher_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-purple-600 bg-purple-50 px-4 py-2 rounded-lg hover:bg-purple-100 transition-colors">
                    Ver Voucher
                  </a>
                  
                  {r.estado === 'pendiente' && (
                    <>
                      <button onClick={() => procesarRecarga(r, true)} className="bg-green-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-green-600">
                        Aprobar
                      </button>
                      <button onClick={() => procesarRecarga(r, false)} className="bg-red-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-red-600">
                        Rechazar
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}