import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import { toastSuccess, toastError } from '../utils/alerts';

const EnvioFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState({
    id_cliente: '',
    origen: '',
    destino: '',
    fecha_registro: new Date().toISOString().split('T')[0],
    fecha_estimada_entrega: '',
    tipo_carga: '',
    peso_kg: '',
    observaciones: '',
    prioridad: 'normal',
  });

  useEffect(() => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, peso_kg: parseFloat(form.peso_kg) || 0 };
      if (isEdit) {
        await api.put(`/envios/${id}`, payload);
        toastSuccess('Envío actualizado');
      } else {
        await api.post('/envios', payload);
        toastSuccess('Envío registrado');
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
        subtitle="Complete los datos logísticos del envío"
      />
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Tipo de carga *</label>
            <input name="tipo_carga" className="input-field" value={form.tipo_carga} onChange={handleChange} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Peso (kg)</label>
            <input type="number" step="0.01" name="peso_kg" className="input-field" value={form.peso_kg} onChange={handleChange} />
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
