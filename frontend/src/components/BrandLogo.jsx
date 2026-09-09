import isotipo from '../assets/logo-salazar-peru-1.png';
import logotipo from '../assets/isotipo.png';

const EMPRESA = 'Grupo Logístico Salazar S.A.C.';

/**
 * Marca institucional.
 *  - variant="mark" → solo el isotipo (la "G")
 *  - variant="full" → logotipo horizontal con el nombre de la empresa
 */
const BrandLogo = ({ variant = 'mark', className = 'h-9 w-auto' }) => (
  <img src={variant === 'full' ? logotipo : isotipo} alt={EMPRESA} className={className} />
);

export default BrandLogo;
