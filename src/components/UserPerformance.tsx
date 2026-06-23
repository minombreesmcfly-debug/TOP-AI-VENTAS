import React, { useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Target,
  ArrowRight,
  Calendar,
  Award,
  Users,
  ChevronLeft
} from 'lucide-react';
import { motion } from 'motion/react';
import { Lead, UserProfile, PACKAGE_INFO } from '../types';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

interface UserPerformanceProps {
  user: UserProfile;
  leads: Lead[];
  onBack: () => void;
}

export function UserPerformance({ user, leads, onBack }: UserPerformanceProps) {
  // Calculate stats for this specific user
  const userLeads = useMemo(() => {
    return leads.filter(l => l.ownerId === user.uid || (l.assignedUserIds && l.assignedUserIds.includes(user.uid)));
  }, [leads, user.uid]);

  const stats = useMemo(() => {
    const total = userLeads.length;
    const paid = userLeads.filter(l => l.demoStatus === 'paid');
    const potential = userLeads.filter(l => ['offered', 'accepted', 'sent'].includes(l.demoStatus));
    
    // Total earned: assuming each paid lead gives a fixed commission or a percentage
    // For this context, let's say 500 MXN per paid demo + 10% of package if paid
    const earnedCommissions = paid.reduce((acc, l) => {
      let packageCom = 0;
      if (l.packageStatus === 'basic') packageCom = 150; // 10% of 1500
      if (l.packageStatus === 'premium') packageCom = 300; // 10% of 3000
      return acc + 500 + packageCom;
    }, 0);

    const potentialCommissions = potential.reduce((acc, l) => {
      let packageCom = 0;
      if (l.packageStatus === 'basic') packageCom = 150;
      if (l.packageStatus === 'premium') packageCom = 300;
      return acc + 500 + packageCom;
    }, 0);

    const conversionRate = total > 0 ? (paid.length / total) * 100 : 0;

    return { 
      total, 
      paid: paid.length, 
      potential: potential.length, 
      earnedCommissions, 
      potentialCommissions,
      conversionRate
    };
  }, [userLeads]);

  // Data for charts
  const statusData = useMemo(() => [
    { name: 'Nuevos', value: userLeads.filter(l => l.demoStatus === 'new').length, color: '#94a3b8' },
    { name: 'En Proceso', value: userLeads.filter(l => ['offered', 'accepted', 'sent'].includes(l.demoStatus)).length, color: '#f59e0b' },
    { name: 'Pagados', value: userLeads.filter(l => l.demoStatus === 'paid').length, color: '#10b981' },
  ], [userLeads]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-white hover:bg-slate-50 text-slate-500 rounded-2xl shadow-sm border border-slate-100 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Perfil de Rendimiento</p>
              <div className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[8px] font-black uppercase">Agente Activo</div>
            </div>
            <h2 className="text-2xl font-black text-slate-800">{user.displayName}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <Award size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nivel de Desempeño</p>
            <p className="text-sm font-black text-emerald-600">{stats.conversionRate > 20 ? 'Excelente' : stats.conversionRate > 10 ? 'Bueno' : 'En Desarrollo'}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <DollarSign size={20} />
            </div>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Cobrado</p>
          </div>
          <p className="text-xs font-bold text-slate-400 mb-1">Comisiones Ganadas</p>
          <p className="text-2xl font-black text-slate-800">${stats.earnedCommissions.toLocaleString()} MXN</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <TrendingUp size={20} />
            </div>
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">En Pipeline</p>
          </div>
          <p className="text-xs font-bold text-slate-400 mb-1">Potencial Proyectado</p>
          <p className="text-2xl font-black text-slate-800">${stats.potentialCommissions.toLocaleString()} MXN</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Target size={20} />
            </div>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Ratio</p>
          </div>
          <p className="text-xs font-bold text-slate-400 mb-1">Tasa de Conversión</p>
          <p className="text-2xl font-black text-slate-800">{stats.conversionRate.toFixed(1)}%</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-slate-50 text-slate-600 rounded-xl">
              <Users size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Volumen</p>
          </div>
          <p className="text-xs font-bold text-slate-400 mb-1">Clientes Gestionados</p>
          <p className="text-2xl font-black text-slate-800">{stats.total}</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[40px] shadow-xl shadow-slate-200/50 border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
            <BarChart3 className="text-indigo-600" size={20} />
            Distribución de Estatus
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-xl shadow-slate-200/50 border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Award className="text-indigo-600" size={20} />
              Cuentas Bancarias Registradas
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShieldCheck size={16} />
            </div>
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Información para depósitos de comisiones</p>
          
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Institución</p>
              <p className="text-sm font-black text-slate-800">{user.bankName || 'No especificado'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Número de Cuenta</p>
              <p className="text-sm font-black text-slate-800 tracking-widest">{user.accountNumber || '•••• •••• •••• ••••'}</p>
            </div>
            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">CLABE Interbancaria</p>
              <p className="text-sm font-black text-indigo-600 tracking-widest">{user.clabe || 'No registrada'}</p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Saldo Pendiente de Pago</p>
              <Award size={16} className="opacity-50" />
            </div>
            <p className="text-2xl font-black">${stats.earnedCommissions.toLocaleString()} MXN</p>
            <p className="text-[9px] font-bold opacity-60 mt-1">* Corte próximo lunes 03:00 AM</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShieldCheck({ size }: { size: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
