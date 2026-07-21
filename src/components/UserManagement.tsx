import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Shield, 
  Mail, 
  Calendar,
  Search,
  ChevronRight,
  ShieldCheck,
  UserPlus,
  Eye,
  Plus,
  Edit2,
  X,
  Phone,
  MapPin,
  Lock,
  Building2,
  CreditCard,
  Hash,
  Activity
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  updateDoc, 
  doc, 
  setDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, UserStatus, UserRole } from '../types';
import { getLocalUsers, saveLocalUser, syncAndMergeUsers } from '../lib/local-users';

const MEXICAN_STATES = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", 
  "Chihuahua", "Coahuila", "Colima", "Ciudad de México", "Durango", 
  "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "México", 
  "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", 
  "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", 
  "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", 
  "Yucatán", "Zacatecas"
];

const COMMON_BANKS = [
  "BBVA Bancomer", "Santander", "Citibanamex", "Banorte", "HSBC", 
  "Scotiabank", "Banco Azteca", "BanCoppel", "Inbursa", "Mercado Pago", "SPIN de OXXO"
];

interface UserManagementProps {
  onInspectUser?: (userId: string) => void;
  onInspectProfile?: (userId: string) => void;
}

export function UserManagement({ onInspectUser, onInspectProfile }: UserManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  // Form states for creating/editing user
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState(MEXICAN_STATES[0]);
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [status, setStatus] = useState<UserStatus>('approved');
  const [trio, setTrio] = useState('');
  const [mins, setMins] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [clabe, setClabe] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const usersData: UserProfile[] = [];
      snap.forEach(d => usersData.push({ uid: d.id, ...d.data() } as UserProfile));
      const merged = syncAndMergeUsers(usersData);
      setUsers(merged);
      setLoading(false);
    }, (error: any) => {
      console.warn("Firestore UserManagement user listen failed:", error);
      const localUsers = getLocalUsers();
      setUsers(localUsers);
      setLoading(false);
    });
    return unsub;
  }, []);

  const openCreateModal = () => {
    setSelectedUser(null);
    setDisplayName('');
    setPhone('');
    setState(MEXICAN_STATES[0]);
    setPin('');
    setRole('user');
    setStatus('approved');
    setTrio('');
    setMins('');
    setBankName('');
    setAccountNumber('');
    setClabe('');
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserProfile) => {
    setSelectedUser(user);
    setDisplayName(user.displayName || '');
    setPhone(user.phone || '');
    setState(user.state || MEXICAN_STATES[0]);
    setPin(user.pin || '');
    setRole(user.role || 'user');
    setStatus(user.status || 'approved');
    setTrio(user.trio || '');
    setMins(user.mins || '');
    setBankName(user.bankName || '');
    setAccountNumber(user.accountNumber || '');
    setClabe(user.clabe || '');
    setIsModalOpen(true);
  };

  const handleUpdateStatus = async (userId: string, status: UserStatus) => {
    try {
      // Update in local cache first so it is instant
      const localUsers = getLocalUsers();
      const target = localUsers.find(u => u.uid === userId);
      if (target) {
        target.status = status;
        target.updatedAt = new Date().toISOString();
        saveLocalUser(target);
        // Update state
        setUsers(prev => prev.map(u => u.uid === userId ? { ...u, status } : u));
      }

      // Try updating Firestore
      updateDoc(doc(db, 'users', userId), {
        status,
        updatedAt: serverTimestamp()
      }).catch((err) => {
        console.warn("Firestore update user status deferred/skipped (offline):", err);
      });
    } catch (err) {
      console.warn("Firestore update user status skipped/failed (offline):", err);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !phone) {
      alert("Por favor ingresa al menos el Nombre Completo y Teléfono.");
      return;
    }

    setIsSaving(true);
    try {
      const targetUid = selectedUser ? selectedUser.uid : 'usr_' + Date.now();
      const userData: any = {
        uid: targetUid,
        displayName: displayName.trim(),
        phone: phone.trim(),
        state,
        pin: pin.trim(),
        role,
        status,
        trio: trio.trim(),
        mins: mins.trim(),
        bankName: bankName,
        accountNumber: accountNumber.trim(),
        clabe: clabe.trim(),
        updatedAt: new Date().toISOString()
      };

      if (!selectedUser) {
        userData.createdAt = new Date().toISOString();
      } else {
        userData.createdAt = selectedUser.createdAt;
      }

      // Save locally first
      saveLocalUser(userData);

      // Optimistically update the UI list state
      setUsers(prev => {
        const index = prev.findIndex(u => u.uid === targetUid);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...userData };
          return updated;
        } else {
          return [userData, ...prev];
        }
      });

      // Try Firestore
      try {
        if (selectedUser) {
          updateDoc(doc(db, 'users', targetUid), {
            ...userData,
            updatedAt: serverTimestamp()
          }).catch((fireErr) => {
            console.warn("Firestore update deferred. Kept user in local storage.", fireErr);
          });
        } else {
          setDoc(doc(db, 'users', targetUid), {
            ...userData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }).catch((fireErr) => {
            console.warn("Firestore set deferred. Kept user in local storage.", fireErr);
          });
        }
      } catch (fireErr) {
        console.warn("Firestore save initiation failed.", fireErr);
      }

      alert(selectedUser ? "Usuario actualizado correctamente." : "Usuario creado correctamente.");
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error saving user:", err);
      alert("Error al guardar usuario: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.phone || '').includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-xl">
            <Users className="text-indigo-600" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Gestión de Usuarios</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Aprobación, Roles y Servicios</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Nombre, teléfono..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>CREAR USUARIO</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-10 text-slate-400 font-bold">Cargando usuarios...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-10 text-slate-400 font-bold">No se encontraron usuarios.</div>
        ) : (
          filteredUsers.map((user, i) => (
            <motion.div 
              key={`${user.uid || 'user'}-${i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer group flex-1" onClick={() => openEditModal(user)}>
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex-shrink-0 flex items-center justify-center border-2 border-indigo-100 group-hover:border-indigo-400 transition-colors">
                  <ShieldCheck className="text-indigo-600" size={24} />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-slate-700 text-base">{user.displayName}</h3>
                    {user.role === 'admin' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-black rounded-full border border-amber-100">
                        <Shield size={10} />
                        ADMIN
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Phone size={12} className="text-slate-400" />
                      <span>{user.phone || 'Sin teléfono'}</span>
                    </div>
                    {user.state && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-slate-400" />
                        <span>Estado: {user.state}</span>
                      </div>
                    )}
                    {user.pin && (
                      <div className="flex items-center gap-1.5">
                        <Lock size={12} className="text-slate-400" />
                        <span>PIN: <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">{user.pin}</span></span>
                      </div>
                    )}
                  </div>
                  
                  {user.bankName && (
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1 mt-1">
                      <Building2 size={10} />
                      <span>{user.bankName} • CLABE: {user.clabe || 'Sin CLABE'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 self-end lg:self-center">
                <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border ${
                  user.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                  user.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                  'bg-red-50 text-red-600 border-red-100'
                }`}>
                  {user.status.toUpperCase()}
                </div>
                
                <div className="h-8 w-[1px] bg-slate-100" />

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => openEditModal(user)}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    title="Editar Usuario Completo"
                  >
                    <Edit2 size={16} />
                  </button>

                  {onInspectUser && user.status === 'approved' && (
                    <button 
                      onClick={() => onInspectUser(user.uid)}
                      className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors flex items-center gap-2"
                    >
                      <Eye size={14} />
                      Dashboard
                    </button>
                  )}
                  {user.status !== 'approved' && (
                    <button 
                      onClick={() => handleUpdateStatus(user.uid, 'approved')}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors flex items-center gap-2 text-xs font-black"
                      title="Aprobar Usuario"
                    >
                      <CheckCircle2 size={18} />
                    </button>
                  )}
                  {user.status === 'approved' && (
                    <button 
                      onClick={() => handleUpdateStatus(user.uid, 'blocked')}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2 text-xs font-black"
                      title="Bloquear Usuario"
                    >
                      <XCircle size={18} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modern creation & editing modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100"
            >
              <div className="bg-indigo-600 p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg tracking-tight">
                      {selectedUser ? `Editar Usuario: ${selectedUser.displayName}` : 'Crear Nuevo Usuario'}
                    </h3>
                    <p className="text-xs text-indigo-100">Define los datos del usuario, seguridad y servicios</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* 1. Personal & Contact Details */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-wider border-b border-indigo-50 pb-1">1. Datos Personales</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Nombre Completo *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ej. Juan Pérez"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all text-sm font-medium"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Teléfono (Usuario) *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ej. 5512345678"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all text-sm font-medium"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Estado de la República *</label>
                      <select 
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 text-sm font-medium"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                      >
                        {MEXICAN_STATES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">PIN / Password de Seguridad *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ej. 1234"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all text-sm font-mono font-medium"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Admin Roles & Content Limits */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-teal-500 uppercase tracking-wider border-b border-teal-50 pb-1">2. Configuración y Servicios</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Rol de Usuario</label>
                      <select 
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 text-sm font-medium"
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                      >
                        <option value="user">Agente de Leads (User)</option>
                        <option value="admin">Administrador (Admin)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Estado de Aprobación</label>
                      <select 
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 text-sm font-medium"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as UserStatus)}
                      >
                        <option value="approved">Aprobado / Activo</option>
                        <option value="pending">Pendiente de Aprobación</option>
                        <option value="blocked">Bloqueado / Inactivo</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. Bank / Transfer Details */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-wider border-b border-amber-50 pb-1">3. Información de Pago (Transferencias)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Banco Principal</label>
                      <select 
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 text-sm font-medium"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                      >
                        <option value="">-- Seleccionar Banco (Opcional) --</option>
                        {COMMON_BANKS.map((bk) => (
                          <option key={bk} value={bk}>{bk}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">CLABE Interbancaria</label>
                      <input 
                        type="text" 
                        placeholder="CLABE de 18 dígitos"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all text-sm font-mono"
                        value={clabe}
                        onChange={(e) => setClabe(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Número de Cuenta</label>
                      <input 
                        type="text" 
                        placeholder="Número de cuenta para transferencias"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all text-sm font-mono"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit buttons */}
                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSaving ? "Guardando..." : selectedUser ? "Actualizar Usuario" : "Crear Usuario"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
