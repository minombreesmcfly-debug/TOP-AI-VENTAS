import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, MessageSquare, Users, Shield, Trash2, Clock, Sparkles } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';

interface TeamChatProps {
  userProfile: UserProfile;
  allUsers: UserProfile[];
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  createdAt: any;
}

export function TeamChat({ userProfile, allUsers }: TeamChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time chat messages
  useEffect(() => {
    const q = query(
      collection(db, 'team_chat_messages'),
      orderBy('createdAt', 'asc'),
      limit(150)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          senderId: data.senderId,
          senderName: data.senderName,
          senderRole: data.senderRole || 'user',
          text: data.text,
          createdAt: data.createdAt,
        });
      });
      setMessages(msgs);
      // Auto scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => {
      console.error("Error listening to team chat:", error);
    });

    return unsubscribe;
  }, []);

  // Force scroll to bottom on initial render
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || isSending) return;

    setIsSending(true);
    const textToSend = newMessageText.trim();
    setNewMessageText('');

    try {
      await addDoc(collection(db, 'team_chat_messages'), {
        senderId: userProfile.uid,
        senderName: userProfile.displayName,
        senderRole: userProfile.role,
        text: textToSend,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Error al enviar el mensaje. Inténtalo de nuevo.");
      setNewMessageText(textToSend); // Restore text
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este mensaje?")) return;
    try {
      await deleteDoc(doc(db, 'team_chat_messages', msgId));
    } catch (err) {
      console.error("Error deleting message:", err);
      alert("No tienes permisos para eliminar este mensaje.");
    }
  };

  const formatMessageTime = (createdAt: any) => {
    if (!createdAt) return 'Enviando...';
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Approved active users on team
  const activeTeamMembers = allUsers.filter(u => u.status === 'approved');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-13rem)] min-h-[500px]">
      {/* 1. Sidebar - Team Members */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 flex flex-col shadow-sm lg:col-span-1 h-full overflow-hidden">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
          <Users size={18} className="text-indigo-600" />
          <h3 className="font-black text-slate-800 text-sm tracking-tight uppercase">Miembros Activos ({activeTeamMembers.length})</h3>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
          {activeTeamMembers.map((member) => (
            <div key={member.uid} className="flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-50 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 flex items-center justify-center text-xs font-black text-indigo-700 shrink-0 shadow-sm">
                {getInitials(member.displayName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-black text-slate-700 truncate">{member.displayName}</p>
                  {member.role === 'admin' && (
                    <Shield size={10} className="text-indigo-600 shrink-0" title="Administrador" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{member.role === 'admin' ? 'Administrador' : 'Agente'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Main Chat Area */}
      <div className="bg-white rounded-3xl border border-slate-100 flex flex-col shadow-sm lg:col-span-3 h-full overflow-hidden relative">
        {/* Chat Header */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <MessageSquare size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider leading-none">Chat del Equipo</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Sala general de comunicación interna</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-indigo-100/50 text-indigo-700 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border border-indigo-100">
            <Sparkles size={10} />
            <span>Tiempo Real</span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-3">
                <MessageSquare size={28} />
              </div>
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">No hay mensajes aún</h3>
              <p className="text-[11px] text-slate-400 font-semibold max-w-xs mt-1">
                Sé el primero en enviar un mensaje para comenzar la conversación con el equipo.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMine = msg.senderId === userProfile.uid;
              return (
                <div 
                  key={msg.id || index}
                  className={`flex items-start gap-2.5 ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Avatar (Left side only) */}
                  {!isMine && (
                    <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 shrink-0">
                      {getInitials(msg.senderName)}
                    </div>
                  )}

                  <div className={`max-w-[70%] group relative ${isMine ? 'order-1' : 'order-2'}`}>
                    {/* Sender Details */}
                    {!isMine && (
                      <div className="flex items-center gap-1.5 mb-1 ml-1">
                        <span className="text-[10px] font-black text-slate-600">{msg.senderName}</span>
                        {msg.senderRole === 'admin' && (
                          <span className="text-[8px] font-black uppercase px-1 bg-indigo-50 text-indigo-600 rounded border border-indigo-100">Admin</span>
                        )}
                      </div>
                    )}

                    {/* Bubble */}
                    <div className={`p-3.5 rounded-2xl text-xs font-semibold shadow-sm border ${
                      isMine 
                        ? 'bg-indigo-600 border-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white border-slate-100 text-slate-700 rounded-tl-none'
                    }`}>
                      <p className="whitespace-pre-line leading-relaxed break-words">{msg.text}</p>
                    </div>

                    {/* Timestamp & Actions */}
                    <div className={`flex items-center gap-2 mt-1 px-1.5 text-[8px] font-bold uppercase tracking-wider text-slate-400 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <Clock size={8} />
                      <span>{formatMessageTime(msg.createdAt)}</span>
                      
                      {/* Delete option */}
                      {(isMine || userProfile.role === 'admin') && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-0.5 rounded"
                          title="Eliminar mensaje"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Box */}
        <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-2">
          <input 
            type="text"
            value={newMessageText}
            onChange={(e) => setNewMessageText(e.target.value)}
            disabled={isSending}
            placeholder="Escribe un mensaje para el equipo..."
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={!newMessageText.trim() || isSending}
            className="px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-md shadow-indigo-100 flex items-center justify-center transition-all disabled:opacity-50 active:scale-95 shrink-0"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
