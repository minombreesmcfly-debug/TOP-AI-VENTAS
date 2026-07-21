/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  setDoc,
  doc,
  getDoc,
  getDocs,
  getDocFromCache,
  getDocsFromCache,
  serverTimestamp,
  orderBy,
  arrayUnion,
  or,
  arrayRemove,
  getDocFromServer
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, signIn, signOut } from './lib/firebase';
import { Lead, DemoStatus, PackageStatus, PACKAGE_INFO, DEMO_STATUS_COLORS, UserProfile } from './types';
import { getLocalUsers, saveLocalUser, syncAndMergeUsers, syncLocalUsersToFirestore } from './lib/local-users';
import { formatMexicanPhone } from './lib/phone-helper';
import { OperationType, handleFirestoreError } from './lib/error-handler';
import { AIImporter } from './components/AIImporter';
import { UserManagement } from './components/UserManagement';
import { UserPerformance } from './components/UserPerformance';
import { DashboardAnalytics } from './components/DashboardAnalytics';
import { ProfileSettings } from './components/ProfileSettings';
import { TeamChat } from './components/TeamChat';
import { SalesAIAssistant } from './components/SalesAIAssistant';
import { SalesMaterials } from './components/SalesMaterials';
import { 
  Plus, 
  LogOut, 
  Presentation,
  LogIn, 
  Phone, 
  ExternalLink, 
  MessageSquare, 
  MapPin, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Check,
  Clock,
  Briefcase,
  TrendingUp,
  Filter,
  X,
  Search,
  Sparkles,
  MessageCircle,
  Users,
  LayoutDashboard,
  ShieldAlert,
  BarChart3,
  Eye,
  Shield,
  Map as MapIcon,
  Globe,
  CheckSquare,
  User as UserIcon,
  Loader2,
  Lock,
  Building2,
  CreditCard,
  Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';

// --- Constants ---
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

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

async function robustGetDoc(docRef: any) {
  try {
    return await getDoc(docRef);
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes('offline') || errMsg.includes('client is offline')) {
      try {
        const cached = await getDocFromCache(docRef);
        return cached;
      } catch (cacheErr) {
        console.warn("Failed to retrieve document from cache:", cacheErr);
      }
    }
    throw err;
  }
}

async function robustGetDocs(queryRef: any) {
  try {
    return await getDocs(queryRef);
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes('offline') || errMsg.includes('client is offline')) {
      try {
        return await getDocsFromCache(queryRef);
      } catch (cacheErr) {
        console.warn("Failed to retrieve query results from cache:", cacheErr);
      }
    }
    throw err;
  }
}

function LeadMap({ leads, allUsers }: { leads: Lead[], allUsers: UserProfile[] }) {
  const leadsWithLocation = useMemo(() => leads.filter(l => l.latitude && l.longitude), [leads]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  if (!GOOGLE_MAPS_API_KEY) return null;

  return (
    <div className="w-full h-[400px] rounded-3xl overflow-hidden border border-slate-100 shadow-sm mt-8 relative">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} version="weekly">
        <Map
          defaultCenter={{ lat: 29.073, lng: -110.955 }} // Default to Hermosillo/Mexico area
          defaultZoom={4}
          mapId="LEADS_MAP"
          style={{ width: '100%', height: '100%' }}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          gestureHandling="greedy"
          disableDefaultUI={true}
        >
          {leadsWithLocation.map((lead, idx) => (
            <LeadMarker 
              key={`${lead.id}-${idx}`} 
              lead={lead} 
              allUsers={allUsers}
              isSelected={selectedLeadId === lead.id}
              onClick={() => setSelectedLeadId(lead.id)}
            />
          ))}
        </Map>
      </APIProvider>
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-slate-100/50 pointer-events-none">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mapa de Cobertura</p>
        <p className="text-xs font-bold text-indigo-600">{leadsWithLocation.length} Leads geolocalizados</p>
      </div>
    </div>
  );
}

function LeadMarker({ lead, allUsers, isSelected, onClick }: { lead: Lead, allUsers: UserProfile[], isSelected: boolean, onClick: () => void, key?: any }) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: lead.latitude!, lng: lead.longitude! }}
        onClick={() => {
          setIsOpen(true);
          onClick();
        }}
      >
        <Pin 
          background={lead.demoStatus === 'paid' ? '#10b981' : '#4f46e5'} 
          glyphColor="#fff" 
          scale={isSelected ? 1.2 : 1}
        />
      </AdvancedMarker>
      {isOpen && (
        <InfoWindow anchor={marker} onCloseClick={() => setIsOpen(false)}>
          <div className="p-1 min-w-[150px]">
            <p className="text-xs font-black uppercase tracking-tight text-slate-800 mb-1">{lead.name}</p>
            <p className="text-[10px] text-slate-500 font-bold mb-1">📍 {lead.city}</p>
            <div className={`text-[9px] font-black uppercase inline-block px-1.5 py-0.5 rounded ${DEMO_STATUS_COLORS[lead.demoStatus]}`}>
              {lead.demoStatus}
            </div>
            <p className="text-[9px] text-indigo-500 font-bold mt-2">
              Asignado a: {allUsers.find(u => u.uid === lead.ownerId)?.displayName || '...'}
            </p>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

// --- App Component ---

function Logo({ className = "w-10 h-10 bg-white" }: { className?: string }) {
  const [hasLogo, setHasLogo] = useState(true);
  
  return (
    <div className={`${className} rounded-xl flex items-center justify-center overflow-hidden border border-slate-100/10 shadow-sm`}>
      {hasLogo ? (
        <img 
          src="/logo.png" 
          alt="Top AI MKT Logo" 
          className="w-full h-full object-contain p-0.5"
          onError={() => setHasLogo(false)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-5 h-5 border-3 border-indigo-600 rounded-full border-t-transparent animate-[spin_1s_linear_infinite]"></div>
      )}
    </div>
  );
}

function Header({ user, userProfile, isAdmin }: { user: User | null, userProfile: UserProfile | null, isAdmin: boolean }) {
  return (
    <header className="bg-indigo-600 text-white shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo className="w-10 h-10 bg-white" />
          <h1 className="text-2xl font-black tracking-tight flex items-baseline gap-2">
            TOP AI MKT 
            <span className="text-indigo-200 font-light italic text-sm hidden sm:inline">LeadOS</span>
          </h1>
        </div>
        
        {user ? (
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold">
                {isAdmin ? 'Super Admin' : 'Lead Agent'}
              </p>
              <p className="text-sm font-medium">{user.displayName || 'Demo Performance'}</p>
            </div>
            <div className="w-10 h-10 bg-indigo-500 rounded-full border-2 border-indigo-400 overflow-hidden flex items-center justify-center">
              <span className="text-sm font-bold">{user.displayName?.charAt(0).toUpperCase() || 'U'}</span>
            </div>
            <button 
              onClick={() => { 
                localStorage.removeItem('top_ai_mkt_custom_user_id'); 
                window.location.reload(); 
              }}
              className="p-2 text-indigo-100 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <div className="text-[10px] font-black uppercase tracking-widest text-indigo-200 italic">
            Acceso Autorizado
          </div>
        )}
      </div>
    </header>
  );
}

function Stats({ leads, onSelectCategory }: { leads: Lead[], onSelectCategory: (status: any, label: string) => void }) {
  const stats = useMemo(() => {
    const paidDemos = leads.filter(l => l.demoStatus === 'paid').length;
    const recurringLeads = leads.filter(l => l.demoStatus === 'recurring').length;
    const sentDemos = leads.filter(l => l.demoStatus === 'sent').length;
    const acceptedDemos = leads.filter(l => l.demoStatus === 'accepted' || l.demoStatus === 'offered').length;
    const contactedLeads = leads.filter(l => l.demoStatus === 'contacted').length;
    const totalLeads = leads.length;
    const newLeads = leads.filter(l => l.demoStatus === 'new').length;
    const demoIncome = paidDemos * 250;
    const potentialIncome = (totalLeads - paidDemos - recurringLeads) * 250;

    return { paidDemos, recurringLeads, sentDemos, acceptedDemos, totalLeads, newLeads, contactedLeads, demoIncome, potentialIncome };
  }, [leads]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
      {[
        { id: 'new', label: 'Nuevas Leads', value: stats.newLeads, color: 'text-slate-800', border: 'border-slate-400', icon: Clock, sub: `Potencial: $${stats.potentialIncome.toLocaleString()} MXN` },
        { id: 'contacted', label: 'Seguimiento', value: stats.contactedLeads, color: 'text-indigo-600', border: 'border-indigo-400', icon: Phone, sub: 'Contactados' },
        { id: 'sent', label: 'Demos Enviados', value: stats.sentDemos, color: 'text-slate-800', border: 'border-cyan-500', icon: MessageCircle, sub: 'Pendientes de pago' },
        { id: 'paid', label: 'Demos Pagados', value: stats.paidDemos, color: 'text-slate-800', border: 'border-emerald-500', icon: CheckCircle2, sub: `$${stats.demoIncome.toLocaleString()} MXN` },
        { id: 'offered', label: 'En Proceso', value: stats.acceptedDemos, color: 'text-slate-800', border: 'border-pink-500', icon: CheckSquare, sub: 'Demos aceptados' },
        { id: 'recurring', label: 'Suscripciones', value: stats.recurringLeads, color: 'text-rose-600', border: 'border-rose-400', icon: Users, sub: 'Recurrentes' },
        { id: 'all', label: 'Total Leads', value: stats.totalLeads, color: 'text-slate-800', border: 'border-orange-500', icon: TrendingUp, sub: 'Lead Pipeline' },
      ].map((s, i) => (
        <motion.div 
          key={s.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          onClick={() => onSelectCategory(s.id as any, s.label)}
          className={`bg-white p-5 rounded-2xl shadow-sm border-b-4 ${s.border} flex flex-col justify-between h-32 cursor-pointer hover:scale-[1.02] transition-transform active:scale-95`}
        >
          <div className="flex items-center justify-between text-gray-500 text-[10px] uppercase tracking-widest font-black">
            {s.label}
            <s.icon size={14} className="opacity-20" />
          </div>
          <div>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <p className="text-[10px] text-gray-400 font-medium italic mt-1 font-bold">{s.sub}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function StatDetailModal({ 
  category, 
  leads, 
  onClose,
  onEditLead,
  onGoToLead,
  onCallLead,
  onDeleteLead,
  onQuickStatusChange
}: { 
  category: { id: string, label: string }, 
  leads: Lead[], 
  onClose: () => void,
  onEditLead: (lead: Lead) => void,
  onGoToLead: (lead: Lead) => void,
  onCallLead: (lead: Lead) => void,
  onDeleteLead: (id: string) => void,
  onQuickStatusChange?: (id: string, newStatus: DemoStatus) => Promise<void>
}) {
  const filteredLeads = useMemo(() => {
    if (category.id === 'all') return leads;
    if (category.id === 'paid' || category.id === 'pending') {
      if (category.id === 'paid') return leads.filter(l => l.demoStatus === 'paid');
      return leads.filter(l => l.demoStatus !== 'paid' && l.packageStatus !== 'none');
    }
    return leads.filter(l => l.demoStatus === category.id);
  }, [category, leads]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">{category.label}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">
              {filteredLeads.length} registros encontrados
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-200 rounded-2xl transition-colors text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLeads.map((lead) => (
              <div 
                key={lead.id}
                onClick={() => onGoToLead(lead)}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col hover:border-indigo-300 hover:shadow-md transition-all group cursor-pointer relative"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-black text-slate-800 text-sm leading-tight group-hover:text-indigo-600 transition-colors">{lead.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{lead.city || 'Ubicación no especificada'}</p>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => onCallLead(lead)}
                      className="p-2 bg-white shadow-sm rounded-lg text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-50"
                      title="Enviar WhatsApp"
                    >
                      <MessageCircle size={14} />
                    </button>
                    <button 
                      onClick={() => onEditLead(lead)}
                      className="p-2 bg-white shadow-sm rounded-lg text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all border border-indigo-50"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => onDeleteLead(lead.id)}
                      className="p-2 bg-white shadow-sm rounded-lg text-red-600 hover:bg-red-600 hover:text-white transition-all border border-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <div 
                  className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-slate-200/50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fase:</span>
                    <select
                      value={lead.demoStatus}
                      onChange={async (e) => {
                        if (onQuickStatusChange) {
                          await onQuickStatusChange(lead.id, e.target.value as DemoStatus);
                        }
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer focus:ring-1 focus:ring-indigo-100 focus:border-indigo-500"
                    >
                      <option value="new">Nuevo</option>
                      <option value="contacted">Seguimiento</option>
                      <option value="offered">Ofrecido</option>
                      <option value="accepted">En Proceso</option>
                      <option value="sent">Demo Enviado</option>
                      <option value="paid">Demo Pagado</option>
                      <option value="recurring">Suscripción</option>
                    </select>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">{lead.phone}</span>
                </div>
              </div>
            ))}

            {filteredLeads.length === 0 && (
              <div className="col-span-full py-12 text-center">
                <p className="text-slate-400 font-bold italic">No hay leads en este segmento.</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
          >
            Cerrar Ventana
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [view, setView] = useState<'leads' | 'users' | 'analytics' | 'profile' | 'chat' | 'ai' | 'materials'>('leads');
  
  // Custom Auth state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regState, setRegState] = useState('Ciudad de México');
  const [regPin, setRegPin] = useState('');
  const [regBankName, setRegBankName] = useState('');
  const [regAccountNumber, setRegAccountNumber] = useState('');
  const [regClabe, setRegClabe] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPin) {
      setAuthError('Por favor ingresa usuario y PIN.');
      return;
    }
    
    setIsAuthenticating(true);
    setAuthError('');
    
    try {
      let profile: UserProfile | null = null;
      const usernameLower = loginUsername.trim().toLowerCase();
      
      const trimmedPhone = loginUsername.trim();
      const inputDigits = trimmedPhone.replace(/\D/g, '');

      if (usernameLower === 'admin') {
        // Try Firestore first for admin
        try {
          const snap = await robustGetDoc(doc(db, 'users', 'admin'));
          if (snap.exists()) {
            profile = { uid: 'admin', ...(snap.data() as any) } as UserProfile;
            saveLocalUser(profile);
          }
        } catch (err) {
          console.warn("Could not read admin from Firestore, trying local fallback:", err);
        }

        // Local Admin fallback if offline or not in Firestore yet
        if (!profile) {
          const localUsers = getLocalUsers();
          const localAdmin = localUsers.find(u => u.uid === 'admin');
          if (localAdmin) {
            profile = localAdmin;
          } else {
            profile = {
              uid: 'admin',
              displayName: 'Administrador',
              phone: 'admin',
              role: 'admin',
              status: 'approved',
              pin: '3223',
              mins: 'Ilimitados',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            saveLocalUser(profile);
          }
        }
      } else {
        // 1. Look up locally first
        const localUsers = getLocalUsers();
        profile = localUsers.find(u => 
          u.phone === trimmedPhone ||
          (inputDigits.length >= 7 && u.phone && u.phone.replace(/\D/g, '') === inputDigits) ||
          (inputDigits.length >= 10 && u.phone && u.phone.replace(/\D/g, '').endsWith(inputDigits.slice(-10)))
        ) || null;

        // 2. Query Firestore by exact phone string match
        if (!profile) {
          try {
            const q = query(collection(db, 'users'), where('phone', '==', trimmedPhone));
            const snap = await robustGetDocs(q);
            if (!snap.empty) {
              profile = { uid: snap.docs[0].id, ...(snap.docs[0].data() as any) } as UserProfile;
              saveLocalUser(profile);
            }
          } catch (err) {
            console.warn("Could not query Firestore for user phone exact match:", err);
          }
        }

        // 3. Query Firestore for all users to match by normalized phone digits or displayName
        if (!profile) {
          try {
            const allUsersSnap = await robustGetDocs(collection(db, 'users'));
            allUsersSnap.docs.forEach(docSnap => {
              if (profile) return;
              const uData = docSnap.data() as UserProfile;
              const uPhone = (uData.phone || '').trim();
              const uDigits = uPhone.replace(/\D/g, '');

              if (
                uPhone === trimmedPhone ||
                (inputDigits.length >= 7 && uDigits === inputDigits) ||
                (inputDigits.length >= 10 && uDigits.length >= 10 && uDigits.slice(-10) === inputDigits.slice(-10)) ||
                (uData.displayName && uData.displayName.trim().toLowerCase() === usernameLower)
              ) {
                profile = { uid: docSnap.id, ...uData };
                saveLocalUser(profile);
              }
            });
          } catch (err) {
            console.warn("Could not query Firestore all users fallback:", err);
          }
        }
      }
      
      if (!profile) {
        setAuthError('El usuario o número de teléfono no está registrado.');
        setIsAuthenticating(false);
        return;
      }
      
      if (profile.pin !== loginPin.trim()) {
        setAuthError('PIN de seguridad incorrecto.');
        setIsAuthenticating(false);
        return;
      }
      
      // Store session and set states
      localStorage.setItem('top_ai_mkt_custom_user_id', profile.uid);
      setUserProfile(profile);
      setUser({
        uid: profile.uid,
        email: profile.email || '',
        displayName: profile.displayName
      } as any);
      
      // Clear fields
      setLoginUsername('');
      setLoginPin('');
    } catch (err: any) {
      console.error("Error in custom login:", err);
      setAuthError('Ocurrió un error al iniciar sesión: ' + err.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleCustomRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regDisplayName || !regPhone || !regPin) {
      setAuthError('Nombre, Teléfono y PIN son requeridos.');
      return;
    }
    
    setIsAuthenticating(true);
    setAuthError('');
    
    try {
      const trimmedPhone = regPhone.trim();
      const inputDigits = trimmedPhone.replace(/\D/g, '');
      
      // Check local users first
      const localUsers = getLocalUsers();
      const existingLocal = localUsers.find(u => 
        u.phone === trimmedPhone || 
        (inputDigits.length >= 7 && u.phone && u.phone.replace(/\D/g, '') === inputDigits)
      );
      if (existingLocal) {
        setAuthError('Este número de teléfono ya está registrado localmente.');
        setIsAuthenticating(false);
        return;
      }

      // Check Firestore if online
      try {
        const q = query(collection(db, 'users'), where('phone', '==', trimmedPhone));
        const snap = await robustGetDocs(q);
        if (!snap.empty) {
          setAuthError('Este número de teléfono ya está registrado.');
          setIsAuthenticating(false);
          return;
        }
      } catch (err) {
        console.log("Firestore uniqueness check skipped (running in offline-mode fallback).");
      }
      
      const newUid = 'usr_' + Date.now();
      const userPayload: UserProfile = {
        uid: newUid,
        displayName: regDisplayName.trim(),
        phone: trimmedPhone,
        state: regState,
        pin: regPin.trim(),
        bankName: regBankName,
        accountNumber: regAccountNumber.trim(),
        clabe: regClabe.trim(),
        role: 'user',
        status: 'pending', // Pending approval by admin!
        mins: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save locally first
      saveLocalUser(userPayload);

      // Save to Firestore database directly
      try {
        await setDoc(doc(db, 'users', newUid), {
          ...userPayload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log("User successfully saved to Firestore database:", newUid);
      } catch (err: any) {
        console.warn("Firestore user save warning:", err.message);
      }
      
      alert('¡Registro exitoso! Tu cuenta está en espera de la aprobación de un administrador.');
      
      // Switch to login mode and pre-fill username
      setLoginUsername(trimmedPhone);
      setAuthMode('login');
      
      // Reset registration form
      setRegDisplayName('');
      setRegPhone('');
      setRegPin('');
      setRegBankName('');
      setRegAccountNumber('');
      setRegClabe('');
    } catch (err: any) {
      console.error("Error in custom registration:", err);
      setAuthError('Error al registrarse: ' + err.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [inspectingUserProfileId, setInspectingUserProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<DemoStatus | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [targetAgentId, setTargetAgentId] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isBulkEditingLocation, setIsBulkEditingLocation] = useState(false);
  const [bulkLocation, setBulkLocation] = useState('');
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [isAIImporterOpen, setIsAIImporterOpen] = useState(false);
  const [selectedStatCategory, setSelectedStatCategory] = useState<{ id: string, label: string } | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showDeleteAllNewConfirm, setShowDeleteAllNewConfirm] = useState(false);

  const availableCities = useMemo(() => {
    const cities = leads.map(l => l.city).filter(Boolean) as string[];
    return Array.from(new Set(cities)).sort();
  }, [leads]);

  const handleStatSelect = (id: string, label: string) => {
    setSelectedStatCategory({ id, label });
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const handleBulkAssign = async (targetOwnerId: string) => {
    if (!targetOwnerId || selectedLeadIds.length === 0) return;
    setIsBulkAssigning(true);
    try {
      const promises = selectedLeadIds.map(id => 
        updateDoc(doc(db, 'leads', id), {
          assignedUserIds: arrayUnion(targetOwnerId),
          updatedAt: serverTimestamp()
        })
      );
      await Promise.all(promises);
      setSelectedLeadIds([]);
      setTargetAgentId('');
    } catch (err) {
      console.error("Error en asignación masiva:", err);
      alert("Error al asignar leads de forma masiva.");
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const handleBulkRemove = async (targetOwnerId: string) => {
    if (!targetOwnerId || selectedLeadIds.length === 0) return;
    setIsBulkAssigning(true);
    try {
      const promises = selectedLeadIds.map(id => 
        updateDoc(doc(db, 'leads', id), {
          assignedUserIds: arrayRemove(targetOwnerId),
          updatedAt: serverTimestamp()
        })
      );
      await Promise.all(promises);
      setSelectedLeadIds([]);
      setTargetAgentId('');
    } catch (err) {
      console.error("Error en desasignación masiva:", err);
      alert("Error al quitar acceso de forma masiva.");
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const handleBulkUpdateLocation = async () => {
    if (!bulkLocation || selectedLeadIds.length === 0) return;
    setIsBulkAssigning(true);
    try {
      const promises = selectedLeadIds.map(id => 
        updateDoc(doc(db, 'leads', id), {
          city: bulkLocation,
          updatedAt: serverTimestamp()
        })
      );
      await Promise.all(promises);
      setSelectedLeadIds([]);
      setBulkLocation('');
      setIsBulkEditingLocation(false);
    } catch (err) {
      console.error("Error en actualización masiva de ubicación:", err);
      alert("Error al actualizar la ubicación de forma masiva.");
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const confirmBulkDelete = async () => {
    setIsBulkAssigning(true);
    try {
      const batch = writeBatch(db);
      selectedLeadIds.forEach(id => {
        batch.delete(doc(db, 'leads', id));
      });
      await batch.commit();
      setSelectedLeadIds([]);
      setShowBulkDeleteConfirm(false);
      alert("Leads eliminados correctamente.");
    } catch (err: any) {
      console.error("Error en eliminación masiva:", err);
      alert("Error al eliminar leads: " + err.message);
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const handleDeleteAllNewLeads = async () => {
    const newLeads = leads.filter(l => l.demoStatus === 'new');
    if (newLeads.length === 0) {
      alert("No hay nuevas leads para eliminar.");
      return;
    }
    setIsBulkAssigning(true);
    try {
      const batch = writeBatch(db);
      newLeads.forEach(lead => {
        batch.delete(doc(db, 'leads', lead.id));
      });
      await batch.commit();
      setShowDeleteAllNewConfirm(false);
      alert(`${newLeads.length} nuevas leads eliminadas correctamente.`);
    } catch (err: any) {
      console.error("Error al eliminar todas las nuevas leads:", err);
      alert("Error al eliminar todas las nuevas leads: " + err.message);
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const isBootstrapAdmin = user?.email?.toLowerCase() === 'minombreesmcfly@gmail.com';
  const isAdmin = userProfile?.role === 'admin' || isBootstrapAdmin;

  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;
    
    setShowBulkDeleteConfirm(true);
  };

  const startAuditingUser = (userId: string) => {
    setViewingUserId(userId);
    setView('leads');
  };

  const stopAuditingUser = () => {
    setViewingUserId(null);
  };

  // Custom user session manager
  useEffect(() => {
    // Function to seed/ensure default admin user exists in Firestore
    const ensureAdminExists = async () => {
      try {
        const adminRef = doc(db, 'users', 'admin');
        const adminSnap = await robustGetDoc(adminRef);
        if (!adminSnap.exists()) {
          await setDoc(adminRef, {
            uid: 'admin',
            displayName: 'Administrador',
            phone: 'admin',
            role: 'admin',
            status: 'approved',
            pin: '3223',
            mins: 'Ilimitados',
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log("Seeded default admin user in Firestore");
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        if (errMsg.includes('client is offline') || errMsg.includes('offline')) {
          console.log("Firestore client is offline, admin seeding skipped.");
        } else {
          console.warn("Could not seed default admin user (possibly offline or unprovisioned):", errMsg);
        }
      }
    };

    ensureAdminExists().then(() => {
      syncLocalUsersToFirestore(db);
    });

    const customUserId = localStorage.getItem('top_ai_mkt_custom_user_id');
    if (!customUserId) {
      setUser(null);
      setUserProfile(null);
      setLoading(false);
      return;
    }

    // Attempt to load from local storage first to prevent blocking/hanging if offline
    const localUsers = getLocalUsers();
    const localProfile = localUsers.find(u => u.uid === customUserId);
    if (localProfile) {
      setUserProfile(localProfile);
      setUser({
        uid: localProfile.uid,
        email: localProfile.email || '',
        displayName: localProfile.displayName
      } as any);
      setLoading(false);
    }

    // Subscribe to current custom user profile
    const unsub = onSnapshot(doc(db, 'users', customUserId), (snap) => {
      if (snap.exists()) {
        const profile = { uid: snap.id, ...snap.data() } as UserProfile;
        setUserProfile(profile);
        setUser({
          uid: profile.uid,
          email: profile.email || '',
          displayName: profile.displayName
        } as any);
        saveLocalUser(profile);
      } else {
        if (!localProfile) {
          localStorage.removeItem('top_ai_mkt_custom_user_id');
          setUser(null);
          setUserProfile(null);
        }
      }
      setLoading(false);
    }, (error: any) => {
      const errMsg = error?.message || String(error);
      if (errMsg.includes('client is offline') || errMsg.includes('offline')) {
        console.log("Firestore client is offline while reading session. Using local cached profile.");
      } else {
        console.warn("Error reading custom user session:", errMsg);
      }
      if (!localProfile) {
        localStorage.removeItem('top_ai_mkt_custom_user_id');
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsub;
  }, []);

  // Fetch all users for admin
  useEffect(() => {
    if (userProfile?.role !== 'admin') {
      setAllUsers([]);
      return;
    }

    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const usersData = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      const merged = syncAndMergeUsers(usersData);
      setAllUsers(merged);
    }, (error: any) => {
      console.warn("Firestore user subscription failed (offline/error):", error);
      const localUsers = getLocalUsers();
      setAllUsers(localUsers);
    });

    return unsub;
  }, [userProfile]);

  useEffect(() => {
    if (!user || userProfile?.status !== 'approved') {
      setLeads([]);
      return;
    }

    let q: any;
    if (isAdmin) {
      if (viewingUserId) {
        // Auditor view: Filter leads assigned to the target user
        q = query(
          collection(db, 'leads'),
          or(
            where('ownerId', '==', viewingUserId),
            where('assignedUserIds', 'array-contains', viewingUserId)
          ),
          orderBy('createdAt', 'desc')
        );
      } else {
        // Global view: See everything
        q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
      }
    } else {
      // Normal agent view: Only their own or shared leads
      q = query(
        collection(db, 'leads'),
        or(
          where('ownerId', '==', user.uid),
          where('assignedUserIds', 'array-contains', user.uid)
        ),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      if (snapshot.metadata.hasPendingWrites) {
        // This is a local update, we can still process it but maybe it's the 
        // cause of the 'disappearing' if it doesn't match the server state later.
        // However, standard onSnapshot handles this.
      }
      const leadsData: Lead[] = [];
      snapshot.forEach((doc) => {
        leadsData.push({ id: doc.id, ...doc.data() } as Lead);
      });
      const uniqueLeads = leadsData.reduce((acc, current) => {
        const x = acc.find(item => item.id === current.id);
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, [] as Lead[]);
      console.log(`Fetched ${uniqueLeads.length} unique leads for user ${user.uid}`);
      setLeads(uniqueLeads);
    }, (error: any) => {
      const errMsg = error?.message || String(error);
      if (errMsg.includes('client is offline') || errMsg.includes('offline')) {
        console.log("Firestore client is offline while listening to leads.");
      } else {
        console.warn("Firestore Snapshot Error:", errMsg);
        handleFirestoreError(error, OperationType.LIST, 'leads');
      }
    });

    return unsubscribe;
  }, [user, userProfile, viewingUserId]);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (l.phone?.includes(searchTerm));
      const matchesFilter = filterStatus === 'all' || l.demoStatus === filterStatus;
      const matchesLocation = !locationFilter || (l.city?.toLowerCase().includes(locationFilter.toLowerCase()));
      return matchesSearch && matchesFilter && matchesLocation;
    }).sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [leads, searchTerm, filterStatus, locationFilter, sortOrder]);

  const handleWhatsAppLead = async (lead: Lead) => {
    if (!lead.phone) return;
    
    // 1. Abrir aplicación de WhatsApp
    window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank');
    
    // 2. Actualizar Firebase
    try {
      const today = new Date().toISOString().split('T')[0];
      const docRef = doc(db, 'leads', lead.id);
      
      const updateData: any = {
        lastContactDate: today,
        updatedAt: serverTimestamp(),
      };
      
      // Si es un lead nuevo, marcar como contactado automáticamente
      if (lead.demoStatus === 'new') {
        updateData.demoStatus = 'contacted';
      }
      
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error("Error al registrar contacto de WhatsApp:", error);
    }
  };

  const handleSaveLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const latStr = formData.get('latitude') as string;
    const lngStr = formData.get('longitude') as string;
    const targetOwnerId = formData.get('ownerId') as string;

    setIsSaving(true);
    console.log(">>> [DEBUG] Iniciando guardado de lead...");

    try {
      // Construimos un objeto data limpio sin valores undefined
      const rawData: any = {
        name: formData.get('name') || "",
        businessOwnerName: formData.get('businessOwnerName') || "",
        city: formData.get('city') || "",
        lastContactDate: formData.get('lastContactDate') || "",
        followUpDate: formData.get('followUpDate') || "",
        phone: formatMexicanPhone(formData.get('phone') as string || ""),
        notes: formData.get('notes') || "",
        demoStatus: formData.get('demoStatus'),
        packageStatus: formData.get('packageStatus'),
        updatedAt: serverTimestamp(),
      };

      if (latStr && !isNaN(parseFloat(latStr))) rawData.latitude = parseFloat(latStr);
      if (lngStr && !isNaN(parseFloat(lngStr))) rawData.longitude = parseFloat(lngStr);

      if (editingLead) {
        console.log(">>> [DEBUG] Actualizando lead existente:", editingLead.id);
        
        if (targetOwnerId && targetOwnerId !== editingLead.ownerId) {
          console.log(">>> [DEBUG] Detectada reasignación a:", targetOwnerId);
          rawData.ownerId = targetOwnerId;
          rawData.assignedUserIds = arrayUnion(targetOwnerId);
        }
        
        const docRef = doc(db, 'leads', editingLead.id);
        await updateDoc(docRef, rawData);
        console.log(">>> [DEBUG] Update saved in Firebase");
      } else {
        console.log(">>> [DEBUG] Creando nuevo lead");
        const creatorId = user.uid;
        const finalOwnerId = targetOwnerId || creatorId;
        
        await addDoc(collection(db, 'leads'), {
          ...rawData,
          ownerId: finalOwnerId,
          assignedUserIds: [finalOwnerId],
          createdAt: serverTimestamp(),
        });
        console.log(">>> [DEBUG] Lead saved in Firebase");
      }

      setIsModalOpen(false);
      setEditingLead(null);
      setTimeout(() => alert("¡Guardado correctamente!"), 100);
    } catch (error: any) {
      console.error(">>> [DEBUG] ERROR AL GUARDAR LEAD:", error);
      alert("Error al guardar: " + error.message);
      handleFirestoreError(error, OperationType.WRITE, 'leads');
    } finally {
      setIsSaving(false);
      console.log(">>> [DEBUG] Fin del proceso de guardado");
    }
  };

  const formatWhatsAppLink = (phone?: string) => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return null;
    
    let finalPhone = cleanPhone;
    // If starts with 1 and is 11 digits (USA)
    if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
      finalPhone = cleanPhone;
    } else if (cleanPhone.length === 10) {
      // Default to Mexico if 10 digits
      finalPhone = `52${cleanPhone}`;
    }
    return `https://wa.me/${finalPhone}`;
  };

  const confirmDeleteLead = async () => {
    if (!leadToDelete) return;
    try {
      await deleteDoc(doc(db, 'leads', leadToDelete));
      setLeadToDelete(null);
      alert("Lead eliminado correctamente.");
    } catch (error: any) {
      console.error("Error al eliminar lead:", error);
      alert("Error al eliminar lead: " + error.message);
    }
  };

  const handleDeleteLead = async (id: string) => {
    setLeadToDelete(id);
  };

  const handleQuickStatusChange = async (id: string, newStatus: DemoStatus) => {
    try {
      await updateDoc(doc(db, 'leads', id), {
        demoStatus: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.error("Error al actualizar estatus rápido:", error);
      alert("Error al actualizar estatus: " + error.message);
    }
  };

  const handleRemoveAssignment = async (leadId: string, userIdToRemove: string) => {
    if (!window.confirm(`¿Deseas quitar el acceso a este lead para ${allUsers.find(u => u.uid === userIdToRemove)?.displayName}?`)) return;
    try {
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        assignedUserIds: arrayRemove(userIdToRemove),
        updatedAt: serverTimestamp()
      });
      if (editingLead?.id === leadId) {
        setEditingLead(prev => prev ? {
          ...prev,
          assignedUserIds: (prev.assignedUserIds || []).filter(id => id !== userIdToRemove)
        } : null);
      }
    } catch (error) {
      console.error("Error removing assignment:", error);
      alert("Hubo un error al quitar el acceso.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Header user={user} userProfile={userProfile} isAdmin={isAdmin} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!user ? (
          <div className="max-w-md mx-auto">
            {/* Tab Selectors */}
            <div className="flex bg-slate-200/60 p-1 rounded-2xl mb-6 border border-slate-100">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                  authMode === 'login'
                    ? 'bg-white text-slate-800 shadow'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setAuthError(''); }}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                  authMode === 'register'
                    ? 'bg-white text-slate-800 shadow'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Registrar Cuenta
              </button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 space-y-6"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <Logo className="w-16 h-16 bg-slate-50 border border-slate-100 shadow-sm" />
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
                    {authMode === 'login' ? 'Bienvenido' : 'Crear Cuenta'}
                  </h2>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                    {authMode === 'login' 
                      ? 'Gestiona tus leads y prospectos'
                      : 'Llena tus datos para registrarte en Top AI MKT'}
                  </p>
                </div>
              </div>

              {authError && (
                <div className="p-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-xs font-bold text-center uppercase tracking-wide">
                  {authError}
                </div>
              )}

              {authMode === 'login' ? (
                <form onSubmit={handleCustomLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Usuario / Teléfono</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input
                        type="text"
                        required
                        placeholder="Ej. admin o tu teléfono"
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-medium text-sm"
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">PIN de Seguridad</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input
                        type="password"
                        required
                        placeholder="Ej. 3223 o tu PIN"
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-mono text-sm"
                        value={loginPin}
                        onChange={(e) => setLoginPin(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
                  >
                    {isAuthenticating ? 'Autenticando...' : 'INGRESAR A LA PLATAFORMA'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCustomRegister} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Nombre Completo *</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input
                        type="text"
                        required
                        placeholder="Ej. Juan Pérez"
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-medium text-sm"
                        value={regDisplayName}
                        onChange={(e) => setRegDisplayName(e.target.value)}
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
                        placeholder="Ej. 5512345678"
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-medium text-sm"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Estado de la República *</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <select
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium"
                        value={regState}
                        onChange={(e) => setRegState(e.target.value)}
                      >
                        {MEXICAN_STATES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">PIN de Seguridad *</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input
                        type="text"
                        required
                        placeholder="PIN para iniciar sesión"
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-mono text-sm font-medium"
                        value={regPin}
                        onChange={(e) => setRegPin(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Optional Bank Info */}
                  <div className="border-t border-slate-100 pt-4 mt-2 space-y-4">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                      Datos de Pago (Opcionales - se pueden agregar después)
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Banco Destinatario</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <select
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium"
                          value={regBankName}
                          onChange={(e) => setRegBankName(e.target.value)}
                        >
                          <option value="">-- Selecciona un banco (Opcional) --</option>
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
                          placeholder="CLABE de 18 dígitos"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-mono text-sm"
                          value={regClabe}
                          onChange={(e) => setRegClabe(e.target.value)}
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
                          value={regAccountNumber}
                          onChange={(e) => setRegAccountNumber(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-teal-100 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
                  >
                    {isAuthenticating ? 'Registrando...' : 'REGISTRAR MI CUENTA'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        ) : userProfile?.status === 'pending' ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto py-20 text-center bg-white p-10 rounded-3xl shadow-xl border border-amber-100"
          >
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="text-amber-500" size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">Cuenta Pendiente</h2>
            <p className="text-slate-500 text-sm font-medium mb-8">
              Tu cuenta ha sido creada exitosamente, pero requiere la aprobación del administrador para acceder a las leads y herramientas.
            </p>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
              Por favor revisa más tarde o contacta a soporte
            </div>
          </motion.div>
        ) : userProfile?.status === 'blocked' ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto py-20 text-center bg-white p-10 rounded-3xl shadow-xl border border-red-100"
          >
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="text-red-500" size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">Acceso Denegado</h2>
            <p className="text-slate-500 text-sm font-medium mb-8">
              Tu acceso a la plataforma ha sido revocado. Contacta al administrador para más información.
            </p>
          </motion.div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-8 bg-white p-1 rounded-2xl shadow-sm border border-slate-100 w-fit">
              <button 
                onClick={() => { setView('leads'); stopAuditingUser(); }}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${
                  view === 'leads' && !viewingUserId
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <LayoutDashboard size={14} />
                LEADS
              </button>
              <button 
                onClick={() => setView('chat')}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${
                  view === 'chat' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <MessageSquare size={14} />
                CHAT INTERNO
              </button>
              <button 
                onClick={() => setView('ai')}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${
                  view === 'ai' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Sparkles size={14} />
                ASISTENTE AI
              </button>
              <button 
                onClick={() => setView('materials')}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${
                  view === 'materials' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Presentation size={14} />
                MATERIAL DE APOYO
              </button>
              <button 
                onClick={() => setView('analytics')}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${
                  view === 'analytics' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <BarChart3 size={14} />
                ESTADÍSTICAS
              </button>
              <button 
                onClick={() => setView('profile')}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${
                  view === 'profile' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <UserIcon size={14} />
                MI PERFIL
              </button>
              {isAdmin && (
                <button 
                  onClick={() => setView('users')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${
                    view === 'users' 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Users size={14} />
                  USUARIOS
                </button>
              )}
            </div>

            {viewingUserId && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl mb-8 flex items-center justify-between shadow-xl shadow-indigo-100"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Eye size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Modo Auditoría Activo</p>
                    <p className="text-sm font-black">Viendo dashboard de: <span className="underline">{allUsers.find(u => u.uid === viewingUserId)?.displayName || 'Cargando...'}</span></p>
                  </div>
                </div>
                <button 
                  onClick={stopAuditingUser}
                  className="px-4 py-2 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors"
                >
                  SALIR DEL MODO AUDITORÍA
                </button>
              </motion.div>
            )}

            {view === 'users' && isAdmin ? (
              inspectingUserProfileId ? (
                <UserPerformance 
                  user={allUsers.find(u => u.uid === inspectingUserProfileId)!} 
                  leads={leads}
                  onBack={() => setInspectingUserProfileId(null)}
                />
              ) : (
                <UserManagement 
                  onInspectUser={startAuditingUser} 
                  onInspectProfile={(uid) => setInspectingUserProfileId(uid)}
                />
              )
            ) : view === 'chat' ? (
              <TeamChat userProfile={userProfile!} allUsers={allUsers} />
            ) : view === 'ai' ? (
              <SalesAIAssistant userProfile={userProfile!} />
            ) : view === 'materials' ? (
              <SalesMaterials userProfile={userProfile!} />
            ) : view === 'analytics' ? (
              <DashboardAnalytics leads={leads} onSelectCategory={handleStatSelect} />
            ) : view === 'profile' ? (
              <ProfileSettings 
                userProfile={userProfile!} 
                onProfileUpdated={(updated) => {
                  setUserProfile(updated);
                  setUser(prev => prev ? {
                    ...prev,
                    displayName: updated.displayName
                  } : null);
                }}
              />
            ) : (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-6 bg-indigo-600 rounded-full" />
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Listado de Clientes Activos</h2>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={() => setIsAIImporterOpen(true)}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-indigo-600 text-indigo-600 rounded-2xl hover:bg-indigo-50 transition-all font-black text-xs active:scale-95 shadow-sm"
                    >
                      <Sparkles size={14} />
                      <span>ASISTENTE AI</span>
                    </button>
                    {leads.some(l => l.demoStatus === 'new') && (
                      <button 
                        onClick={() => setShowDeleteAllNewConfirm(true)}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 border border-red-200 rounded-2xl hover:bg-red-100 transition-all font-black text-xs active:scale-95 shadow-sm"
                        title="Eliminar absolutamente todas las nuevas leads"
                      >
                        <Trash2 size={14} />
                        <span>ELIMINAR NUEVAS LEADS</span>
                      </button>
                    )}
                    <button 
                      onClick={() => { setEditingLead(null); setIsModalOpen(true); }}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all font-black shadow-lg shadow-indigo-100 active:scale-95"
                    >
                      <Plus size={18} />
                      <span>NUEVO LEAD</span>
                    </button>
                  </div>
                </div>

                <Stats leads={leads} onSelectCategory={handleStatSelect} />

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Bulk Selection and Info */}
                    <div className="flex items-center gap-3 pr-4 border-r border-slate-100 hidden lg:flex">
                        <button 
                          onClick={() => handleSelectAll(selectedLeadIds.length !== filteredLeads.length)}
                          className={`p-2 rounded-lg transition-all ${selectedLeadIds.length === filteredLeads.length ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                          title="Seleccionar todos"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                        {selectedLeadIds.length > 0 && (
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">
                              {selectedLeadIds.length} Seleccionados
                            </span>
                            <button 
                              onClick={() => setSelectedLeadIds([])}
                              className="text-[9px] font-bold text-slate-400 hover:text-red-500 uppercase text-left"
                            >
                              Limpiar
                            </button>
                          </div>
                        )}
                      </div>
                    
                    {/* Search Bars */}
                    <div className="flex flex-1 flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Nombre o teléfono..."
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all text-sm font-medium"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="relative flex-1">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Filtrar por ciudad..."
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all text-sm font-medium"
                          value={locationFilter}
                          onChange={(e) => setLocationFilter(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Filters and Sorting */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 transition-all text-xs font-black text-slate-600 uppercase tracking-tighter"
                      >
                        <BarChart3 size={14} className={sortOrder === 'asc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                        {sortOrder === 'desc' ? 'Nuevos' : 'Viejos'}
                      </button>
                      
                      <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                        <select 
                          className="bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-100 text-xs font-black uppercase tracking-tight appearance-none cursor-pointer"
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value as any)}
                        >
                          <option value="all">Estatus: Todos</option>
                          <option value="new">Nuevos</option>
                          <option value="offered">Ofrecido</option>
                          <option value="accepted">Aceptado</option>
                          <option value="sent">Enviado</option>
                          <option value="paid">Pagado</option>
                          <option value="recurring">Recurrente / Suscripción</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Bulk Actions Expanding Bar */}
                  {selectedLeadIds.length > 0 && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100 overflow-hidden"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mr-2">Acciones Masivas:</span>
                        
                        {isBulkEditingLocation ? (
                          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-indigo-100">
                            <input 
                              type="text"
                              placeholder="Nueva ciudad..."
                              className="outline-none text-[10px] px-2 font-black w-32 uppercase"
                              value={bulkLocation}
                              onChange={(e) => setBulkLocation(e.target.value)}
                              autoFocus
                            />
                            <button 
                              onClick={handleBulkUpdateLocation}
                              disabled={!bulkLocation || isBulkAssigning}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-black uppercase transition-all disabled:opacity-50"
                            >
                              Actualizar
                            </button>
                            <button onClick={() => setIsBulkEditingLocation(false)} className="p-1 text-slate-400 hover:text-red-500">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200">
                              <select 
                                className="bg-transparent border-none outline-none text-[9px] px-2 font-black uppercase cursor-pointer"
                                value={targetAgentId}
                                onChange={(e) => setTargetAgentId(e.target.value)}
                              >
                                <option value="">Agente...</option>
                                {allUsers.filter(u => u.status === 'approved').map((u, i) => (
                                  <option key={`${u.uid}-${i}`} value={u.uid}>{u.displayName}</option>
                                ))}
                              </select>
                              <button 
                                onClick={() => handleBulkAssign(targetAgentId)}
                                disabled={isBulkAssigning || !targetAgentId}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9px] font-black uppercase transition-all disabled:opacity-50"
                              >
                                Asignar
                              </button>
                              <button 
                                onClick={() => handleBulkRemove(targetAgentId)}
                                disabled={isBulkAssigning || !targetAgentId}
                                className="px-3 py-1.5 bg-slate-700 hover:bg-red-600 text-white rounded text-[9px] font-black uppercase transition-all disabled:opacity-50"
                              >
                                Quitar
                              </button>
                            </div>

                            <button 
                              onClick={() => setIsBulkEditingLocation(true)}
                              className="px-4 py-2 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                            >
                              Cambar Ciudad
                            </button>

                            <div className="h-4 w-[1px] bg-indigo-200 mx-1" />

                            <button 
                              onClick={handleBulkDelete}
                              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-600 text-red-500 hover:text-white rounded-lg transition-all text-[9px] font-black uppercase tracking-widest border border-red-100"
                            >
                              <Trash2 size={12} />
                              Borrar Seleccionados
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {filteredLeads.map((lead) => {
                      const waLink = formatWhatsAppLink(lead.phone);
                      return (
                        <motion.div
                          key={lead.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-4 relative group hover:border-indigo-200"
                        >
                          <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3 flex-1 overflow-hidden">
                            <div className="mt-1">
                                <input 
                                  type="checkbox"
                                  checked={selectedLeadIds.includes(lead.id)}
                                  onChange={() => toggleLeadSelection(lead.id)}
                                  className="w-5 h-5 rounded-md border-slate-200 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                              </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="text-[10px] text-gray-400 font-mono mb-1">ID: {lead.id.slice(-4).toUpperCase()}</p>
                              <h3 className="font-black text-slate-700 group-hover:text-indigo-600 transition-colors truncate text-base" title={lead.name}>
                                {lead.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                {lead.businessOwnerName && (
                                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Encargado: {lead.businessOwnerName}</p>
                                )}
                                {lead.city && (
                                  <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-tight">📍 {lead.city}</p>
                                )}
                              </div>
                              {isAdmin && (
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                                    Asignado a:
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {[lead.ownerId, ...(lead.assignedUserIds || [])]
                                      .filter((id, i, arr) => id && arr.indexOf(id) === i)
                                      .map(id => {
                                        const u = allUsers.find(user => user.uid === id);
                                        if (!u) return null;
                                        const isOwner = id === lead.ownerId;
                                        return (
                                          <span key={id} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold group/user ${
                                            isOwner ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                                          }`}>
                                            {u.displayName}
                                            {isOwner && <Shield size={10} className="text-amber-500" />}
                                            {!isOwner && (
                                              <button 
                                                onClick={() => handleRemoveAssignment(lead.id, id)}
                                                className="hover:text-red-600 transition-colors ml-0.5"
                                                title="Quitar acceso"
                                              >
                                                <X size={10} />
                                              </button>
                                            )}
                                          </span>
                                        );
                                      })}
                                  </div>
                                </div>
                              )}
                              <div className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold mt-2 ${DEMO_STATUS_COLORS[lead.demoStatus]}`}>
                                {lead.demoStatus === 'new' ? 'NUEVO' :
                                lead.demoStatus === 'contacted' ? 'CONTACTADO (SEGUIMIENTO)' : 
                                lead.demoStatus === 'offered' ? 'OFRECIDO' : 
                                lead.demoStatus === 'accepted' ? 'ACEPTADO' : 
                                lead.demoStatus === 'sent' ? 'ENVIADO' : 
                                lead.demoStatus === 'recurring' ? 'RECURRENTE / SUSCRIPCIÓN' : 'PAGADO'}
                              </div>
                              {lead.demoStatus !== 'paid' && lead.demoStatus !== 'recurring' && (
                                <div className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black border border-emerald-100">
                                  <TrendingUp size={10} />
                                  COMISIÓN: $250 MXN
                                </div>
                              )}
                            </div>
                          </div>
                            <div className="flex items-center gap-0.5">
                              <button 
                                onClick={() => handleWhatsAppLead(lead)}
                                className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-all"
                                title="Enviar WhatsApp"
                              >
                                <MessageCircle size={14} />
                              </button>
                              <button 
                                onClick={() => { setEditingLead(lead); setIsModalOpen(true); }}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.id); }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-3 text-sm text-gray-600">
                            {lead.phone && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Phone size={14} className="text-gray-400" />
                                  <span className="text-xs font-mono">{lead.phone}</span>
                                </div>
                                {waLink && (
                                  <a 
                                    href={waLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors font-bold text-[10px]"
                                  >
                                    <MessageSquare size={12} />
                                    <span>WHATSAPP</span>
                                    <ExternalLink size={10} />
                                  </a>
                                )}
                              </div>
                            )}
                            {lead.lastContactDate && (
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <Clock size={12} />
                                <span>Último contacto: <span className="font-bold text-slate-600">{lead.lastContactDate}</span></span>
                              </div>
                            )}
                            {lead.followUpDate && (
                              <div className={`flex items-center gap-2 text-[10px] ${
                                new Date(lead.followUpDate) <= new Date() ? 'text-red-500 font-black' : 'text-indigo-400'
                              }`}>
                                <Clock size={12} className={new Date(lead.followUpDate) <= new Date() ? 'animate-pulse' : ''} />
                                <span>Programado para: <span className="font-bold tracking-tight">{lead.followUpDate}</span></span>
                              </div>
                            )}
                            {lead.notes && (
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 italic text-[11px] text-slate-500 line-clamp-2">
                                "{lead.notes}"
                              </div>
                            )}
                          </div>

                        <div 
                          className="mt-auto pt-4 border-t border-slate-100 bg-slate-50/30 -mx-5 -mb-5 p-5 rounded-b-xl space-y-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Quick Status Selector Checklist */}
                          <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Fase / Estatus Rápido</div>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { status: 'recurring' as DemoStatus, label: 'Suscripción', color: 'border-rose-200 text-rose-700 bg-rose-50/30' },
                                { status: 'accepted' as DemoStatus, label: 'En Proceso', color: 'border-pink-200 text-pink-700 bg-pink-50/30' },
                                { status: 'sent' as DemoStatus, label: 'Demo Enviado', color: 'border-cyan-200 text-cyan-700 bg-cyan-50/30' },
                                { status: 'paid' as DemoStatus, label: 'Demo Pagado', color: 'border-emerald-200 text-emerald-700 bg-emerald-50/30' }
                              ].map((opt) => {
                                const isSelected = lead.demoStatus === opt.status;
                                return (
                                  <button
                                    key={opt.status}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await handleQuickStatusChange(lead.id, opt.status);
                                    }}
                                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left transition-all font-bold ${
                                      isSelected 
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm scale-[1.02]' 
                                        : `bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300`
                                    }`}
                                  >
                                    <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all ${
                                      isSelected ? 'border-white bg-white' : 'border-slate-300'
                                    }`}>
                                      {isSelected && (
                                        <Check size={10} className="text-indigo-600 stroke-[4px]" />
                                      )}
                                    </div>
                                    <span className="truncate text-[10px] uppercase tracking-tight">{opt.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Plan Mensual</div>
                            <div className={`flex items-center justify-between transition-colors ${
                              lead.packageStatus === 'none' ? 'text-slate-400' : 
                              lead.packageStatus === 'basic' ? 'text-indigo-600 font-bold italic' : 
                              'text-pink-600 font-bold italic'
                            }`}>
                              <div className="flex items-center gap-2">
                                <Briefcase size={14} />
                                <span className="text-xs uppercase tracking-tight">{PACKAGE_INFO[lead.packageStatus].name}</span>
                              </div>
                              <span className="font-mono text-[10px]">{PACKAGE_INFO[lead.packageStatus].details}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  </AnimatePresence>
                </div>

                {filteredLeads.length === 0 && (
                  <div className="text-center py-20 text-gray-400">
                    {leads.length === 0 ? 'Todavía no tienes leads. ¡Comienza a prospectar!' : 'Sin resultados para esta búsqueda.'}
                  </div>
                )}
              </>
            )}
          </>
        )}
        {view === 'leads' && (
          <LeadMap leads={filteredLeads} allUsers={allUsers} />
        )}
        {/* Custom Confirmation Modals */}
        <AnimatePresence>
          {leadToDelete && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={() => setLeadToDelete(null)}
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center"
              >
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">¿Eliminar Lead?</h3>
                <p className="text-sm text-slate-500 mb-6 font-medium">Esta acción es permanente y no se puede deshacer.</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setLeadToDelete(null)}
                    className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmDeleteLead}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-200 transition-all"
                  >
                    Eliminar
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {showBulkDeleteConfirm && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={() => setShowBulkDeleteConfirm(false)}
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center"
              >
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">¿Eliminar {selectedLeadIds.length} Leads?</h3>
                <p className="text-sm text-slate-500 mb-6 font-medium">Se eliminarán permanentemente todos los leads seleccionados.</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowBulkDeleteConfirm(false)}
                    className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmBulkDelete}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-200 transition-all"
                  >
                    Eliminar Todo
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {showDeleteAllNewConfirm && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={() => setShowDeleteAllNewConfirm(false)}
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center"
              >
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">¿Eliminar Todas las Nuevas?</h3>
                <p className="text-sm text-slate-500 mb-6 font-medium">Se eliminarán permanentemente absolutamente todas las leads que tienen el estatus "NUEVAS".</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowDeleteAllNewConfirm(false)}
                    className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleDeleteAllNewLeads}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-200 transition-all"
                  >
                    Eliminar Todas
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence />

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden focus:outline-none"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingLead ? 'Editar Información' : 'Nuevo Cliente Lead'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveLead} className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nombre del Negocio *</label>
                    <input 
                      name="name" 
                      required 
                      defaultValue={editingLead?.name}
                      placeholder="Ej. Restaurante La Parrilla"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Dueño / Encargado</label>
                    <input 
                      name="businessOwnerName" 
                      defaultValue={editingLead?.businessOwnerName}
                      placeholder="Ej. Juan Pérez"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Número de Teléfono</label>
                    <input 
                      name="phone" 
                      defaultValue={editingLead?.phone}
                      placeholder="Ej. +52 1 234 567 8900"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Ciudad</label>
                    <div className="relative group">
                      <input 
                        name="city" 
                        list="cities-list"
                        defaultValue={editingLead?.city}
                        placeholder="Ej. CDMX, Monterrey..."
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all text-sm"
                      />
                      <datalist id="cities-list">
                        {availableCities.map(city => (
                          <option key={city} value={city} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Latitud</label>
                      <input 
                        name="latitude" 
                        type="number"
                        step="any"
                        defaultValue={editingLead?.latitude}
                        placeholder="Ej. 29.07"
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-[10px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Longitud</label>
                      <input 
                        name="longitude" 
                        type="number"
                        step="any"
                        defaultValue={editingLead?.longitude}
                        placeholder="Ej. -110.95"
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-[10px]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Último Contacto</label>
                    <input 
                      name="lastContactDate" 
                      type="date"
                      defaultValue={editingLead?.lastContactDate}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Próximo Seguimiento</label>
                    <input 
                      name="followUpDate" 
                      type="date"
                      defaultValue={editingLead?.followUpDate}
                      className="w-full px-4 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Anotaciones / Notas</label>
                    <textarea 
                      name="notes" 
                      rows={3}
                      defaultValue={editingLead?.notes}
                      placeholder="Notas sobre el cliente o el demo..."
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Status del Demo</label>
                    <select 
                      name="demoStatus" 
                      defaultValue={editingLead?.demoStatus || 'new'}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all text-sm appearance-none"
                    >
                      <option value="new">Nuevo</option>
                      <option value="contacted">Contactado (Seguimiento)</option>
                      <option value="offered">Ofrecido</option>
                      <option value="accepted">Aceptado</option>
                      <option value="sent">Enviado</option>
                      <option value="paid">Pagado ($250 MXN / $12.5 USD)</option>
                      <option value="recurring">Recurrente / Suscripción</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Paquete Mensual</label>
                    <select 
                      name="packageStatus" 
                      defaultValue={editingLead?.packageStatus || 'none'}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none text-sm appearance-none"
                    >
                      <option value="none">Sin Paquete</option>
                      <option value="basic">1,500 MXN (2 Ads + 5 posts)</option>
                      <option value="premium">3,000 MXN (4 Videos + 10 posts)</option>
                    </select>
                  </div>
                  
                  {isAdmin && (
                    <div className="sm:col-span-2 pt-2 border-t border-gray-100">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Asignar Propietario (Admin-only)</label>
                      <select 
                        name="ownerId" 
                        defaultValue={editingLead?.ownerId || user.uid}
                        className="w-full px-4 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all text-sm appearance-none font-medium"
                      >
                        {allUsers.map((u, i) => (
                          <option key={`${u.uid}-${i}`} value={u.uid}>
                            {u.displayName} ({u.email}) {u.uid === user.uid ? '- (Tú)' : ''}
                          </option>
                        ))}
                      </select>
                      
                      {editingLead && editingLead.assignedUserIds && editingLead.assignedUserIds.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Agentes con acceso compartido:</p>
                          <div className="flex flex-wrap gap-2">
                            {Array.from(new Set<string>(editingLead.assignedUserIds || [])).map((uid, i) => {
                              const u = allUsers.find(u => u.uid === uid);
                              if (!u) return null;
                              return (
                                <div key={`${uid}-${i}`} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-indigo-100 rounded-lg shadow-sm">
                                  <span className="text-xs font-bold text-slate-600">{u.displayName}</span>
                                  <button 
                                    type="button"
                                    onClick={() => handleRemoveAssignment(editingLead.id, uid)}
                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      <p className="mt-1 text-[10px] text-indigo-400 italic">Como Admin, tú siempre verás este lead sin importar a quién se lo asignes. El agente seleccionado ahora también podrá verlo gestionarlo.</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSaving && <Loader2 size={18} className="animate-spin" />}
                    {editingLead ? 'Actualizar' : 'Guardar Lead'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAIImporterOpen && user && (
          <AIImporter 
            isOpen={isAIImporterOpen} 
            onClose={() => setIsAIImporterOpen(false)} 
            userId={user.uid} 
            allUsers={allUsers}
            availableCities={availableCities}
          />
        )}

        <AnimatePresence>
          {selectedStatCategory && (
            <StatDetailModal 
              category={selectedStatCategory}
              leads={leads}
              onClose={() => setSelectedStatCategory(null)}
              onEditLead={(lead) => {
                setEditingLead(lead);
                setIsModalOpen(true);
              }}
              onGoToLead={(lead) => {
                setSelectedStatCategory(null);
                setView('leads');
                setSearchTerm(lead.name);
              }}
              onCallLead={handleWhatsAppLead}
              onDeleteLead={handleDeleteLead}
              onQuickStatusChange={handleQuickStatusChange}
            />
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );
}
