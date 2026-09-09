import { useEffect, useRef, useState, useCallback } from 'react';
import { User, ChevronDown, UserPlus, Pencil, UserX, UserCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { fixMojibake } from '../utils/textEncoding';
import { toastSuccess, toastError } from '../utils/alerts';

const emptyForm = {
  nombres: '',
  apellidos: '',
  email: '',
  password: '',
  id_rol: '2',
  telefono: '',
  activo: true,
};

const UserAccountMenu = () => {
  const { user, isAdmin, loadUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState('menu');
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const ref = useRef(null);

  const loadUsuarios = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const { data } = await api.get('/usuarios');
      setUsuarios(data.data || []);
    } catch {
      toastError('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setPanel('menu');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && isAdmin && panel === 'gestion') {
      loadUsuarios();
      api.get('/catalogos/roles').then((r) => setRoles(r.data.data || [])).catch(() => {});
    }
  }, [open, isAdmin, panel, loadUsuarios]);

  const openGestion = () => {
    setPanel('gestion');
    setEditing(null);
    setForm(emptyForm);
  };

  const startEdit = (u) => {
    setEditing(u.id_usuario);
    setForm({
      nombres: u.nombres,
      apellidos: u.apellidos,
      email: u.email,
      password: '',
      id_rol: String(u.id_rol || u.rol?.id_rol || 2),
      telefono: u.telefono || '',
      activo: u.activo !== false,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        email: form.email.trim(),
        id_rol: Number(form.id_rol),
        telefono: form.telefono.trim() || null,
        activo: form.activo,
      };
      if (form.password.trim()) payload.password = form.password;
      if (editing) {
        if (!payload.password) delete payload.password;
        await api.put(`/usuarios/${editing}`, payload);
        toastSuccess('Usuario actualizado');
      } else {
        if (!payload.password) {
          toastError('Contraseña requerida', 'Indique una contraseña para el nuevo usuario');
          setSaving(false);
          return;
        }
        await api.post('/usuarios', payload);
        toastSuccess('Usuario creado');
      }
      setEditing(null);
      setForm(emptyForm);
      loadUsuarios();
      if (editing === user?.id_usuario) loadUser();
    } catch (err) {
      toastError('Error', err.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (u) => {
    try {
      await api.patch(`/usuarios/${u.id_usuario}/activo`, { activo: !u.activo });
      toastSuccess(u.activo ? 'Usuario desactivado' : 'Usuario activado');
      loadUsuarios();
    } catch (err) {
      toastError('Error', err.response?.data?.message);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-transparent py-1 pl-1 pr-2 transition hover:border-slate-200 hover:bg-slate-50"
        aria-expanded={open}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-salazar-100 text-salazar-800">
          <User className="h-4 w-4" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-slate-800">
            {user?.nombres} {user?.apellidos}
          </p>
          <p className="flex items-center gap-0.5 text-xs text-slate-500">
            {fixMojibake(user?.rol?.nombre)}
            <ChevronDown className={`h-3 w-3 transition ${open ? 'rotate-180' : ''}`} />
          </p>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,420px)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          {panel === 'menu' && (
            <>
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-800">{user?.nombres} {user?.apellidos}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
                <p className="mt-1 text-xs font-medium text-salazar-700">{fixMojibake(user?.rol?.nombre)}</p>
              </div>
              <ul className="py-1">
                {isAdmin && (
                  <li>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-salazar-50"
                      onClick={openGestion}
                    >
                      <UserPlus className="h-4 w-4 text-salazar-700" />
                      Gestionar usuarios del sistema
                    </button>
                  </li>
                )}
              </ul>
            </>
          )}

          {panel === 'gestion' && isAdmin && (
            <div className="max-h-[min(70vh,520px)] overflow-y-auto">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
                <p className="font-semibold text-slate-800">Usuarios del sistema</p>
                <button type="button" onClick={() => { setPanel('menu'); setEditing(null); setForm(emptyForm); }} aria-label="Cerrar">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-2 border-b border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {editing ? 'Editar usuario' : 'Nuevo usuario'}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className="input-field text-sm" placeholder="Nombres" value={form.nombres} onChange={(e) => setForm((f) => ({ ...f, nombres: e.target.value }))} required />
                  <input className="input-field text-sm" placeholder="Apellidos" value={form.apellidos} onChange={(e) => setForm((f) => ({ ...f, apellidos: e.target.value }))} required />
                  <input className="input-field text-sm sm:col-span-2" type="email" placeholder="Correo" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
                  <input className="input-field text-sm sm:col-span-2" type="password" placeholder={editing ? 'Nueva contraseña (opcional)' : 'Contraseña (mín. 8)'} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} minLength={editing ? 0 : 8} />
                  <select className="input-field text-sm" value={form.id_rol} onChange={(e) => setForm((f) => ({ ...f, id_rol: e.target.value }))}>
                    {roles.map((r) => (
                      <option key={r.id_rol} value={r.id_rol}>{fixMojibake(r.nombre)}</option>
                    ))}
                  </select>
                  <input className="input-field text-sm" placeholder="Teléfono (opc.)" value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary flex-1 text-sm" disabled={saving}>
                    {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Agregar usuario'}
                  </button>
                  {editing && (
                    <button type="button" className="btn-secondary text-sm" onClick={() => { setEditing(null); setForm(emptyForm); }}>
                      Cancelar
                    </button>
                  )}
                </div>
              </form>

              <div className="p-2">
                {loading ? (
                  <p className="py-6 text-center text-sm text-slate-500">Cargando...</p>
                ) : (
                  <ul className="divide-y divide-slate-50">
                    {usuarios.map((u) => (
                      <li key={u.id_usuario} className="flex items-start justify-between gap-2 px-2 py-2.5 hover:bg-slate-50">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{u.nombres} {u.apellidos}</p>
                          <p className="truncate text-xs text-slate-500">{u.email}</p>
                          <p className="text-[11px] text-salazar-700">{fixMojibake(u.rol?.nombre)} · {u.activo ? 'Activo' : 'Inactivo'}</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button type="button" className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Editar" onClick={() => startEdit(u)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {u.id_usuario !== user?.id_usuario && (
                            <button type="button" className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title={u.activo ? 'Desactivar' : 'Activar'} onClick={() => toggleActivo(u)}>
                              {u.activo ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserAccountMenu;
