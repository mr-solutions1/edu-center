import { useMutation } from '@tanstack/react-query';
import { MessageSquare, X, Send, Bot, Sparkles, Loader2 } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

import apiClient from '@/shared/services/apiClient';

const AiAssistantWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'مرحباً! أنا مساعدك الذكي لمعهد ألفا العالمي. كيف يمكنني مساعدتك اليوم؟ يمكنك سؤالي عن جدول الحصص، المدفوعات المستحقة، أو إحصائيات الحضور والغياب المباشرة.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Query mutation
  const queryMutation = useMutation({
    mutationFn: async (queryText) => {
      const response = await apiClient.post('/v1/ai/ai-query', { query: queryText });
      return response.data;
    },
    onSuccess: (res) => {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: res?.data?.answer || 'عذراً، لم أستطع معالجة السؤال حالياً.' },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'حدث خطأ في الاتصال بخادم الذكاء الاصطناعي. يرجى المحاولة مجدداً.' },
      ]);
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || queryMutation.isPending) return;

    const userMsg = inputText.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setInputText('');

    queryMutation.mutate(userMsg);
  };

  return (
    <div className="fixed left-6 bottom-6 z-[9999] text-right font-sans" dir="rtl">

      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-secondary hover:bg-secondary/90 text-secondary-foreground p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center gap-2 font-black border border-white/20 animate-bounce"
        >
          <Sparkles className="h-5 w-5 animate-pulse" />
          <span className="text-xs">المساعد الذكي</span>
          <MessageSquare className="h-5 w-5" />
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="bg-white border border-slate-200 w-[360px] h-[480px] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">

          {/* Header */}
          <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between border-b border-white/10 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="bg-secondary text-secondary-foreground p-1.5 rounded-xl flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-black flex items-center gap-1">
                  مساعد ألفا الذكي
                  <Sparkles className="h-3 w-3 text-secondary" />
                </h3>
                <span className="text-[9px] text-emerald-400 flex items-center gap-1 font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  نشط وذكي
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-primary-foreground/70 hover:text-white hover:bg-white/10 p-1.5 rounded-xl transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Thread Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-2 max-w-[85%] ${
                  msg.sender === 'user' ? 'mr-auto flex-row-reverse' : 'ml-auto'
                }`}
              >
                {msg.sender === 'bot' && (
                  <div className="h-6 w-6 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center mt-1 shrink-0 text-[10px]">
                    <Bot className="h-3 w-3" />
                  </div>
                )}

                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tl-none font-bold'
                      : 'bg-white text-slate-800 rounded-tr-none border border-slate-100 font-bold'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
              </div>
            ))}

            {/* Typing Indicator loading state */}
            {queryMutation.isPending && (
              <div className="flex gap-2 max-w-[85%] ml-auto">
                <div className="h-6 w-6 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center mt-1 shrink-0">
                  <Bot className="h-3 w-3" />
                </div>
                <div className="bg-white text-slate-500 p-3 rounded-2xl rounded-tr-none text-xs border border-slate-100 flex items-center gap-1.5 font-bold">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-secondary" />
                  جاري التفكير ورصد البيانات...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Form Footer */}
          <form onSubmit={handleSend} className="p-3 border-t border-slate-100 bg-white flex gap-2">
            <input
              type="text"
              placeholder="اسأل المساعد الذكي عن أي شيء..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-slate-100 border-none outline-none text-xs px-3 py-2.5 rounded-2xl focus:ring-1 focus:ring-secondary/50 font-bold text-slate-800"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || queryMutation.isPending}
              className="bg-secondary text-secondary-foreground p-2.5 rounded-2xl hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:scale-100 flex items-center justify-center shrink-0 active:scale-95"
            >
              <Send className="h-4 w-4 transform -rotate-90" />
            </button>
          </form>

        </div>
      )}

    </div>
  );
};

export default AiAssistantWidget;
