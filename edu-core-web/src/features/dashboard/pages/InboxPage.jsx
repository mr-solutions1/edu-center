import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Send, Bot, CheckCheck, Loader2, Users, Search, AlertCircle, MessageSquare } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { inboxApi } from '../services/inboxApi';
import { useAuth } from '@/features/auth/AuthContext';
import PageHeader from '@/shared/components/PageHeader/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';

const InboxPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeRecipientId, setActiveRecipientId] = useState(null);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);

  // 1. Fetch conversations and contacts
  const { data: convData, isLoading: loadingConv } = useQuery({
    queryKey: ['inbox-conversations'],
    queryFn: () => inboxApi.getConversations(),
  });

  // 2. Fetch messages for the currently selected recipient
  const { data: msgData, isLoading: loadingMsg } = useQuery({
    queryKey: ['inbox-messages', activeRecipientId],
    queryFn: () => inboxApi.getMessages({ recipientId: activeRecipientId }),
    enabled: !!activeRecipientId,
    // Set a very robust refetch interval for live updates without complex Sockets setup if not initialized
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => inboxApi.sendMessage(data),
    onSuccess: (res) => {
      queryClient.setQueryData(['inbox-messages', activeRecipientId], (old) => {
        if (!old) return { data: [res.data] };
        return { ...old, data: [...old.data, res.data] };
      });
      setInputText('');
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });
    },
    onError: (err) => {
      toast.error('فشل إرسال الرسالة. يرجى المحاولة مجدداً.');
    },
  });

  const contacts = convData?.data?.contacts || [];
  const conversationsSummary = convData?.data?.conversations || [];

  // Filter contacts by search
  const filteredContacts = contacts.filter((c) =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeContact = contacts.find((c) => c._id === activeRecipientId);
  const messages = msgData?.data || [];

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeRecipientId || sendMessageMutation.isPending) return;

    sendMessageMutation.mutate({
      recipientId: activeRecipientId,
      type: 'DIRECT',
      content: inputText.trim(),
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      <PageHeader
        title="صندوق الرسائل والبريد الداخلي"
        description="تواصل مباشر وآمن بين الإدارة والمعلمين والطلاب بدون أي روابط خارجية"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh] items-stretch">

        {/* Sidebar: Chats and Contacts */}
        <Card className="lg:col-span-1 shadow-lg border border-slate-200 flex flex-col overflow-hidden rounded-3xl h-full">
          <CardHeader className="border-b bg-slate-50/50 p-4">
            <CardTitle className="text-sm font-black text-primary flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-secondary" />
              الدردشات المتاحة
            </CardTitle>
            <div className="pt-2 relative">
              <Input
                placeholder="ابحث عن زميل أو طالب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white rounded-xl text-xs h-9 pl-8 pr-3"
              />
              <Search className="h-4 w-4 text-slate-400 absolute left-2.5 top-[18px]" />
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-3 space-y-2">
            {loadingConv ? (
              <div className="text-center py-10 text-xs font-bold text-slate-400">جاري تحميل القائمة...</div>
            ) : filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => {
                const isActive = contact._id === activeRecipientId;
                const summary = conversationsSummary.find((c) => c.id === contact._id);
                return (
                  <div
                    key={contact._id}
                    onClick={() => setActiveRecipientId(contact._id)}
                    className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3 border ${
                      isActive
                        ? 'bg-primary border-primary text-primary-foreground shadow-md'
                        : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="h-9 w-9 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center font-black text-xs shadow-sm">
                      {contact.firstName[0]}
                      {contact.lastName[0]}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black truncate">{contact.firstName} {contact.lastName}</span>
                        {summary?.unread && (
                          <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                        )}
                      </div>
                      <p className={`text-[10px] mt-0.5 truncate ${
                        isActive ? 'text-primary-foreground/75 font-bold' : 'text-slate-400'
                      }`}>
                        {summary?.lastMessage || (contact.role === 'ADMIN' ? 'مدير' : contact.role)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-xs text-slate-400">لا يوجد جهات اتصال مطابقة</div>
            )}
          </CardContent>
        </Card>

        {/* Main Conversation Window */}
        <Card className="lg:col-span-2 shadow-lg border border-slate-200 flex flex-col overflow-hidden rounded-3xl h-full">
          {activeContact ? (
            <>
              {/* Chat Header */}
              <div className="bg-slate-50/50 border-b p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center font-black text-sm shadow-md">
                  {activeContact.firstName[0]}
                  {activeContact.lastName[0]}
                </div>
                <div>
                  <h3 className="text-xs font-black text-primary">{activeContact.firstName} {activeContact.lastName}</h3>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">{activeContact.role}</span>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/20">
                {loadingMsg ? (
                  <div className="text-center py-10 text-xs text-slate-400">جاري تحميل الرسائل...</div>
                ) : messages.length > 0 ? (
                  messages.map((msg) => {
                    const isMine = String(msg.senderId._id) === String(user.id);
                    return (
                      <div
                        key={msg._id}
                        className={`flex gap-2.5 max-w-[85%] ${
                          isMine ? 'mr-auto flex-row-reverse' : 'ml-auto'
                        }`}
                      >
                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm border ${
                            isMine
                              ? 'bg-primary text-primary-foreground border-primary rounded-tl-none font-bold'
                              : 'bg-white text-slate-800 border-slate-100 rounded-tr-none font-bold'
                          }`}
                        >
                          <p>{msg.content}</p>
                          <span className={`text-[8px] mt-1.5 block font-mono text-left ${
                            isMine ? 'text-primary-foreground/60' : 'text-slate-400'
                          }`}>
                            {new Date(msg.createdAt).toLocaleTimeString('ar-KW', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-20 text-xs text-slate-400 italic">ابدأ المحادثة الآن! لا توجد رسائل سابقة.</div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Footer Form */}
              <form onSubmit={handleSend} className="p-3 border-t bg-white flex gap-2">
                <input
                  type="text"
                  placeholder="اكتب رسالتك هنا..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 bg-slate-100 border-none outline-none text-xs px-4 py-3 rounded-2xl focus:ring-1 focus:ring-secondary/50 font-bold text-slate-800"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || sendMessageMutation.isPending}
                  className="bg-secondary text-secondary-foreground p-3 rounded-2xl hover:bg-secondary/90 transition-colors disabled:opacity-50 flex items-center justify-center shrink-0 active:scale-95 shadow-md"
                >
                  <Send className="h-4.5 w-4.5 transform -rotate-90" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-10 bg-slate-50/10">
              <Mail className="h-10 w-10 text-slate-300 stroke-[1.5]" />
              <p className="text-xs font-black">يرجى اختيار دردشة من القائمة الجانبية للبدء بالتراسل الفوري</p>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
};

export default InboxPage;
