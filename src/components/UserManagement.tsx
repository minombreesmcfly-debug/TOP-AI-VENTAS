import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
  Eye
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  updateDoc, 
  doc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, UserStatus } from '../types';

interface UserManagementProps {
  onInspectUser?: (userId: string) => void;
  onInspectProfile?: (userId: string) => void;
}

export function UserManagement({ onInspectUser, onInspectProfile }: UserManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const usersData: UserProfile[] = [];
      snap.forEach(d => usersData.push({ uid: d.id, ...d.data() } as UserProfile));
      setUsers(usersData);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleUpdateStatus = async (userId: string, status: UserStatus) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error updating user status:", err);
      alert("Error al actualizar el estado del usuario.");
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase())
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
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Aprobación y Roles</p>
          </div>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar usuario..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-10 text-slate-400">Cargando usuarios...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-10 text-slate-400">No se encontraron usuarios.</div>
        ) : (
          filteredUsers.map((user, i) => (
            <motion.div 
              key={`${user.uid || 'user'}-${i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 cursor-pointer group" onClick={() => onInspectProfile?.(user.uid)}>
                <div className="w-12 h-12 bg-slate-100 rounded-full flex-shrink-0 overflow-hidden border-2 border-slate-50 group-hover:border-indigo-400 transition-colors">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                      {user.displayName.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-700">{user.displayName}</h3>
                    {user.role === 'admin' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-black rounded-full border border-amber-100">
                        <Shield size={10} />
                        ADMIN
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <Mail size={12} />
                      {user.email}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-300 font-bold uppercase tracking-tight">
                      <Calendar size={10} />
                      Unido: {user.createdAt?.toDate?.()?.toLocaleDateString() || 'Reciente'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border ${
                  user.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                  user.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                  'bg-red-50 text-red-600 border-red-100'
                }`}>
                  {user.status.toUpperCase()}
                </div>
                
                <div className="h-8 w-[1px] bg-slate-100 hidden md:block" />

                <div className="flex items-center gap-2">
                  {onInspectProfile && (
                    <button 
                      onClick={() => onInspectProfile(user.uid)}
                      className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors"
                    >
                      Perfil
                    </button>
                  )}
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
                      <span className="md:hidden">APROBAR</span>
                    </button>
                  )}
                  {user.status === 'approved' && (
                    <button 
                      onClick={() => handleUpdateStatus(user.uid, 'blocked')}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2 text-xs font-black"
                      title="Bloquear Usuario"
                    >
                      <XCircle size={18} />
                      <span className="md:hidden">BLOQUEAR</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
