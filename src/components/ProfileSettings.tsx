import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  CreditCard, 
  Hash, 
  Save, 
  User as UserIcon,
  CheckCircle2,
  Phone,
  MapPin,
  Lock,
  Activity,
  Award
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';

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

interface ProfileSettingsProps {
  userProfile: UserProfile;
}

export function ProfileSettings({ userProfile }: ProfileSettingsProps) {
  const [formData, setFormData] = useState({
    displayName: userProfile.displayName || '',
    phone: userProfile.phone || '',
    state: userProfile.state || MEXICAN_STATES[0],
    pin: userProfile.pin || '',
    bankName: userProfile.bankName || '',
    accountNumber: userProfile.accountNumber || '',
    clabe: userProfile.clabe || ''
  });
  
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.displayName || !formData.phone) {
      alert("El nombre completo y el teléfono son campos obligatorios.");
      return;
    }
    
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
      alert("Error al guardar los datos de perfil.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 1. Dashboard plan status badges */}
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100 flex items-center justify-between max-w-sm">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-indigo-100">Mi Trio Asignado</p>
          <h3 className="text-xl font-black mt-1">{userProfile.trio || 'Sin Trio Asignado'}</h3>
        </div>
        <div className="p-3 bg-white/20 rounded-2xl">
          <Award size={24} />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-indigo-600 p-8 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 backdrop-blur-sm">
              <UserIcon size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">{userProfile.displayName}</h2>
              <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest">
                {userProfile.role === 'admin' ? 'Super Administrador' : 'Agente Autorizado'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Section 1: Personal Data */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 pb-2">
              <UserIcon size={16} className="text-slate-400" />
              Datos Personales de Contacto
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Nombre Completo *</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="text" 
                    required
                    placeholder="Tu nombre completo"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-medium text-sm"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Teléfono *</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="text" 
                    required
                    placeholder="Número de 10 dígitos"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-medium text-sm"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Estado de la República *</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <select 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  >
                    {MEXICAN_STATES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">PIN de Acceso / Password *</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="text" 
                    required
                    placeholder="PIN de acceso"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-mono text-sm"
                    value={formData.pin}
                    onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Payment Data */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 pb-2">
              <CreditCard size={16} className="text-slate-400" />
              Datos Bancarios para Transferencias de Comisiones
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Banco Destinatario</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <select 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium"
                    value={formData.bankName}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                  >
                    <option value="">-- Selecciona un banco --</option>
                    {COMMON_BANKS.map((bk) => (
                      <option key={bk} value={bk}>{bk}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">CLABE Interbancaria (18 dígitos)</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="text" 
                    placeholder="18 dígitos numéricos"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-mono text-sm"
                    value={formData.clabe}
                    onChange={(e) => setFormData(prev => ({ ...prev, clabe: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Número de Cuenta</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="text" 
                    placeholder="Número de cuenta bancaria"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-mono text-sm"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
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
                  <span>¡PERFIL ACTUALIZADO CON ÉXITO!</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>GUARDAR CAMBIOS</span>
                </>
              )}
            </button>
            <p className="text-center mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Puedes actualizar tus datos bancarios y personales en cualquier momento
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
