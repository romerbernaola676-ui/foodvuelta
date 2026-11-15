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

  const subtotal = producto ? producto.discountPrice : 0; 
  const comision = subtotal * 0.10; 
  const total = subtotal + comision;

  const confirmarPago = async () => {
    // 1. Generar código visual
    const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
    setCodigoRecojo(codigo);
    setPagado(true);

    if (producto && producto.id) {
      // 2. Reducir el inventario en lugar de eliminar el producto
      const { data: productoActual } = await supabase
        .from('productos')
        .select('cantidad')
        .eq('id', producto.id)
        .single();

      if (productoActual) {
        const nuevaCantidad = productoActual.cantidad - 1;
        await supabase
          .from('productos')
          .update({ 
            cantidad: nuevaCantidad,
            activo: nuevaCantidad > 0 
          })
          .eq('id', producto.id);
      }

      // 3. Cobrar la comisión (Descontar del saldo del vendedor en tiempo real)
      if (producto.vendedor_id) {
        const { data: perfil } = await supabase
          .from('perfiles_vendedor')
          .select('saldo_comisiones')
          .eq('id', producto.vendedor_id)
          .single();

        if (perfil) {
          const nuevoSaldo = perfil.saldo_comisiones - comision;
          await supabase
            .from('perfiles_vendedor')
            .update({ saldo_comisiones: nuevoSaldo })
            .eq('id', producto.vendedor_id);
        }
      }
    }

    // 4. Redirigir a WhatsApp
    const mensaje = `¡Hola Foodvuelta! 🍔 Acabo de yapear S/ ${total.toFixed(2)} por: ${producto.title} (${producto.address}).\n\nMi código de recojo es: *${codigo}*.\n\nAquí te adjunto mi captura de pago para validarlo:`;
    
    const urlWa = `https://wa.me/51929679785?text=${encodeURIComponent(mensaje)}`;
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
          <p className="font-bold text-purple-700 text-xl mb-4">929 679 785</p>
          
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