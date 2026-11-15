import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Panel() {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(false);
  
  // Estados del formulario
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [direccion, setDireccion] = useState('');
  const [precioOrig, setPrecioOrig] = useState('');
  const [precioDesc, setPrecioDesc] = useState('');
  const [imagenArchivo, setImagenArchivo] = useState(null);

  // Verificar si hay sesión activa
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/login');
    });
  }, [navigate]);

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

      // 3. Guardar todo en la base de datos
      const { error: dbError } = await supabase
        .from('productos')
        .insert([
          {
            titulo,
            descripcion,
            direccion,
            precio_original: parseFloat(precioOrig),
            precio_descuento: parseFloat(precioDesc),
            imagen_url: publicUrl
          }
        ]);

      if (dbError) throw dbError;

      alert('¡Producto publicado con éxito en Foodvuelta!');
      // Limpiar formulario
      setTitulo(''); setDescripcion(''); setDireccion(''); 
      setPrecioOrig(''); setPrecioDesc(''); setImagenArchivo(null);

    } catch (error) {
      alert('Error al publicar: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black text-fv-marron">Nuevo Excedente</h2>
        <button onClick={cerrarSesion} className="text-sm text-red-500 font-bold hover:underline">
          Cerrar Sesión
        </button>
      </div>

      <form onSubmit={handleSubirProducto} className="bg-white p-6 rounded-2xl shadow-sm border border-fv-mostaza/20 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-bold text-fv-marron mb-1">Título del Plato</label>
          <input required type="text" value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full border rounded-lg p-2" placeholder="Ej. Menú Ejecutivo" />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-fv-marron mb-1">Descripción</label>
          <textarea required value={descripcion} onChange={e => setDescripcion(e.target.value)} className="w-full border rounded-lg p-2" rows="3" placeholder="Detalles de la comida..." />
        </div>

        <div>
          <label className="block text-sm font-bold text-fv-marron mb-1">Dirección de recojo</label>
          <input required type="text" value={direccion} onChange={e => setDireccion(e.target.value)} className="w-full border rounded-lg p-2" placeholder="Local exacto" />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-bold text-fv-marron mb-1">Precio Original (S/)</label>
            <input required type="number" step="0.10" value={precioOrig} onChange={e => setPrecioOrig(e.target.value)} className="w-full border rounded-lg p-2" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-bold text-fv-mostaza mb-1">Precio Descuento (S/)</label>
            <input required type="number" step="0.10" value={precioDesc} onChange={e => setPrecioDesc(e.target.value)} className="w-full border border-fv-mostaza rounded-lg p-2" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-fv-marron mb-1">Foto del producto</label>
          <input required type="file" accept="image/*" onChange={e => setImagenArchivo(e.target.files[0])} className="w-full border rounded-lg p-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-fv-crema file:text-fv-marron" />
        </div>

        <button type="submit" disabled={cargando} className="bg-fv-terracota text-white py-3 rounded-xl font-bold hover:bg-red-600 mt-4 disabled:opacity-50">
          {cargando ? 'Publicando...' : 'Publicar Producto'}
        </button>
      </form>
    </main>
  );
}