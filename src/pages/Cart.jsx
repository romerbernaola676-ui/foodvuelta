import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast'; // <-- IMPORT AGREGADO
import qrYape from '../assets/qr-yape.png';

export default function Cart() {
  const [carrito, setCarrito] = useState([]);
  const [pagado, setPagado] = useState(false);
  const [codigoRecojo, setCodigoRecojo] = useState('');
  
  const [voucherArchivo, setVoucherArchivo] = useState(null);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    const guardado = localStorage.getItem('carrito');
    if (guardado) setCarrito(JSON.parse(guardado));
  }, []);

  const actualizarStorage = (nuevoCarrito) => {
    setCarrito(nuevoCarrito);
    localStorage.setItem('carrito', JSON.stringify(nuevoCarrito));
    window.dispatchEvent(new Event('carritoActualizado'));
  };

  const incrementar = (id) => {
    const nuevoCarrito = carrito.map(item => {
      if (item.id === id) {
        if (item.cantidadCompra < item.cantidad) {
          return { ...item, cantidadCompra: item.cantidadCompra + 1 };
        } else {
          toast.error('¡Has alcanzado el límite de stock disponible para este producto!'); // <-- TOAST EN VEZ DE ALERT
        }
      }
      return item;
    });
    actualizarStorage(nuevoCarrito);
  };

  const decrementar = (id) => {
    const nuevoCarrito = carrito.map(item => {
      if (item.id === id && item.cantidadCompra > 1) {
        return { ...item, cantidadCompra: item.cantidadCompra - 1 };
      }
      return item;
    });
    actualizarStorage(nuevoCarrito);
  };

  const eliminarItem = (id) => {
    const nuevoCarrito = carrito.filter(item => item.id !== id);
    actualizarStorage(nuevoCarrito);
  };

  const subtotal = carrito.reduce((acc, item) => acc + (item.discountPrice * item.cantidadCompra), 0);
  const comision = subtotal * 0.10; 
  const total = subtotal + comision;

  const confirmarPago = async () => {
    if (!voucherArchivo) {
      toast.error("Por favor, sube la captura de tu Yape para confirmar el pago."); // <-- TOAST EN VEZ DE ALERT
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error("Por favor, inicia sesión o crea una cuenta gratis para completar tu pedido."); // <-- TOAST EN VEZ DE ALERT
      window.location.href = "/ingresar";
      return;
    }

    const clienteActivoId = session.user.id; 

    setProcesando(true);

    try {
      const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const fileExt = voucherArchivo.name.split('.').pop();
      const fileName = `yape_${codigo}_${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('vouchers').upload(fileName, voucherArchivo);
      if (uploadError) throw uploadError;

      const { data: { publicUrl: voucherUrl } } = supabase.storage.from('vouchers').getPublicUrl(fileName);

      for (const item of carrito) {
        const { data: productoActual } = await supabase.from('productos').select('cantidad').eq('id', item.id).single();

        if (productoActual) {
          const nuevaCantidad = productoActual.cantidad - item.cantidadCompra;
          await supabase.from('productos').update({ cantidad: nuevaCantidad, activo: nuevaCantidad > 0 }).eq('id', item.id);
        }

        const comisionItem = (item.discountPrice * item.cantidadCompra) * 0.10;
        await supabase.rpc('cobrar_comision', { p_vendedor_id: item.vendedor_id, p_monto: comisionItem });
      }

      const detallesPedido = carrito.map(item => `${item.cantidadCompra}x ${item.title}`).join(', ');
      
      await supabase.from('pedidos').insert([{
        vendedor_id: carrito[0].vendedor_id,
        cliente_id: clienteActivoId,
        detalles_pedido: detallesPedido,
        total_pagado: subtotal,
        codigo_recojo: codigo,
        voucher_url: voucherUrl,
        estado: 'pendiente', 
        carrito_json: carrito 
      }]);

      setCodigoRecojo(codigo);
      setPagado(true);
      toast.success("¡Pago enviado a revisión!"); // <-- TOAST DE ÉXITO
    } catch (error) {
      toast.error("Error al procesar el pago: " + error.message); // <-- TOAST EN VEZ DE ALERT
    } finally {
      setProcesando(false);
    }
  };

  const vaciarCarrito = () => {
    actualizarStorage([]);
  };

  if (carrito.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-8 text-center">
        <h2 className="text-2xl font-black text-fv-marron mb-4">Tu carrito está vacío</h2>
        <Link to="/" className="text-fv-terracota font-bold hover:underline">Volver a la tienda</Link>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-fv-terracota font-bold hover:underline">← Volver</Link>
          <h2 className="text-2xl font-black text-fv-marron">Tu Carrito</h2>
        </div>
        {!pagado && (
          <button onClick={vaciarCarrito} className="text-sm text-red-500 font-bold hover:underline">Vaciar carrito</button>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-fv-mostaza/20 mb-8">
        <h3 className="font-bold text-lg mb-6 text-fv-marron border-b pb-2">Resumen del pedido</h3>
        
        <div className="flex flex-col gap-4 mb-6 border-b pb-6">
          {carrito.map(item => (
            <div key={item.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-fv-crema/30 p-3 rounded-lg">
              
              <div className="flex-1">
                <h4 className="font-bold text-fv-marron text-sm">{item.title}</h4>
                <p className="text-xs text-gray-500">S/ {item.discountPrice.toFixed(2)} c/u (Máx: {item.cantidad})</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <button onClick={() => decrementar(item.id)} className="px-3 py-1 text-fv-marron hover:bg-gray-100 font-bold transition-colors">-</button>
                  <span className="px-3 py-1 font-bold text-sm min-w-[2rem] text-center border-x border-gray-200">{item.cantidadCompra}</span>
                  <button onClick={() => incrementar(item.id)} className="px-3 py-1 text-fv-marron hover:bg-gray-100 font-bold transition-colors">+</button>
                </div>
                
                <span className="font-black text-fv-naranja w-20 text-right">
                  S/ {(item.discountPrice * item.cantidadCompra).toFixed(2)}
                </span>

                <button onClick={() => eliminarItem(item.id)} className="text-red-400 hover:text-red-600 text-lg" title="Eliminar producto">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>Subtotal productos</span><span>S/ {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>Comisión de plataforma (10%)</span><span>S/ {comision.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center mt-4 text-2xl font-black text-fv-mostaza">
            <span>Total a Pagar</span><span>S/ {total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {!pagado ? (
        <div className="bg-fv-crema p-8 rounded-2xl border border-fv-mostaza text-center shadow-sm">
          <h3 className="font-bold text-xl mb-2 text-fv-marron">Pago mediante Yape</h3>
          <p className="text-sm mb-6 text-gray-600">Escanea el QR o yapea al número <strong>929 679 785</strong>.</p>
          
          <div className="bg-white w-48 h-48 mx-auto rounded-2xl flex items-center justify-center border-4 border-purple-500 mb-6 overflow-hidden shadow-md">
            <img src={qrYape} alt="QR Yape" className="w-full h-full object-contain p-2" />
          </div>
          
          <div className="mb-8 text-left max-w-sm mx-auto bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <label className="block text-sm font-bold text-fv-marron mb-2">Sube la captura de tu Yape aquí:</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={e => setVoucherArchivo(e.target.files[0])} 
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-fv-naranja"
            />
          </div>
          
          <button 
            onClick={confirmarPago}
            disabled={procesando}
            className="w-full max-w-sm mx-auto block bg-fv-mostaza text-white py-4 rounded-xl font-bold text-lg hover:bg-fv-naranja transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-md"
          >
            {procesando ? 'Procesando validación...' : 'Confirmar Pago Seguro'}
          </button>
        </div>
      ) : (
        <div className="bg-green-50 p-8 rounded-2xl border-2 border-green-500 text-center shadow-sm">
          <div className="text-5xl mb-4">⏳</div>
          <h3 className="font-bold text-2xl mb-2 text-green-800">¡Pedido en Revisión!</h3>
          <p className="mb-6 text-green-900 font-medium">El restaurante está verificando tu pago. Muestra este código al llegar.</p>
          
          <div className="text-5xl font-black text-fv-marron tracking-widest bg-white py-6 rounded-2xl border-4 border-dashed border-green-300 mb-6 shadow-inner">
            {codigoRecojo}
          </div>
          
          <div className="bg-white inline-block px-6 py-3 rounded-lg border border-gray-200 mb-6">
            <p className="text-sm text-gray-600 font-medium">📍 Dirección de recojo:</p>
            <p className="font-bold text-fv-marron">{carrito[0].address}</p>
          </div>
          <br/>
          <button 
            onClick={() => { vaciarCarrito(); window.location.href = "/mis-pedidos"; }}
            className="text-sm bg-fv-terracota text-white px-6 py-2 rounded-full font-bold hover:bg-red-700 transition-colors"
          >
            Ir a mis pedidos
          </button>
        </div>
      )}
    </main>
  );
}