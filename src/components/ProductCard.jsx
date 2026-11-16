import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function ProductCard({ product }) {
  const navigate = useNavigate();

  const agregarAlCarrito = () => {
    let carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
    
    if (carrito.length > 0 && carrito[0].vendedor_id !== product.vendedor_id) {
      toast.error('Termina tu compra actual antes de pedir en otro local.');
      return;
    }

    const existe = carrito.find(p => p.id === product.id);
    
    if (existe) {
      if (existe.cantidadCompra >= product.cantidad) {
        toast.error('¡Ya no hay más stock de este producto!');
        return;
      }
      existe.cantidadCompra += 1;
    } else {
      carrito.push({ ...product, cantidadCompra: 1 });
    }

    localStorage.setItem('carrito', JSON.stringify(carrito));
    window.dispatchEvent(new Event('carritoActualizado'));
    
    toast.success('¡Agregado al carrito!');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 border border-fv-mostaza/20 overflow-hidden flex flex-col">
      <div className="relative h-48 bg-fv-crema">
        <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
        <div className="absolute top-3 right-3 bg-fv-terracota text-white text-xs font-bold px-3 py-1 rounded-full">
          ¡Para hoy!
        </div>
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-fv-marron leading-tight mb-1">{product.title}</h3>
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.description}</p>
        <div className="flex items-center gap-2 mb-4 text-xs text-fv-naranja font-medium">
          <span>📍</span><span>{product.address}</span>
        </div>

        <div className="mt-auto flex items-end justify-between">
          <div>
            <p className="text-xs text-gray-400 line-through">S/ {product.originalPrice.toFixed(2)}</p>
            <p className="text-xl font-black text-fv-mostaza">S/ {product.discountPrice.toFixed(2)}</p>
          </div>
          <button 
            onClick={agregarAlCarrito}
            className="bg-fv-mostaza text-white px-4 py-2 rounded-xl font-bold hover:bg-fv-naranja transition-colors shadow-sm cursor-pointer"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}