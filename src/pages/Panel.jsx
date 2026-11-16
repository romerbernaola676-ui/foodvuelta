import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast'; 

export default function Panel() {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(false);
  
  const [userId, setUserId] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [misProductos, setMisProductos] = useState([]);
  const [misPedidos, setMisPedidos] = useState([]);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('Menú'); 
  const [direccion, setDireccion] = useState('');
  const [precioOrig, setPrecioOrig] = useState('');
  const [precioDesc, setPrecioDesc] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [imagenArchivo, setImagenArchivo] = useState(null);

  // --- NUEVOS ESTADOS PARA RECARGA ---
  const [montoRecarga, setMontoRecarga] = useState('');
  const [voucherRecarga, setVoucherRecarga] = useState(null);
  const [procesandoRecarga, setProcesandoRecarga] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      
      const user = session.user;
      setUserId(user.id);

      const { data: perfil } = await supabase
        .from('perfiles_vendedor')
        .select('saldo_comisiones')
        .eq('id', user.id)
        .single();
        
      if (perfil) setSaldo(perfil.saldo_comisiones);

      cargarInventario(user.id);
      cargarPedidos(user.id);
    };
    cargarDatos();
  }, [navigate]);

  const cargarInventario = async (id) => {
    const { data } = await supabase.from('productos').select('*').eq('vendedor_id', id).order('creado_en', { ascending: false });
    if (data) setMisProductos(data);
  };

  const cargarPedidos = async (id) => {
    const { data } = await supabase.from('pedidos').select('*').eq('vendedor_id', id).order('creado_en', { ascending: false }).limit(10);
    if (data) setMisPedidos(data);
  };

  const handleSubirProducto = async (e) => {
    e.preventDefault();
    
    // --- REGLA DE NEGOCIO: VALIDACIÓN DE SALDO ---
    const comisionActual = misProductos
      .filter(p => p.activo)
      .reduce((sum, p) => sum + (p.precio_descuento * p.cantidad * 0.10), 0);
    
    const comisionNueva = parseFloat(precioDesc) * parseInt(cantidad) * 0.10;
    const saldoLibre = saldo - comisionActual;
    
    if (comisionNueva > saldoLibre) {
      toast.error(
        `Saldo insuficiente. Tienes S/ ${saldo.toFixed(2)} en total, pero S/ ${comisionActual.toFixed(2)} ya respaldan tu inventario activo. Necesitas S/ ${comisionNueva.toFixed(2)} libres para este producto.`, 
        { duration: 7000 }
      );
      return;
    }
    // ---------------------------------------------

    setCargando(true);
    try {
      const fileExt = imagenArchivo.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `comida/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('productos').upload(filePath, imagenArchivo);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('productos').getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('productos').insert([{
        titulo, descripcion, direccion,
        precio_original: parseFloat(precioOrig),
        precio_descuento: parseFloat(precioDesc),
        imagen_url: publicUrl,
        cantidad: parseInt(cantidad),
        vendedor_id: userId,
        categoria,
        activo: true
      }]);
      if (dbError) throw dbError;

      toast.success('¡Producto publicado!');
      setTitulo(''); setDescripcion(''); setDireccion(''); setPrecioOrig(''); setPrecioDesc(''); setCantidad(1); setCategoria('Menú'); setImagenArchivo(null);
      cargarInventario(userId);
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  const toggleActivo = async (productoId, estadoActual) => {
    const { error } = await supabase.from('productos').update({ activo: !estadoActual }).eq('id', productoId);
    if (!error) cargarInventario(userId);
  };

  const aprobarPedido = async (pedidoId) => {
    await supabase.from('pedidos').update({ estado: 'aprobado' }).eq('id', pedidoId);
    toast.success('Pedido aprobado. El cliente ya fue notificado.');
    cargarPedidos(userId);
  };

  const rechazarPedido = async (pedido) => {
    const confirmar = window.confirm("¿Seguro que deseas rechazar este pago? Se devolverá el stock a la tienda y se reembolsará tu comisión.");
    if (!confirmar) return;

    await supabase.from('pedidos').update({ estado: 'rechazado' }).eq('id', pedido.id);

    const comisionDevolver = pedido.total_pagado * 0.10;
    const { data: perfil } = await supabase.from('perfiles_vendedor').select('saldo_comisiones').eq('id', userId).single();
    if (perfil) {
      const nuevoSaldo = perfil.saldo_comisiones + comisionDevolver;
      await supabase.from('perfiles_vendedor').update({ saldo_comisiones: nuevoSaldo }).eq('id', userId);
      setSaldo(nuevoSaldo);
    }

    if (pedido.carrito_json) {
      for (const item of pedido.carrito_json) {
        const { data: prod } = await supabase.from('productos').select('cantidad').eq('id', item.id).single();
        if (prod) {
          await supabase.from('productos').update({ 
            cantidad: prod.cantidad + item.cantidadCompra,
            activo: true 
          }).eq('id', item.id);
        }
      }
      cargarInventario(userId); 
    }

    toast.success('Pago rechazado. Stock y saldo devueltos.');
    cargarPedidos(userId);
  };

  // --- NUEVA FUNCIÓN PARA SOLICITAR RECARGA ---
  const solicitarRecarga = async (e) => {
    e.preventDefault();
    if (!voucherRecarga) { toast.error('Sube la foto del Yape'); return; }
    setProcesandoRecarga(true);

    try {
      const fileExt = voucherRecarga.name.split('.').pop();
      const fileName = `recarga_${userId}_${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('vouchers').upload(fileName, voucherRecarga);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('vouchers').getPublicUrl(fileName);

      await supabase.from('recargas').insert([{
        vendedor_id: userId,
        monto: parseFloat(montoRecarga),
        voucher_url: publicUrl
      }]);

      toast.success('Recarga enviada. Espera a que el administrador la apruebe.');
      setMontoRecarga(''); setVoucherRecarga(null);
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setProcesandoRecarga(false);
    }
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-fv-marron">Panel de Control</h2>
        <button onClick={cerrarSesion} className="text-sm text-red-500 font-bold hover:underline">Cerrar Sesión</button>
      </div>

      <div className="bg-fv-marron text-white p-6 rounded-2xl shadow-md mb-6 flex justify-between items-center">
        <div>
          <p className="text-sm text-fv-crema mb-1">Saldo para comisiones</p>
          <h3 className="text-3xl font-black">S/ {saldo.toFixed(2)}</h3>
        </div>
      </div>

      {/* --- NUEVA SECCIÓN DE RECARGA EN LA UI --- */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-dashed border-fv-mostaza mb-8 flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1">
          <h4 className="font-bold text-fv-marron text-lg">¿Te quedaste sin saldo?</h4>
          <p className="text-sm text-gray-500">Yapea al <strong>999 999 999</strong> (Admin Foodvuelta) y sube tu captura para recargar tu bolsa de comisiones.</p>
        </div>
        <form onSubmit={solicitarRecarga} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <input required type="number" step="0.10" min="1" placeholder="Monto (Ej. 10.00)" value={montoRecarga} onChange={e => setMontoRecarga(e.target.value)} className="border rounded-lg p-2 w-32 focus:border-fv-naranja" />
          <input required type="file" accept="image/*" onChange={e => setVoucherRecarga(e.target.files[0])} className="border rounded-lg p-2 text-sm w-full sm:w-48" />
          <button type="submit" disabled={procesandoRecarga} className="bg-fv-terracota text-white font-bold px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50">
            {procesandoRecarga ? 'Enviando...' : 'Enviar Recarga'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-1">
          <h3 className="text-xl font-bold text-fv-marron mb-4">Nuevo Excedente</h3>
          <form onSubmit={handleSubirProducto} className="bg-white p-6 rounded-2xl shadow-sm border border-fv-mostaza/20 flex flex-col gap-4">
            <div>
              <label className="block text-sm font-bold text-fv-marron mb-1">Título del Plato</label>
              <input required type="text" value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full border rounded-lg p-2" />
            </div>
            <div>
              <label className="block text-sm font-bold text-fv-marron mb-1">Descripción</label>
              <textarea required value={descripcion} onChange={e => setDescripcion(e.target.value)} className="w-full border rounded-lg p-2" rows="2" />
            </div>
            <div>
              <label className="block text-sm font-bold text-fv-marron mb-1">Categoría</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full border rounded-lg p-2 bg-white">
                <option value="Menú">Menú</option><option value="Postres">Postres</option><option value="Panadería">Panadería</option><option value="Snacks">Snacks</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-fv-marron mb-1">Dirección de recojo</label>
              <input required type="text" value={direccion} onChange={e => setDireccion(e.target.value)} className="w-full border rounded-lg p-2" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-fv-marron mb-1">Normal (S/)</label>
                <input required type="number" step="0.10" value={precioOrig} onChange={e => setPrecioOrig(e.target.value)} className="w-full border rounded-lg p-2" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-fv-mostaza mb-1">Descuento</label>
                <input required type="number" step="0.10" value={precioDesc} onChange={e => setPrecioDesc(e.target.value)} className="w-full border border-fv-mostaza rounded-lg p-2" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-fv-marron mb-1">Stock</label>
              <input required type="number" min="1" value={cantidad} onChange={e => setCantidad(e.target.value)} className="w-full border rounded-lg p-2" />
            </div>
            <div>
              <label className="block text-sm font-bold text-fv-marron mb-1">Foto</label>
              <input required type="file" accept="image/*" onChange={e => setImagenArchivo(e.target.files[0])} className="w-full border rounded-lg p-2 text-sm" />
            </div>
            <button type="submit" disabled={cargando} className="bg-fv-terracota text-white py-3 rounded-xl font-bold hover:bg-red-600 mt-2 disabled:opacity-50">
              {cargando ? 'Publicando...' : 'Publicar Producto'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-1">
          <h3 className="text-xl font-bold text-fv-marron mb-4">Mi Inventario</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {misProductos.length === 0 ? (
              <p className="p-6 text-center text-gray-500">Aún no has subido productos.</p>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {misProductos.map(prod => (
                  <li key={prod.id} className={`p-4 flex items-center gap-4 ${!prod.activo ? 'opacity-60 bg-gray-50' : ''}`}>
                    <img src={prod.imagen_url} alt={prod.titulo} className="w-16 h-16 rounded-lg object-cover" />
                    <div className="flex-1">
                      <h4 className="font-bold text-fv-marron text-sm leading-tight mb-1">{prod.titulo}</h4>
                      <p className="text-xs text-gray-500 font-medium">Stock: {prod.cantidad}</p>
                    </div>
                    <button 
                      onClick={() => toggleActivo(prod.id, prod.activo)}
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${prod.activo ? 'border-red-500 text-red-500 hover:bg-red-50' : 'border-green-500 text-green-500 hover:bg-green-50'}`}
                    >
                      {prod.activo ? 'Pausar' : 'Activar'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <h3 className="text-xl font-bold text-fv-marron mb-4">Pedidos Recientes</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-fv-mostaza/30 overflow-hidden">
            {misPedidos.length === 0 ? (
              <p className="p-6 text-center text-gray-500">Aún no tienes ventas.</p>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {misPedidos.map(pedido => (
                  <li key={pedido.id} className={`p-4 hover:bg-fv-crema/20 transition-colors ${pedido.estado === 'rechazado' ? 'opacity-50' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                      {pedido.estado === 'aprobado' ? (
                        <span className="bg-green-500 text-white text-xs font-black px-2 py-1 rounded tracking-wider">
                          ✅ {pedido.codigo_recojo}
                        </span>
                      ) : pedido.estado === 'rechazado' ? (
                        <span className="bg-red-500 text-white text-xs font-black px-2 py-1 rounded tracking-wider line-through">
                          ❌ RECHAZADO
                        </span>
                      ) : (
                        <span className="bg-gray-400 text-white text-xs font-black px-2 py-1 rounded tracking-wider">
                          ⏳ {pedido.codigo_recojo}
                        </span>
                      )}
                      
                      <span className="text-fv-naranja font-black text-sm">
                        S/ {pedido.total_pagado.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 leading-tight">
                      {pedido.detalles_pedido}
                    </p>
                    <div className="flex justify-between items-center mt-3">
                      <p className="text-xs text-gray-400">
                        {new Date(pedido.creado_en).toLocaleString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      
                      {pedido.voucher_url && (
                        <a href={pedido.voucher_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-purple-600 border border-purple-200 bg-purple-50 px-2 py-1 rounded hover:bg-purple-100">
                          Ver Yape
                        </a>
                      )}
                    </div>

                    {pedido.estado === 'pendiente' && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                        <button 
                          onClick={() => aprobarPedido(pedido.id)} 
                          className="flex-1 bg-green-500 text-white text-xs font-bold py-2 rounded hover:bg-green-600 transition-colors"
                        >
                          Habilitar Código
                        </button>
                        <button 
                          onClick={() => rechazarPedido(pedido)} 
                          className="flex-1 bg-red-500 text-white text-xs font-bold py-2 rounded hover:bg-red-600 transition-colors"
                        >
                          Rechazar Pago
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}