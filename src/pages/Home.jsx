import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom'; // <-- ESTA ES LA LÍNEA QUE FALTABA
import ProductCard from '../components/ProductCard';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('Todos'); 

  const categorias = ['Todos', 'Menú', 'Postres', 'Panadería', 'Snacks', 'Bebidas'];

  useEffect(() => {
    async function cargarProductos() {
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

  // Lógica de filtrado
  const productosFiltrados = filtro === 'Todos' 
    ? productos 
    : productos.filter(p => p.categoria === filtro);

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-fv-marron">Rescata comida hoy 🍽️</h2>
        <p className="text-fv-terracota font-medium mt-1">Platos de calidad a precios para estudiantes</p>
      </div>
      
      {/* Botones de Categorías */}
      <div className="flex gap-3 overflow-x-auto pb-4 mb-4 hide-scrollbar">
        {categorias.map(cat => (
          <button 
            key={cat}
            onClick={() => setFiltro(cat)}
            className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-colors ${
              filtro === cat ? 'bg-fv-terracota text-white' : 'bg-fv-crema text-fv-marron hover:bg-fv-mostaza/20'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      
      {cargando ? (
        <p className="text-center text-fv-marron font-bold mt-10">Buscando comida disponible...</p>
      ) : productosFiltrados.length === 0 ? (
        <div className="text-center mt-10 p-8 border-2 border-dashed border-fv-mostaza/50 rounded-2xl">
          <p className="text-lg text-fv-marron font-bold">¡No hay comida en esta categoría por ahora!</p>
          <p className="text-gray-500 mt-2">Vuelve más tarde para rescatar más comida deliciosa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {productosFiltrados.map((product) => (
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
                cantidad: product.cantidad, 
                vendedor_id: product.vendedor_id 
              }} 
            />
          ))}
        </div>
      )}

      <footer className="mt-20 pt-8 border-t border-fv-mostaza/30 text-center flex flex-col items-center justify-center">
        <h3 className="font-black text-fv-marron text-lg mb-2">¿Eres un restaurante o panadería?</h3>
        <p className="text-gray-500 text-sm mb-4">No botes tu excedente. Véndelo a estudiantes, recupera costos y ayuda al planeta.</p>
        <Link 
          to="/login" 
          className="text-sm font-bold text-fv-terracota border-2 border-fv-terracota px-6 py-2 rounded-full hover:bg-fv-terracota hover:text-white transition-colors"
        >
          Portal para Vendedores
        </Link>
      </footer>
    </main>
  );
}