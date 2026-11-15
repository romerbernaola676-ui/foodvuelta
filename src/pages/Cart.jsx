import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Cart() {
  const [producto, setProducto] = useState(null);
  const [pagado, setPagado] = useState(false);
  const [codigoRecojo, setCodigoRecojo] = useState('');

  useEffect(() => {
    const guardado = localStorage.getItem('producto_seleccionado');
    if (guardado) {
      setProducto(JSON.parse(guardado));
    }
  }, []);

  // Variables calculadas fuera de la condición para poder usarlas en WhatsApp
  const subtotal = producto ? producto.discountPrice : 0; 
  const comision = subtotal * 0.10; 
  const total = subtotal + comision;

  const confirmarPago = async () => {
    // 1. Generar código visual
    const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
    setCodigoRecojo(codigo);
    setPagado(true);

    // 2. Eliminar el producto de la base de datos para que ya no aparezca en Foodvuelta
    if (producto && producto.id) {
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', producto.id);
      
      if (error) console.error("Error al borrar el producto:", error);
    }

    // 3. Redirigir a WhatsApp con el mensaje prearmado
    const numeroFoodvuelta = "51999999999"; 
    const mensaje = `¡Hola Foodvuelta! 🍔 Acabo de yapear S/ ${total.toFixed(2)} por: ${producto.title} (${producto.address}).\n\nMi código de recojo es: *${codigo}*.\n\nAquí te adjunto mi captura de pago para validarlo:`;
    
    const urlWa = `https://wa.me/${929679785}?text=${encodeURIComponent(mensaje)}`;
    window.open(urlWa, '_blank');
  };

  if (!producto) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-8 text-center">
        <h2 className="text-2xl font-black text-fv-marron mb-4">Tu carrito está vacío</h2>
        <Link to="/" className="text-fv-terracota font-bold hover:underline">Volver a la tienda</Link>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/" className="text-fv-terracota font-bold hover:underline">← Volver</Link>
        <h2 className="text-2xl font-black text-fv-marron">Tu Carrito de Rescate</h2>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-fv-mostaza/20 mb-6">
        <h3 className="font-bold text-lg mb-4 text-fv-marron">Resumen del pedido</h3>
        <div className="flex justify-between items-center mb-2 border-b pb-2">
          <span className="font-medium">{producto.title}</span>
          <span className="font-medium">S/ {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center mb-2 text-sm text-gray-500">
          <span>Comisión de plataforma (10%)</span>
          <span>S/ {comision.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center mt-4 text-xl font-black text-fv-mostaza">
          <span>Total a Pagar</span>
          <span>S/ {total.toFixed(2)}</span>
        </div>
      </div>

      {!pagado ? (
        <div className="bg-fv-crema p-6 rounded-2xl border border-fv-mostaza text-center">
          <h3 className="font-bold text-lg mb-2 text-fv-marron">Pago mediante Yape</h3>
          <p className="text-sm mb-4">Escanea el QR o yapea al número oficial de Foodvuelta.</p>
          <div className="bg-white w-40 h-40 mx-auto rounded-xl flex items-center justify-center border-2 border-purple-500 mb-4 text-purple-500 font-bold text-center p-4">
            [Inserta tu imagen QR Yape en src/assets y llámala aquí con etiqueta img]
          </div>
          <p className="font-bold text-purple-700 text-xl mb-4">999 999 999</p>
          
          <button 
            onClick={confirmarPago}
            className="w-full bg-fv-mostaza text-white py-3 rounded-xl font-bold hover:bg-fv-naranja transition-colors shadow-sm cursor-pointer"
          >
            Ya realicé el pago (Enviar captura)
          </button>
        </div>
      ) : (
        <div className="bg-green-50 p-6 rounded-2xl border border-green-500 text-center">
          <h3 className="font-bold text-2xl mb-2 text-green-700">¡Pedido Registrado! ✅</h3>
          <p className="mb-4 text-green-900">Envíale la captura de tu Yape a nuestro WhatsApp para activar este código.</p>
          <div className="text-4xl font-black text-fv-marron tracking-widest bg-white py-4 rounded-xl border-2 border-dashed border-gray-300 mb-4">
            {codigoRecojo}
          </div>
          <p className="text-sm text-gray-600 font-medium mb-4">📍 Dirección de recojo: {producto.address}</p>
          
          <button 
            onClick={() => {
              localStorage.removeItem('producto_seleccionado');
              window.location.href = "/";
            }}
            className="text-sm text-fv-terracota font-bold hover:underline"
          >
            Volver al inicio y limpiar carrito
          </button>
        </div>
      )}
    </main>
  );
}