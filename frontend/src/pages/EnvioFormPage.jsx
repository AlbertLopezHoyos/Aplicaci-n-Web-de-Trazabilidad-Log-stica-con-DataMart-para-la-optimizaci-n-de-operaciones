import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import { toastSuccess, toastError } from '../utils/alerts';
import { Clock } from 'lucide-react';

const validarFormulario = (form) => {
  const errores = [];
  if (!form.id_cliente) errores.push({ campo: 'id_cliente', msg: 'Cliente requerido' });
  if (!form.origen?.trim()) errores.push({ campo: 'origen', msg: 'Origen requerido' });
  if (!form.destino?.trim()) errores.push({ campo: 'destino', msg: 'Destino requerido' });
  if (!form.tipo_carga?.trim()) errores.push({ campo: 'tipo_carga', msg: 'Tipo de carga requerido' });
  if (form.peso_kg !== '' && parseFloat(form.peso_kg) < 0) errores.push({ campo: 'peso_kg', msg: 'Peso no puede ser negativo' });
  if (form.numero_paquetes && parseInt(form.numero_paquetes, 10) < 1) {
    errores.push({ campo: 'numero_paquetes', msg: 'Número de paquetes inválido' });
  }
  return errores;
};

const EnvioFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const horaInicioRef = useRef(new Date().toISOString());
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState({
    id_cliente: '',
    origen: '',
    destino: '',
    fecha_registro: new Date().toISOString().split('T')[0],
    fecha_estimada_entrega: '',
    tipo_carga: '',
    peso_kg: '',
    numero_paquetes: '1',
    observaciones: '',
    prioridad: 'normal',
  });

  useEffect(() => {
    if (!isEdit) horaInicioRef.current = new Date().toISOString();
    api.get('/catalogos/clientes').then((r) => setClientes(r.data.data));
    if (isEdit) {
      api.get(`/envios/${id}`).then((r) => {
        const e = r.data.data;
        setForm({
          id_cliente: e.id_cliente,
          origen: e.origen,
          destino: e.destino,
          fecha_registro: e.fecha_registro,
          fecha_estimada_entrega: e.fecha_estimada_entrega || '',
          tipo_carga: e.tipo_carga,
          peso_kg: e.peso_kg,
          numero_paquetes: e.numero_paquetes ?? 1,
          observaciones: e.observaciones || '',
          prioridad: e.prioridad || 'normal',
        });
      });
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const registrarErroresCliente = async (errores) => {
    for (const err of errores) {
      try {
        await api.post('/observacion/errores-registro', {
          tipo_error: 'validacion_frontend',
          campo_afectado: err.campo,
          descripcion: err.msg,
        });
      } catch {
        /* demo mode */
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errores = validarFormulario(form);
    if (errores.length) {
      await registrarErroresCliente(errores);
      toastError('Datos inválidos', errores.map((x) => x.msg).join('. '));
      return;
    }
    try {
      const payload = {
        ...form,
        peso_kg: parseFloat(form.peso_kg) || 0,
        numero_paquetes: parseInt(form.numero_paquetes, 10) || 1,
        ...(isEdit ? {} : { hora_inicio_registro: horaInicioRef.current }),
      };
      if (isEdit) {
        await api.put(`/envios/${id}`, payload);
        toastSuccess('Envío actualizado');
      } else {
        const { data } = await api.post('/envios', payload);
        const tiempo = data.data?.tiempo_registro_min;
        toastSuccess('Envío registrado', tiempo != null ? `Tiempo: ${tiempo} min` : '');
      }
      navigate('/envios');
    } catch (err) {
      toastError('Error', err.response?.data?.message || 'No se pudo guardar');
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={isEdit ? 'Editar envío' : 'Registrar envío'}
        subtitle={
          isEdit
            ? 'Modifique los datos logísticos del envío'
            : 'Medición automática de tiempo de registro (ficha dimensión 1 — TPRE)'
        }
      />

      {!isEdit && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-salazar-200 bg-salazar-50 px-4 py-3 text-sm text-salazar-800">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            Cronómetro activo desde{' '}
            {new Date(horaInicioRef.current).toLocaleTimeString('es-PE')}. Al guardar se registrarán
            hora inicio, hora fin y tiempo empleado.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Cliente *</label>
          <select name="id_cliente" className="input-field" value={form.id_cliente} onChange={handleChange} required>
            <option value="">Seleccionar cliente</option>
            {clientes.map((c) => (
              <option key={c.id_cliente} value={c.id_cliente}>
                {c.razon_social}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Origen *</label>
            <input name="origen" className="input-field" value={form.origen} onChange={handleChange} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Destino *</label>
            <input name="destino" className="input-field" value={form.destino} onChange={handleChange} required />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Fecha registro</label>
            <input type="date" name="fecha_registro" className="input-field" value={form.fecha_registro} onChange={handleChange} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Fecha estimada entrega</label>
            <input type="date" name="fecha_estimada_entrega" className="input-field" value={form.fecha_estimada_entrega} onChange={handleChange} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Tipo de carga *</label>
            <input name="tipo_carga" className="input-field" value={form.tipo_carga} onChange={handleChange} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Peso (kg)</label>
            <input type="number" step="0.01" min="0" name="peso_kg" className="input-field" value={form.peso_kg} onChange={handleChange} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Nº paquetes *</label>
            <input type="number" min="1" name="numero_paquetes" className="input-field" value={form.numero_paquetes} onChange={handleChange} required />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Prioridad</label>
          <select name="prioridad" className="input-field" value={form.prioridad} onChange={handleChange}>
            <option value="baja">Baja</option>
            <option value="normal">Normal</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Observaciones</label>
          <textarea name="observaciones" rows={3} className="input-field" value={form.observaciones} onChange={handleChange} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary">
            {isEdit ? 'Guardar cambios' : 'Registrar envío'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/envios')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default EnvioFormPage;
