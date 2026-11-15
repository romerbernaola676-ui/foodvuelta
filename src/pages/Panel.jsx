import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Panel() {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(false);
  
  // Estados del usuario y dashboard
  const [userId, setUserId] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [misProductos, setMisProductos] = useState([]);

  // Estados del formulario
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [direccion, setDireccion] = useState('');
  const [precioOrig, setPrecioOrig] = useState('');
  const [precioDesc, setPrecioDesc] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [imagenArchivo, setImagenArchivo] = useState(null);

  // Cargar datos al iniciar sesión
  useEffect(() => {
    const cargarDatos = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      
      const user = session.user;
      setUserId(user.id);

      // 1. Cargar saldo del vendedor
      const { data: perfil } = await supabase
        .from('perfiles_vendedor')
        .select('saldo_comisiones')
        .eq('id', user.id)
        .single();
        
      if (perfil) setSaldo(perfil.saldo_comisiones);

      // 2. Cargar inventario del vendedor
      cargarInventario(user.id);
    };

    cargarDatos();
  }, [navigate]);

  const cargarInventario = async (id) => {
    const { data } = await supabase
      .from('productos')
      .select('*')
      .eq('vendedor_id', id)
      .order('creado_en', { ascending: false });
    
    if (data) setMisProductos(data);
  };

  const handleSubirProducto = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      // 1. Subir la imagen al Bucket "productos"
      const fileExt = imagenArchivo.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `comida/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('productos')
        .upload(filePath, imagenArchivo);

      if (uploadError) throw uploadError;

      // 2. Obtener la URL pública de la imagen
      const { data: { publicUrl } } = supabase.storage
        .from('productos')
        .getPublicUrl(filePath);

      // 3. Guardar todo en la base de datos incluyendo cantidad y dueño
      const { error: dbError } = await supabase
        .from('productos')
        .insert([
          {
            titulo,
            descripcion,
            direccion,
            precio_original: parseFloat(precioOrig),
            precio_descuento: parseFloat(precioDesc),
            imagen_url: publicUrl,
            cantidad: parseInt(cantidad),
            vendedor_id: userId,
            activo: true
          }
        ]);

      if (dbError) throw dbError;

      alert('¡Producto publicado con éxito!');
      
      // Limpiar formulario y recargar lista
      setTitulo(''); setDescripcion(''); setDireccion(''); 
      setPrecioOrig(''); setPrecioDesc(''); setCantidad(1); setImagenArchivo(null);
      cargarInventario(userId);

    } catch (error) {
      alert('Error al publicar: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  const toggleActivo = async (productoId, estadoActual) => {
    const { error } = await supabase
      .from('productos')
      .update({ activo: !estadoActual })
      .eq('id', productoId);
      
    if (!error) {
      cargarInventario(userId);
    }
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-fv-marron">Panel de Control</h2>
        <button onClick={cerrarSesion} className="text-sm text-red-500 font-bold hover:underline">
          Cerrar Sesión
        </button>
      </div>

      {/* Tarjeta de Saldo Prepago */}
      <div className="bg-fv-marron text-white p-6 rounded-2xl shadow-md mb-8 flex justify-between items-center">
        <div>
          <p className="text-sm text-fv-crema mb-1">Saldo para comisiones</p>
          <h3 className="text-3xl font-black">S/ {saldo.toFixed(2)}</h3>
        </div>
        <a 
          href={`https://wa.me/51929679785?text=Hola Foodvuelta, quiero recargar mi saldo de comisiones.`} 
          target="_blank" 
          rel="noreferrer"
          className="bg-fv-mostaza text-white px-5 py-2 rounded-xl font-bold hover:bg-fv-naranja transition-colors"
        >
          Recargar Saldo
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Formulario de Nuevo Producto */}
        <div>
          <h3 className="text-xl font-bold text-fv-marron mb-4">Nuevo Excedente</h3>
          <form onSubmit={handleSubirProducto} className="bg-white p-6 rounded-2xl shadow-sm border border-fv-mostaza/20 flex flex-col gap-4">
            <div>
              <label className="block text-sm font-bold text-fv-marron mb-1">Título del Plato</label>
              <input required type="text" value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full border rounded-lg p-2" placeholder="Ej. Menú Ejecutivo" />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-fv-marron mb-1">Descripción</label>
              <textarea required value={descripcion} onChange={e => setDescripcion(e.target.value)} className="w-full border rounded-lg p-2" rows="2" placeholder="Detalles de la comida..." />
            </div>

            <div>
              <label className="block text-sm font-bold text-fv-marron mb-1">Dirección de recojo</label>
              <input required type="text" value={direccion} onChange={e => setDireccion(e.target.value)} className="w-full border rounded-lg p-2" />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-fv-marron mb-1">Precio Normal (S/)</label>
                <input required type="number" step="0.10" value={precioOrig} onChange={e => setPrecioOrig(e.target.value)} className="w-full border rounded-lg p-2" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-fv-mostaza mb-1">Precio Descuento (S/)</label>
                <input required type="number" step="0.10" value={precioDesc} onChange={e => setPrecioDesc(e.target.value)} className="w-full border border-fv-mostaza rounded-lg p-2" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-fv-marron mb-1">Cantidad disponible (Stock)</label>
              <input required type="number" min="1" value={cantidad} onChange={e => setCantidad(e.target.value)} className="w-full border rounded-lg p-2" />
            </div>

            <div>
              <label className="block text-sm font-bold text-fv-marron mb-1">Foto del producto</label>
              <input required type="file" accept="image/*" onChange={e => setImagenArchivo(e.target.files[0])} className="w-full border rounded-lg p-2 text-sm" />
            </div>

            <button type="submit" disabled={cargando} className="bg-fv-terracota text-white py-3 rounded-xl font-bold hover:bg-red-600 mt-2 disabled:opacity-50">
              {cargando ? 'Publicando...' : 'Publicar Producto'}
            </button>
          </form>
        </div>

        {/* Gestor de Inventario */}
        <div>
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
                      <h4 className="font-bold text-fv-marron text-sm">{prod.titulo}</h4>
                      <p className="text-xs text-gray-500">Stock: {prod.cantidad} | S/ {prod.precio_descuento.toFixed(2)}</p>
                    </div>
                    <button 
                      onClick={() => toggleActivo(prod.id, prod.activo)}
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${prod.activo ? 'border-red-500 text-red-500 hover:bg-red-50' : 'border-green-500 text-green-500 hover:bg-green-50'}`}
                    >
                      {prod.activo ? 'Pausar' : 'Reactivar'}
                    </button>
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