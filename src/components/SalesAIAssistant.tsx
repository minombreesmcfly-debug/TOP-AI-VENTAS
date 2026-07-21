import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, MessageSquare, Copy, Check, BookOpen, Brain, MessageCircle, HelpCircle, ArrowRight, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';

interface SalesAIAssistantProps {
  userProfile: UserProfile;
}

interface AssistantMessage {
  role: 'user' | 'model';
  text: string;
}

const STRATEGY_PRESETS = [
  {
    id: 'first_contact',
    label: 'Plantilla Primer Contacto',
    description: 'Saludo de introducción persuasivo y amigable para WhatsApp.',
    prompt: 'Genera 3 plantillas diferentes de primer contacto por WhatsApp para un nuevo lead. Que sean breves, atractivas, utilicen emojis y tengan una llamada a la acción clara para agendar una breve videollamada.'
  },
  {
    id: 'price_objection',
    label: 'Objeción "Está muy caro"',
    description: 'Estrategias y respuestas persuasivas ante la barrera de precio.',
    prompt: 'Ayúdame con una estrategia para responder al cliente de WhatsApp que dice que "está muy caro". Dame 2 opciones de mensajes listos para copiar, enfocados en el valor del servicio.'
  },
  {
    id: 'reactivate_cold',
    label: 'Reactivar Clientes Fríos',
    description: 'Mensajes para despertar el interés de leads inactivos.',
    prompt: 'Dame una plantilla de WhatsApp de seguimiento y reactivación para leads que me dejaron en visto hace una semana. Hazlo de forma amigable y sin sonar insistente.'
  },
  {
    id: 'closing_deal',
    label: 'Técnicas de Cierre',
    description: 'Guía rápida para concretar la venta y acordar depósitos.',
    prompt: '¿Cuáles son las mejores técnicas de cierre de ventas por WhatsApp? Proporcióname 2 ejemplos de cierre de opción doble o urgencia para aplicarlos hoy mismo.'
  }
];

export function SalesAIAssistant({ userProfile }: SalesAIAssistantProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: 'model',
      text: `¡Hola, ${userProfile.displayName}! 👋 Soy tu Copiloto de Ventas de Top AI MKT.\n\nEstoy aquí para ayudarte a diseñar las mejores estrategias de venta, crear mensajes de WhatsApp irresistibles y responder con éxito a cualquier objeción de tus prospectos en México.\n\n¿En qué te puedo apoyar hoy? Puedes seleccionar una de las plantillas rápidas de la izquierda o escribirme tu pregunta directamente.`
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendPrompt = async (promptToSend: string) => {
    if (!promptToSend.trim() || isLoading) return;

    setIsLoading(true);
    setInputPrompt('');

    const updatedMessages = [...messages, { role: 'user', text: promptToSend }] as AssistantMessage[];
    setMessages(updatedMessages);

    try {
      // API call to Express server
      const response = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: promptToSend,
          history: messages // Pass preceding conversation history
        })
      });

      if (!response.ok) {
        throw new Error('Error al conectar con el servidor.');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'model', text: data.text }]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        role: 'model',
        text: '❌ Lo siento, ocurrió un error al intentar conectarme con el motor de IA. Por favor, asegúrate de que tu conexión esté estable e inténtalo de nuevo.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = (text: string, index: number) => {
    // Extract text block or copy entire message
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper to highlight copy-paste parts (like text inside blockquotes or standard text block)
  const renderMessageContent = (text: string) => {
    return (
      <div className="whitespace-pre-wrap font-sans leading-relaxed text-slate-700 space-y-2">
        {text.split('\n\n').map((para, i) => {
          // If paragraph looks like a WhatsApp template block (indented, starting with * or containing specific structure)
          const isTemplate = para.includes('👉') || para.includes('✅') || (para.startsWith('"') && para.endsWith('"')) || para.includes('Hola') && para.includes('WhatsApp');
          
          if (isTemplate) {
            return (
              <div 
                key={i} 
                className="bg-emerald-50/60 border-l-4 border-emerald-500 p-4 rounded-r-2xl my-2 text-slate-800 font-medium relative group/template shadow-sm"
              >
                <button
                  onClick={() => handleCopyToClipboard(para, i + 9999)}
                  className="absolute top-2 right-2 p-1.5 bg-white text-slate-400 hover:text-emerald-600 rounded-lg shadow-sm border border-slate-100 transition-colors opacity-0 group-hover/template:opacity-100"
                  title="Copiar esta plantilla"
                >
                  <Copy size={12} />
                </button>
                <p className="text-xs leading-relaxed">{para}</p>
              </div>
            );
          }
          return <p key={i} className="text-xs">{para}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-13rem)] min-h-[500px]">
      {/* 1. Sidebar - Playbook Options */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 flex flex-col shadow-sm lg:col-span-1 h-full overflow-hidden">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
          <BookOpen size={18} className="text-indigo-600" />
          <h3 className="font-black text-slate-800 text-sm tracking-tight uppercase">Playbooks de Venta</h3>
        </div>
        
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-4 leading-relaxed">
          Acciones rápidas optimizadas para el mercado mexicano:
        </p>

        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
          {STRATEGY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSendPrompt(preset.prompt)}
              disabled={isLoading}
              className="w-full text-left p-3.5 bg-slate-50 border border-slate-100 rounded-2xl hover:border-indigo-200 hover:bg-indigo-50/20 transition-all active:scale-[0.99] disabled:opacity-50 group flex flex-col gap-1"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-black text-slate-700 group-hover:text-indigo-600 transition-colors">{preset.label}</span>
                <ArrowRight size={12} className="text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium leading-relaxed">{preset.description}</span>
            </button>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-100 mt-4 flex items-center gap-2 text-indigo-500">
          <Brain size={14} className="animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest">Motor: Gemini Ultra</span>
        </div>
      </div>

      {/* 2. Main Chat Conversation */}
      <div className="bg-white rounded-3xl border border-slate-100 flex flex-col shadow-sm lg:col-span-3 h-full overflow-hidden relative">
        {/* Chat Header */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl text-white shadow-md shadow-indigo-100">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider leading-none">Copiloto AI de Ventas</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Estrategias, copies y respuestas comerciales inteligentes</p>
            </div>
          </div>
        </div>

        {/* Conversation Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/40">
          {messages.map((msg, index) => {
            const isAI = msg.role === 'model';
            return (
              <div 
                key={index}
                className={`flex items-start gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}
              >
                {/* Visual Icon/Avatar */}
                {isAI ? (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md text-white shrink-0 mt-0.5">
                    <Sparkles size={16} />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center text-xs font-black text-slate-600 shrink-0 mt-0.5 order-2">
                    YO
                  </div>
                )}

                {/* Message Bubble Card */}
                <div className={`max-w-[80%] relative group ${isAI ? 'order-2' : 'order-1'}`}>
                  <div className={`p-5 rounded-2xl border shadow-sm ${
                    isAI 
                      ? 'bg-white border-slate-100 text-slate-800 rounded-tl-none' 
                      : 'bg-indigo-600 border-indigo-600 text-white rounded-tr-none'
                  }`}>
                    {/* Copy All Button for AI responses */}
                    {isAI && (
                      <button
                        onClick={() => handleCopyToClipboard(msg.text, index)}
                        className="absolute top-3 right-3 p-1.5 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg shadow-sm border border-slate-100 transition-all opacity-0 group-hover:opacity-100"
                        title="Copiar respuesta completa"
                      >
                        {copiedIndex === index ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    )}

                    {isAI ? (
                      renderMessageContent(msg.text)
                    ) : (
                      <p className="whitespace-pre-wrap text-xs font-semibold leading-relaxed">{msg.text}</p>
                    )}
                  </div>
                  
                  {isAI && copiedIndex === index && (
                    <span className="absolute -bottom-4 left-2 text-[9px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      Respuesta copiada
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-start gap-3 justify-start">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 animate-spin">
                <Loader2 size={16} />
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-5 text-slate-400 flex items-center gap-2 max-w-[80%] shadow-sm">
                <Loader2 size={14} className="animate-spin text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wider animate-pulse">Generando estrategia ganadora...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Custom prompt input */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendPrompt(inputPrompt); }} 
          className="p-4 bg-white border-t border-slate-100 flex gap-2"
        >
          <input 
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            disabled={isLoading}
            placeholder="Pregúntame sobre cómo venderle a un cliente, crear copies, etc..."
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isLoading}
            className="px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-md shadow-indigo-100 flex items-center justify-center transition-all disabled:opacity-50 active:scale-95 shrink-0"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
