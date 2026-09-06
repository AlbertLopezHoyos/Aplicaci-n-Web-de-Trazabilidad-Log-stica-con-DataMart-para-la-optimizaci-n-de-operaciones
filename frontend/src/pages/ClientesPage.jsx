import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Pencil, X } from 'lucide-react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import StatChip from '../components/StatChip';
import Pagination from '../components/Pagination';
import { toastSuccess, toastError } from '../utils/alerts';

const emptyForm = {
  nombre_completo: '',
  dni: '',
  telefono: '',
};

const ClientesPage = () => {
  const [clientes, setClientes] = useState({ data: [], total: 0, page: 1, limit: 25 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 25 };
      if (search) params.search = search;
      const { data } = await api.get('/catalogos/clientes', { params });
      const payload = data.data;
      if (payload?.data) {
        setClientes(payload);
      } else {
        setClientes({ data: Array.isArray(payload) ? payload : [], total: 0, page: 1, limit: 25 });
      }
    } catch {
      toastError('Error', 'No se pudieron cargar los clientes');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const validateLocal = () => {
    if (!form.nombre_completo?.trim()) {
      toastError('Campo requerido', 'Ingrese el nombre completo');
      return false;
    }
    if (!/^\d{8}$/.test(form.dni)) {
      toastError('DNI inválido', 'El DNI debe tener exactamente 8 dígitos');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateLocal()) return;
    setSaving(true);
    try {
      const payload = {
        nombre_completo: form.nombre_completo.trim(),
        dni: form.dni,
        telefono: form.telefono.trim() || null,
      };
      if (editing) {
        await api.put(`/catalogos/clientes/${editing}`, payload);
        toastSuccess('Cliente actualizado');
        setEditing(null);
      } else {
        await api.post('/catalogos/clientes', payload);
        toastSuccess('Cliente registrado');
        setShowForm(false);
      }
      setForm(emptyForm);
      load();
    } catch (err) {
      toastError('Error', err.response?.data?.message || 'No se pudo guardar el cliente');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c) => {
    setEditing(c.id_cliente);
    setShowForm(false);
    setForm({
      nombre_completo: c.nombre_completo || c.razon_social || '',
      dni: c.dni || '',
      telefono: c.telefono || '',
    });
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const cancelForm = () => {
    setEditing(null);
    setShowForm(false);
    setForm(emptyForm);
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Gestión de clientes"
        subtitle="Personas naturales: nombre completo, DNI y teléfono (opcional)"
        compact
        action={
          <button type="button" className="btn-primary" onClick={openNew}>
            <Plus className="h-4 w-4" /> Nuevo cliente
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <StatChip label="Clientes listados" value={clientes.data?.length ?? 0} />
        <StatChip label="Total en BD" value={clientes.total ?? 0} accent="salazar" />
        <StatChip label="Búsqueda activa" value={search || 'Ninguna'} accent="slate" />
      </div>

      <form onSubmit={handleSearch} className="card-compact flex flex-wrap gap-3">
        <input
          className="input-field min-w-[200px] flex-1"
          placeholder="Buscar por nombre o DNI..."
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
              setPage(1);
            }}
          >
            Limpiar
          </button>
        )}
      </form>

      {(showForm || editing) && (
        <form onSubmit={handleSubmit} className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-salazar-900">
              {editing ? 'Editar cliente' : 'Nuevo cliente'}
            </h3>
            <button type="button" onClick={cancelForm} aria-label="Cancelar">
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <input
              className="input-field sm:col-span-1"
              placeholder="Nombre completo *"
              value={form.nombre_completo}
              onChange={(e) => setForm((f) => ({ ...f, nombre_completo: e.target.value }))}
              required
            />
            <input
              className="input-field"
              placeholder="DNI (8 dígitos) *"
              value={form.dni}
              onChange={(e) => setForm((f) => ({ ...f, dni: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
              required
              maxLength={8}
            />
            <input
              className="input-field"
              placeholder="Teléfono (opcional)"
              value={form.telefono}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
            />
          </div>

          <p className="text-xs text-slate-500">
            Teléfono opcional: en datos simulados queda vacío por confidencialidad de la empresa.
          </p>

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar cliente'}
          </button>
        </form>
      )}

      <div className="table-panel">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-salazar-200 border-t-salazar-800" />
          </div>
        ) : clientes.data?.length === 0 ? (
          <p className="p-8 text-center text-slate-500">No hay clientes registrados{search ? ' con ese criterio' : ''}.</p>
        ) : (
          <div className="table-panel-body">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Nombre completo</th>
                  <th className="px-4 py-3 text-left">DNI</th>
                  <th className="px-4 py-3 text-left">Teléfono</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.data.map((c) => (
                  <tr key={c.id_cliente} className="border-t border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {c.nombre_completo || c.razon_social}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{c.dni || '—'}</td>
                    <td className="px-4 py-3">{c.telefono || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-salazar-800"
                        title="Editar"
                        onClick={() => startEdit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-100 px-3 py-2 sm:px-4">
              <Pagination
                page={clientes.page}
                total={clientes.total}
                limit={clientes.limit}
                onPageChange={setPage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientesPage;
