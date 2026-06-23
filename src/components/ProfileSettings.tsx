import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  CreditCard, 
  Hash, 
  Save, 
  User as UserIcon,
  CheckCircle2
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';

interface ProfileSettingsProps {
  userProfile: UserProfile;
}

export function ProfileSettings({ userProfile }: ProfileSettingsProps) {
  const [formData, setFormData] = useState({
    bankName: userProfile.bankName || '',
    accountNumber: userProfile.accountNumber || '',
    clabe: userProfile.clabe || ''
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        ...formData,
        updatedAt: serverTimestamp()
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Error al guardar los datos bancarios.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-indigo-600 p-8 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 backdrop-blur-sm">
              <UserIcon size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">{userProfile.displayName}</h2>
              <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest">{userProfile.role === 'admin' ? 'Super Admin' : 'Lead Agent'}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <CreditCard size={16} />
              Información de Pago para Comisiones
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter ml-1">Banco</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="text" 
                    placeholder="Ej. BBVA, Santander, Banorte..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-medium text-sm"
                    value={formData.bankName}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter ml-1">Número de Cuenta</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="text" 
                    placeholder="0000 0000 0000 0000"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-mono text-sm"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter ml-1">CLABE Interbancaria (18 dígitos)</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="text" 
                    placeholder="000000000000000000"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-mono text-sm"
                    value={formData.clabe}
                    onChange={(e) => setFormData(prev => ({ ...prev, clabe: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
                saved ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : saved ? (
                <>
                  <CheckCircle2 size={20} />
                  <span>¡GUARDADO CON ÉXITO!</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>GUARDAR CAMBIOS</span>
                </>
              )}
            </button>
            <p className="text-center mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Tus datos se usan únicamente para el pago de comisiones
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
