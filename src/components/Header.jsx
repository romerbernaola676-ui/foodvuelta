import logo from '../assets/logo.png'; // Asegúrate de que el formato (.png o .jpg) coincida con tu imagen
import { Link } from 'react-router-dom'; // ESTA ES LA LÍNEA QUE FALTABA

export default function Header() {
  return (
    <header className="bg-fv-crema shadow-md px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <img src={logo} alt="Logo Foodvuelta" className="w-14 h-14 object-contain" />
        <div>
          <h1 className="text-2xl font-black text-fv-marron leading-none">FOODVUELTA</h1>
          <p className="text-sm text-fv-terracota font-medium">Dale otra vuelta al sabor.</p>
        </div>
      </div>
      
      <Link to="/carrito" className="bg-fv-naranja text-white px-5 py-2 rounded-full font-bold shadow-sm hover:bg-fv-terracota transition-colors flex items-center gap-2">
        <span>🛒</span>
        <span>Carrito</span>
      </Link>
    </header>
  );
}