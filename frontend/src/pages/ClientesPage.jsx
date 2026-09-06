import { useEffect, useState, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import { toastSuccess, toastError } from '../utils/alerts';

const emptyForm = {
  razon_social: '',
  ruc: '',
  contacto: '',
  email: '',
  telefono: '',
  direccion: '',
  distrito: '',
  ciudad: 'Lima',
};

const ClientesPage = () => {
  const [clientes, setClientes] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/catalogos/clientes', { params: search ? { search } : {} });
      setClientes(data.data || []);
    } catch {
      toastError('Error', 'No se pudieron cargar los clientes');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{11}$/.test(form.ruc)) {
      toastError('RUC inválido', 'El RUC debe tener 11 dígitos');
      return;
    }
    setSaving(true);
    try {
      await api.post('/catalogos/clientes', form);
      toastSuccess('Cliente registrado');
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      toastError('Error', err.response?.data?.message || 'No se pudo registrar el cliente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Gestión de clientes"
        subtitle="Catálogo de clientes para registro de envíos"
        action={
          <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" /> Nuevo cliente
          </button>
        }
      />

      <form onSubmit={handleSearch} className="card mb-4 flex flex-wrap gap-3">
        <input
          className="input-field min-w-[200px] flex-1"
          placeholder="Buscar por razón social o RUC..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" className="btn-secondary">
          <Search className="h-4 w-4" /> Buscar
        </button>
        {search && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setSearchInput('');
              setSearch('');
            }}
          >
            Limpiar
          </button>
        )}
      </form>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              className="input-field"
              placeholder="Razón social *"
              value={form.razon_social}
              onChange={(e) => setForm((f) => ({ ...f, razon_social: e.target.value }))}
              required
            />
            <input
              className="input-field"
              placeholder="RUC (11 dígitos) *"
              value={form.ruc}
              onChange={(e) => setForm((f) => ({ ...f, ruc: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
              required
              maxLength={11}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              className="input-field"
              placeholder="Contacto"
              value={form.contacto}
              onChange={(e) => setForm((f) => ({ ...f, contacto: e.target.value }))}
            />
            <input
              className="input-field"
              type="email"
              placeholder="Correo electrónico"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <input
              className="input-field"
              placeholder="Teléfono"
              value={form.telefono}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
            />
            <input
              className="input-field"
              placeholder="Distrito"
              value={form.distrito}
              onChange={(e) => setForm((f) => ({ ...f, distrito: e.target.value }))}
            />
            <input
              className="input-field"
              placeholder="Ciudad"
              value={form.ciudad}
              onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))}
            />
          </div>
          <input
            className="input-field"
            placeholder="Dirección"
            value={form.direccion}
            onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
          />
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Registrar cliente'}
          </button>
        </form>
      )}

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-salazar-200 border-t-salazar-800" />
          </div>
        ) : clientes.length === 0 ? (
          <p className="p-8 text-center text-slate-500">No hay clientes registrados{search ? ' con ese criterio' : ''}.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Razón social</th>
                <th className="px-4 py-3 text-left">RUC</th>
                <th className="px-4 py-3 text-left">Contacto</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Teléfono</th>
                <th className="px-4 py-3 text-left">Ciudad</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id_cliente} className="border-t border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.razon_social}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{c.ruc}</td>
                  <td className="px-4 py-3">{c.contacto || '—'}</td>
                  <td className="px-4 py-3">{c.email || '—'}</td>
                  <td className="px-4 py-3">{c.telefono || '—'}</td>
                  <td className="px-4 py-3">{c.ciudad || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ClientesPage;
