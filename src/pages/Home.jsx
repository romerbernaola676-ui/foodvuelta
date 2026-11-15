import { useEffect, useState } from 'react';
import ProductCard from '../components/ProductCard';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarProductos() {
      // Modificamos la consulta para traer SOLO platos activos y con stock disponible
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .gt('cantidad', 0)
        .order('creado_en', { ascending: false });

      if (error) console.error("Error al cargar:", error);
      else setProductos(data);
      
      setCargando(false);
    }
    
    cargarProductos();
  }, []);

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-fv-marron">Rescata comida hoy 🍽️</h2>
        <p className="text-fv-terracota font-medium mt-1">Platos de calidad a precios para estudiantes</p>
      </div>
      
      {cargando ? (
        <p className="text-center text-fv-marron font-bold mt-10">Buscando comida disponible...</p>
      ) : productos.length === 0 ? (
        <div className="text-center mt-10 p-8 border-2 border-dashed border-fv-mostaza/50 rounded-2xl">
          <p className="text-lg text-fv-marron font-bold">¡Todo se ha agotado por ahora!</p>
          <p className="text-gray-500 mt-2">Vuelve más tarde para rescatar más comida deliciosa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {productos.map((product) => (
            <ProductCard 
              key={product.id} 
              product={{
                id: product.id,
                title: product.titulo,
                description: product.descripcion,
                address: product.direccion,
                originalPrice: product.precio_original,
                discountPrice: product.precio_descuento,
                image: product.imagen_url,
                cantidad: product.cantidad // Pasamos la cantidad por si la necesitas mostrar en la tarjeta
              }} 
            />
          ))}
        </div>
      )}
    </main>
  );
}