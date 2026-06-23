import React, { useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { Lead, PACKAGE_INFO, DEMO_STATUS_COLORS } from '../types';
import { TrendingUp, DollarSign, Target, PieChart as PieIcon, LineChart } from 'lucide-react';

interface AnalyticsProps {
  leads: Lead[];
  onSelectCategory?: (category: string, label: string) => void;
}

const COLORS = {
  new: '#94a3b8',      // Slate
  contacted: '#6366f1', // Indigo
  offered: '#f59e0b',  // Amber
  accepted: '#10b981', // Emerald
  sent: '#ec4899',     // Pink
  paid: '#8b5cf6',     // Violet
  recurring: '#f43f5e', // Rose
};

export function DashboardAnalytics({ leads, onSelectCategory }: AnalyticsProps) {
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {
      new: 0,
      contacted: 0,
      offered: 0,
      accepted: 0,
      sent: 0,
      paid: 0,
      recurring: 0
    };
    leads.forEach(l => {
      if (counts[l.demoStatus] !== undefined) {
        counts[l.demoStatus]++;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.toUpperCase(),
      originalName: name,
      value,
      color: COLORS[name as keyof typeof COLORS]
    })).filter(d => d.value > 0);
  }, [leads]);

  const commissionData = useMemo(() => {
    let totalCommissions = 0;
    let pendingCommissions = 0;
    
    leads.forEach(l => {
      if (l.packageStatus !== 'none') {
        const commission = PACKAGE_INFO[l.packageStatus].price * 0.1; // 10% demo
        if (l.demoStatus === 'paid') {
          totalCommissions += commission;
        } else {
          pendingCommissions += commission;
        }
      }
    });

    return [
      { name: 'Pagadas', originalName: 'paid', value: totalCommissions, color: '#10b981' },
      { name: 'Pendientes', originalName: 'pending', value: pendingCommissions, color: '#f59e0b' }
    ].filter(d => d.value > 0);
  }, [leads]);

  const totalCommissions = commissionData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="space-y-8 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { id: 'paid', label: 'Efectividad', value: leads.length ? `${Math.round((leads.filter(l => l.demoStatus === 'paid').length / leads.length) * 100)}%` : '0%', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { id: 'paid', label: 'Comisiones Totales', value: `$${totalCommissions.toLocaleString()} MXN`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { id: 'all', label: 'Leads Activas', value: leads.length.toString(), icon: Target, color: 'text-pink-600', bg: 'bg-pink-50' },
          { id: 'offered', label: 'Conversión', value: leads.length ? `${Math.round((leads.filter(l => l.demoStatus !== 'new').length / leads.length) * 100)}%` : '0%', icon: LineChart, color: 'text-amber-600', bg: 'bg-amber-50' }
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={() => onSelectCategory?.(stat.id, stat.label)}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm cursor-pointer hover:border-indigo-300 transition-all active:scale-95"
          >
            <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
              <stat.icon size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-2xl font-black text-slate-800">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Distribution */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <PieIcon size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 tracking-tight">Distribución de Leads</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Resumen por Estado</p>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  onClick={(data: any) => onSelectCategory?.(data.originalName, `Leads: ${data.name}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Commission Summary */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 tracking-tight">Potencial de Comisiones</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pagadas vs Pendientes (MXN)</p>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={commissionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#94a3b8' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="value" 
                  radius={[10, 10, 10, 10]}
                  onClick={(data) => onSelectCategory?.(data.originalName, `Comisiones: ${data.name}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {commissionData.map((entry, index) => (
                    <Cell key={`cell-bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-50">
             <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Total Acumulado</span>
                <span className="text-xl font-black text-emerald-700">${totalCommissions.toLocaleString()} MXN</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
