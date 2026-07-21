import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  Trash2, 
  Sparkles, 
  Download, 
  Presentation,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Flyer {
  id: string;
  name: string;
  url: string; // base64 or public path
  createdAt: any;
}

// Built-in default premium slides in case they haven't uploaded any flyer yet
const DEFAULT_SLIDES = [
  {
    title: "1. ¿Qué es TOP AI MKT?",
    subtitle: "Revolución de Leads Inteligentes",
    description: "La plataforma líder de automatización que conecta campañas publicitarias de alto rendimiento con gestión inteligente de prospectos y WhatsApp instantáneo.",
    benefits: ["Asignación automática y transparente", "Chat interno corporativo integrado", "Asistente de ventas inteligente con Inteligencia Artificial"],
    bgGradient: "from-indigo-600 to-indigo-800"
  },
  {
    title: "2. Nuestro Método de Prospección",
    subtitle: "Contacto en menos de 5 minutos",
    description: "Reducimos el tiempo de respuesta comercial de horas a segundos. Un lead contactado de inmediato multiplica por 7 la tasa de conversión final.",
    benefits: ["Segmentación demográfica precisa en México", "Integración con geolocalización satelital", "Medición de efectividad en tiempo real"],
    bgGradient: "from-emerald-600 to-emerald-800"
  },
  {
    title: "3. El Poder del Seguimiento",
    subtitle: "WhatsApp Comercial con IA",
    description: "Ayudamos a los agentes a responder de inmediato con scripts de WhatsApp optimizados que rompen objeciones de pago, bancos y confianza.",
    benefits: ["Guías de mensajes directos listos para copiar", "Apoyo en objeciones con inteligencia artificial", "Bitácoras de estado y actualización rápida"],
    bgGradient: "from-sky-600 to-sky-800"
  }
];

export function SalesMaterials({ userProfile }: { userProfile: any }) {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [activeTab, setActiveTab] = useState<'slides' | 'flyers'>('slides');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Subscribe to uploaded flyers in Firestore
  useEffect(() => {
    const q = query(collection(db, 'sales_flyers'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs: Flyer[] = [];
      snap.forEach(d => {
        docs.push({ id: d.id, ...d.data() } as Flyer);
      });
      setFlyers(docs);
    }, (error) => {
      console.warn("Firestore flyers read failed (using local storage fallback if available):", error);
      const cached = localStorage.getItem('top_ai_mkt_local_flyers');
      if (cached) {
        setFlyers(JSON.parse(cached));
      }
    });

    return unsub;
  }, []);

  // Sync to local storage for offline support
  useEffect(() => {
    if (flyers.length > 0) {
      localStorage.setItem('top_ai_mkt_local_flyers', JSON.stringify(flyers));
    }
  }, [flyers]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor selecciona una imagen válida (PNG, JPG o SVG).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit for base64 storage in Firestore
      setUploadError('La imagen supera el límite de 2MB. Sube un archivo optimizado.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64Url = event.target?.result as string;
        
        const payload = {
          name: file.name,
          url: base64Url,
          createdAt: new Date().toISOString()
        };

        // 1. Save to local storage state instantly
        const updatedFlyers = [{ id: 'temp_' + Date.now(), ...payload } as Flyer, ...flyers];
        setFlyers(updatedFlyers);

        // 2. Persist in Firestore
        await addDoc(collection(db, 'sales_flyers'), {
          name: payload.name,
          url: payload.url,
          createdAt: serverTimestamp()
        });

        setIsUploading(false);
      } catch (err: any) {
        console.error("Error saving flyer:", err);
        setUploadError('Error al procesar la imagen: ' + err.message);
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteFlyer = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este folleto?')) return;
    
    // Optimistic UI update
    setFlyers(prev => prev.filter(f => f.id !== id));
    
    try {
      if (!id.startsWith('temp_')) {
        await deleteDoc(doc(db, 'sales_flyers', id));
      }
    } catch (err) {
      console.error("Failed to delete flyer from Firestore:", err);
    }
  };

  const nextSlide = () => {
    const count = activeTab === 'slides' ? DEFAULT_SLIDES.length : flyers.length;
    if (count === 0) return;
    setCurrentSlideIndex(prev => (prev + 1) % count);
  };

  const prevSlide = () => {
    const count = activeTab === 'slides' ? DEFAULT_SLIDES.length : flyers.length;
    if (count === 0) return;
    setCurrentSlideIndex(prev => (prev - 1 + count) % count);
  };

  const isAdmin = userProfile?.role === 'admin';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-xl">
            <Presentation className="text-indigo-600" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Material de Apoyo</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Diapositivas y Folletos de Venta</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 self-start">
          <button
            onClick={() => { setActiveTab('slides'); setCurrentSlideIndex(0); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'slides' ? 'bg-white text-indigo-600 shadow' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Presentación IA
          </button>
          <button
            onClick={() => { setActiveTab('flyers'); setCurrentSlideIndex(0); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'flyers' ? 'bg-white text-indigo-600 shadow' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Mis Folletos ({flyers.length})
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Slide/Flyer Display Card */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 relative overflow-hidden aspect-[4/3] flex flex-col justify-between">
            
            <AnimatePresence mode="wait">
              {activeTab === 'slides' ? (
                <motion.div
                  key={`slide-${currentSlideIndex}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 flex flex-col justify-between h-full"
                >
                  {/* Decorative background circle */}
                  <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-50 rounded-full blur-2xl opacity-70 pointer-events-none" />
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider rounded-full">
                        Estrategia Comercial
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                        {DEFAULT_SLIDES[currentSlideIndex].subtitle}
                      </p>
                      <h3 className="text-2xl font-black text-slate-800 leading-tight">
                        {DEFAULT_SLIDES[currentSlideIndex].title}
                      </h3>
                    </div>

                    <p className="text-sm text-slate-500 leading-relaxed max-w-lg">
                      {DEFAULT_SLIDES[currentSlideIndex].description}
                    </p>
                  </div>

                  {/* Bullet benefits */}
                  <div className="space-y-2 mt-4 bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">Beneficios Clave</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {DEFAULT_SLIDES[currentSlideIndex].benefits.map((b, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : flyers.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-4 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <ImageIcon className="text-slate-300" size={48} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-700">Sin folletos cargados</h3>
                    <p className="text-xs text-slate-400 max-w-xs">
                      Sube tus volantes, flyers o materiales de apoyo comercial para mostrarlos en este carrusel.
                    </p>
                  </div>
                </div>
              ) : (
                <motion.div
                  key={`flyer-${currentSlideIndex}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex-1 flex flex-col h-full"
                >
                  <div className="flex-1 rounded-2xl overflow-hidden relative group bg-slate-900 flex items-center justify-center">
                    <img 
                      src={flyers[currentSlideIndex].url} 
                      alt={flyers[currentSlideIndex].name} 
                      className="max-h-full max-w-full object-contain"
                    />
                    
                    {/* Delete overlay for Admin */}
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteFlyer(flyers[currentSlideIndex].id)}
                        className="absolute top-4 right-4 p-2 bg-red-600 text-white rounded-xl shadow-lg hover:bg-red-700 transition-all opacity-0 group-hover:opacity-100"
                        title="Eliminar folleto"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-xs text-slate-500 font-bold truncate max-w-sm mx-auto">
                      {flyers[currentSlideIndex].name}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Carousel navigation controls */}
            {((activeTab === 'slides' && DEFAULT_SLIDES.length > 1) || (activeTab === 'flyers' && flyers.length > 1)) && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={prevSlide}
                  className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {currentSlideIndex + 1} de {activeTab === 'slides' ? DEFAULT_SLIDES.length : flyers.length}
                </span>
                <button
                  onClick={nextSlide}
                  className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Upload & Reference list sidebar */}
        <div className="space-y-6">
          
          {/* Upload panel (Admins only) */}
          {isAdmin && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 pb-2">
                <Upload size={14} className="text-indigo-600" />
                Cargar Nuevo Flyer
              </h3>
              
              <div className="space-y-3">
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  Sube imágenes publicitarias (.png, .jpg) para que todo el equipo de ventas las use como material de apoyo. (Máx. 2MB).
                </p>
                
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-100 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/50 p-6 rounded-2xl cursor-pointer transition-all">
                  <ImageIcon size={32} className="text-indigo-400 mb-2" />
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider text-center">Seleccionar Folleto</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>

                {isUploading && (
                  <div className="text-center py-2 text-xs font-bold text-indigo-600 animate-pulse uppercase tracking-wider">
                    Guardando flyer...
                  </div>
                )}

                {uploadError && (
                  <div className="p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-xl text-center">
                    {uploadError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Guide & Support Details */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-6 rounded-3xl shadow-xl shadow-indigo-100 space-y-4">
            <h3 className="text-xs font-black text-indigo-200 uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2">
              <Sparkles size={14} />
              ¿Cómo usar el material?
            </h3>
            
            <div className="space-y-3 text-xs text-indigo-100 leading-relaxed font-medium">
              <p>
                <strong>1. Presentación IA:</strong> Ideal para repasar conceptos, entrenar nuevos agentes y dominar los beneficios de Top AI MKT.
              </p>
              <p>
                <strong>2. Mis Folletos:</strong> Ideal para enviárselos a los prospectos o consultarlos durante llamadas comerciales.
              </p>
              <p className="text-[10px] text-indigo-200 bg-white/10 p-2 rounded-xl border border-white/5 font-bold">
                💡 TIP: Si eres Admin, puedes subir flyers que se sincronizan al instante en el dashboard de todos tus agentes.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
