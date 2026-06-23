import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Loader2, CheckCircle2, AlertCircle, Save, UserPlus, MapPin, Phone, Building, Trash2 } from 'lucide-react';
import { collection, writeBatch, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';

interface AIImporterProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  allUsers: UserProfile[];
  availableCities: string[];
}

interface ParsedLead {
  name: string;
  phone: string;
  city?: string;
  isDuplicate?: boolean;
}

export function AIImporter({ isOpen, onClose, userId, allUsers, availableCities }: AIImporterProps) {
  const [text, setText] = useState('');
  const [defaultCity, setDefaultCity] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDefaultCitySuggestions, setShowDefaultCitySuggestions] = useState(false);
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState<number | null>(null);

  const toggleAgent = (uid: string) => {
    setSelectedAgentIds(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const updateLead = (index: number, field: keyof ParsedLead, value: any) => {
    setParsedLeads(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeLead = (index: number) => {
    setParsedLeads(prev => prev.filter((_, i) => i !== index));
  };

  const filteredCities = (searchValue: string) => {
    if (!searchValue) return [];
    return availableCities.filter(c => 
      c.toLowerCase().includes(searchValue.toLowerCase()) && 
      c.toLowerCase() !== searchValue.toLowerCase()
    ).slice(0, 5);
  };

  const handleProcess = async () => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Server error');
      }

      const result = await response.json();
      
      // Duplicate detection
      const enrichedLeads: ParsedLead[] = [];
      const phonesToCheck = result.map((l: any) => l.phone).filter(Boolean);
      
      // Batch check in Firestore (using chunks of 10 for 'in' operator limits if many)
      // For simplicity and typical import sizes, we check them all or in batches
      const existingPhones = new Set<string>();
      
      if (phonesToCheck.length > 0) {
        // We do a query to find any matching phone
        // Note: 'in' operator has a limit of 10 elements in some Firestore versions, 
        // but here we can just do a few queries or a single one if small list.
        // Let's do it properly in chunks of 30 (common limit)
        const chunkSize = 30;
        for (let i = 0; i < phonesToCheck.length; i += chunkSize) {
          const chunk = phonesToCheck.slice(i, i + chunkSize);
          const q = query(collection(db, 'leads'), where('phone', 'in', chunk));
          const snapshot = await getDocs(q);
          snapshot.forEach(doc => {
            existingPhones.add(doc.data().phone);
          });
        }
      }

      const finalLeads = result.map((l: any) => ({
        ...l,
        city: l.city || defaultCity,
        isDuplicate: existingPhones.has(l.phone)
      }));

      setParsedLeads(finalLeads);
    } catch (err: any) {
      console.error("AI Import Error:", err);
      setError("No se pudo procesar el texto. Asegúrate de que el formato sea legible: " + (err.message || ""));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (parsedLeads.length === 0) return;
    setIsSaving(true);
    
    try {
      const batch = writeBatch(db);
      const leadsToSave = parsedLeads.filter(l => !l.isDuplicate);
      
      if (leadsToSave.length === 0) {
        setError("Todos los leads seleccionados ya existen en la base de datos.");
        setIsSaving(false);
        return;
      }

      leadsToSave.forEach(lead => {
        const docRef = doc(collection(db, 'leads'));
        batch.set(docRef, {
          name: lead.name,
          phone: lead.phone || '',
          city: lead.city || defaultCity || '',
          businessOwnerName: '',
          lastContactDate: '',
          notes: '',
          demoStatus: 'new',
          packageStatus: 'none',
          ownerId: userId,
          assignedUserIds: selectedAgentIds,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
      const savedCount = leadsToSave.length;
      onClose();
      setParsedLeads([]);
      setText('');
      alert(`${savedCount} leads agregados exitosamente. (Se omitieron ${parsedLeads.length - savedCount} duplicados)`);
    } catch (err) {
      console.error("Save error:", err);
      setError("Error al guardar los leads en la base de datos.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Sparkles size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">Asistente AI de Importación</h2>
                <p className="text-xs text-indigo-100 font-medium">Pega el texto y yo extraigo los leads</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {parsedLeads.length === 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Ciudad por Defecto (Opcional)</label>
                    <div className="relative">
                      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Ej. Veracruz, Boca del Río..."
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
                        value={defaultCity}
                        onChange={(e) => setDefaultCity(e.target.value)}
                        onFocus={() => setShowDefaultCitySuggestions(true)}
                        onBlur={() => setTimeout(() => setShowDefaultCitySuggestions(false), 200)}
                      />
                    </div>
                    {showDefaultCitySuggestions && filteredCities(defaultCity).length > 0 && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden">
                        {filteredCities(defaultCity).map((city, ci) => (
                          <button
                            key={ci}
                            onClick={() => {
                              setDefaultCity(city);
                              setShowDefaultCitySuggestions(false);
                            }}
                            className="w-full text-left px-4 py-2 text-[10px] font-black uppercase text-slate-600 hover:bg-indigo-50 border-b border-slate-50 last:border-0"
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-[9px] text-slate-400 font-bold mt-1 ml-1 leading-tight">Si la IA no detecta ciudad, usará esta automáticamente.</p>
                  </div>
                  <div className="flex items-center">
                    <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/50 w-full">
                      <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic">
                        "Pega tu lista abajo. Extraeré nombres y teléfonos. Si no encuentro ciudad, pondré la que escribas arriba."
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider ml-1">
                    Pega el listado aquí:
                  </label>
                  <textarea 
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Ej: El Zarape - https://wa.me/15202873920..."
                    className="w-full h-64 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all text-sm font-medium resize-none shadow-inner"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                  <div>
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Asignación Masiva</h4>
                    <p className="text-xs font-bold text-slate-600">Selecciona agentes para estos {parsedLeads.length} leads</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allUsers.filter(u => u.status === 'approved').map((u, i) => (
                      <button 
                        key={`${u.uid}-${i}`}
                        onClick={() => toggleAgent(u.uid)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all border ${
                          selectedAgentIds.includes(u.uid)
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                            : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500'
                        }`}
                      >
                        {u.displayName.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-800 flex items-center gap-2 text-lg">
                    <CheckCircle2 className="text-emerald-500" size={20} />
                    Confirmar Datos
                  </h3>
                  <button 
                    onClick={() => {
                      setParsedLeads([]);
                      setSelectedAgentIds([]);
                      setDefaultCity('');
                    }}
                    className="text-xs font-black text-indigo-600 hover:underline"
                  >
                    EMPEZAR DE NUEVO
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {parsedLeads.map((lead, i) => (
                    <div key={i} className={`p-4 rounded-2xl border transition-all ${lead.isDuplicate ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100 shadow-sm'}`}>
                      {lead.isDuplicate && (
                        <div className="flex items-center gap-1.5 mb-3 text-amber-600">
                          <AlertCircle size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Duplicado Detectado - Se omitirá al guardar</span>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="relative md:col-span-1">
                          <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text"
                            value={lead.name}
                            onChange={(e) => updateLead(i, 'name', e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100"
                            placeholder="Nombre del negocio"
                          />
                        </div>
                        <div className="relative md:col-span-1">
                          <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text"
                            value={lead.phone}
                            onChange={(e) => updateLead(i, 'phone', e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100"
                            placeholder="Teléfono"
                          />
                        </div>
                        <div className="relative md:col-span-1">
                          <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text"
                            value={lead.city}
                            onChange={(e) => updateLead(i, 'city', e.target.value)}
                            onFocus={() => setShowSuggestions(i)}
                            onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100"
                            placeholder="Ciudad"
                          />
                          {showSuggestions === i && filteredCities(lead.city || '').length > 0 && (
                            <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                              {filteredCities(lead.city || '').map((city, ci) => (
                                <button
                                  key={ci}
                                  onClick={() => {
                                    updateLead(i, 'city', city);
                                    setShowSuggestions(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[10px] font-black uppercase text-slate-600 hover:bg-indigo-50 border-b border-slate-50 last:border-0"
                                >
                                  {city}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-end">
                          <button 
                            onClick={() => removeLead(i)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="Quitar de la lista"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-red-500 shrink-0" size={20} />
                <p className="text-xs text-red-600 font-bold">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
            <button 
              onClick={onClose}
              className="flex-1 py-4 text-slate-500 font-black text-sm hover:text-slate-700 transition-colors"
            >
              CANCELAR
            </button>
            {parsedLeads.length === 0 ? (
              <button 
                onClick={handleProcess}
                disabled={isProcessing || !text.trim()}
                className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>PROCESANDO CON AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>ANALIZAR LISTADO</span>
                  </>
                )}
              </button>
            ) : (
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>GUARDANDO...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>IMPORTAR {parsedLeads.length} LEADS</span>
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
