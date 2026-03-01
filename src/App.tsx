/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  LayoutDashboard, 
  Users, 
  Phone, 
  Settings, 
  BarChart3, 
  Plus, 
  Upload, 
  Play, 
  Pause, 
  PhoneCall,
  CheckCircle2,
  Clock,
  XCircle,
  MessageSquare,
  ChevronRight,
  Search,
  MoreVertical,
  Zap,
  Calendar,
  DollarSign,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface Lead {
  id: number;
  name: string;
  phone: string;
  email: string;
  status: string;
  last_contact?: string;
  notes?: string;
  ai_summary?: string;
}

interface Script {
  id: number;
  name: string;
  objective: string;
  content: string;
}

interface Knowledge {
  id: number;
  title: string;
  content: string;
  category: string;
}

interface Campaign {
  id: number;
  name: string;
  script_id?: number;
  status: string;
  total_leads: number;
  completed_leads: number;
}

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'leads', icon: Users, label: 'Leads' },
    { id: 'campaigns', icon: Zap, label: 'Campanhas' },
    { id: 'scripts', icon: MessageSquare, label: 'Scripts IA' },
    { id: 'knowledge', icon: BarChart3, label: 'Base de Conhecimento' },
    { id: 'pipeline', icon: BarChart3, label: 'Pipeline' },
    { id: 'analytics', icon: DollarSign, label: 'CRM Analytics' },
    { id: 'settings', icon: Settings, label: 'Conexões' },
  ];

  return (
    <div className="w-64 h-screen glass border-r border-white/10 flex flex-col p-6 fixed left-0 top-0 z-50">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 bg-sapphire-600 rounded-xl flex items-center justify-center shadow-lg shadow-sapphire-600/20">
          <Phone className="text-white w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tighter text-white">SAFIRA <span className="text-sapphire-500">VOICE</span></h1>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === item.id 
                ? 'bg-sapphire-600/10 text-sapphire-400 border border-sapphire-600/20' 
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 p-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sapphire-400 to-sapphire-700" />
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">Startup Admin</p>
            <p className="text-xs text-white/40 truncate">Plano Enterprise</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, trend }: any) => (
  <div className="glass-card flex flex-col gap-4">
    <div className="flex justify-between items-start">
      <div className="p-3 bg-white/5 rounded-xl">
        <Icon className="text-sapphire-400" size={24} />
      </div>
      {trend && (
        <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
          <ArrowUpRight size={14} /> {trend}
        </span>
      )}
    </div>
    <div>
      <p className="text-white/50 text-sm font-medium">{label}</p>
      <h3 className="text-3xl font-bold mt-1">{value}</h3>
    </div>
  </div>
);

const Dashboard = ({ onNewCampaign }: { onNewCampaign: () => void }) => {
  const [stats, setStats] = useState<any>(null);
  const [testPhone, setTestPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [isQuickCallModalOpen, setIsQuickCallModalOpen] = useState(false);
  const [quickCallLoading, setQuickCallLoading] = useState(false);

  const fetchDashboardData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/dashboard/stats').then(res => res.json()),
      fetch('/api/settings').then(res => res.json())
    ]).then(([statsData, settingsData]) => {
      setStats(statsData);
      setTestPhone(settingsData.TEST_PHONE_NUMBER || '');
    }).catch(err => {
      console.error("Dashboard load error:", err);
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleQuickCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone) return alert('Por favor, insira seu número.');
    
    setQuickCallLoading(true);
    try {
      // Save the number first
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ TEST_PHONE_NUMBER: testPhone })
      });

      const res = await fetch('/api/calls/make', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone, scriptId: 1 })
      });
      const data = await res.json();
      if (data.success) {
        alert('Ligação iniciada! Você receberá uma chamada em instantes.');
        setIsQuickCallModalOpen(false);
      } else {
        alert('Erro: ' + (data.error || 'Falha desconhecida'));
      }
    } catch (e) {
      alert('Erro ao realizar chamada. Verifique sua conexão.');
    } finally {
      setQuickCallLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-sapphire-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!stats) return (
    <div className="glass-card p-10 text-center">
      <p className="text-white/40">Não foi possível carregar as estatísticas. Verifique se o servidor está rodando.</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bem-vindo, Fundador</h2>
          <p className="text-white/50 mt-1">Sua operação de voz está rodando em 12 instâncias.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsQuickCallModalOpen(true)} className="btn-secondary"><PhoneCall size={18} /> Ligar para Mim</button>
          <button onClick={onNewCampaign} className="btn-primary"><Plus size={18} /> Nova Campanha</button>
        </div>
      </div>

      <Modal isOpen={isQuickCallModalOpen} onClose={() => setIsQuickCallModalOpen(false)} title="Testar Ligação da IA">
        <form onSubmit={handleQuickCall} className="space-y-4">
          <p className="text-sm text-white/60">Insira seu número de telefone para que a Safira ligue para você agora e demonstre como ela fala.</p>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40">Seu Telefone (com DDD)</label>
            <input 
              required
              type="text" 
              className="input-field w-full" 
              placeholder="+5511999998888"
              value={testPhone}
              onChange={e => setTestPhone(e.target.value)}
            />
            <p className="text-[10px] text-white/30 italic">
              * Use o formato E.164 (ex: +5511999998888). Se estiver usando uma conta de teste da Twilio, o número deve estar verificado no painel deles.
            </p>
          </div>
          <button 
            type="submit" 
            disabled={quickCallLoading}
            className="btn-primary w-full justify-center mt-4"
          >
            {quickCallLoading ? 'Iniciando Chamada...' : 'Receber Ligação Agora'}
          </button>
        </form>
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Chamadas Realizadas" value={stats.calls} icon={Phone} trend="+12%" />
        <StatCard label="Taxa de Conexão" value={stats.connectionRate} icon={Zap} />
        <StatCard label="Reuniões Marcadas" value={stats.meetings} icon={Calendar} trend="+5" />
        <StatCard label="Vendas Diretas" value={stats.sales} icon={DollarSign} trend="R$ 1.750" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg">Atividade em Tempo Real</h3>
            <div className="flex items-center gap-4">
              <button onClick={fetchDashboardData} className="text-white/40 hover:text-white transition-colors">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Live
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {stats.recentCalls && stats.recentCalls.length > 0 ? (
              stats.recentCalls.map((call: any) => (
                <div key={call.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="w-10 h-10 rounded-full bg-sapphire-600/20 flex items-center justify-center">
                    <PhoneCall size={18} className="text-sapphire-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Chamada com {call.lead_name || 'Desconhecido'}</p>
                    <p className={`text-xs ${call.status === 'failed' ? 'text-red-400' : 'text-white/40'}`}>
                      Status: {call.status} {call.error_message ? `- ${call.error_message}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-sapphire-400">{call.duration}s</p>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest">Duração</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center border border-dashed border-white/10 rounded-xl">
                <p className="text-white/20 text-sm">Nenhuma atividade recente. Inicie uma campanha para ver os dados aqui.</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card">
          <h3 className="font-bold text-lg mb-6">Objeções Comuns</h3>
          <div className="space-y-6">
            {[
              { label: "Sem tempo agora", value: 45, color: "bg-sapphire-500" },
              { label: "Já tenho solução", value: 30, color: "bg-indigo-500" },
              { label: "Preço alto", value: 15, color: "bg-violet-500" },
              { label: "Outros", value: 10, color: "bg-white/20" },
            ].map((obj, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">{obj.label}</span>
                  <span className="font-bold">{obj.value}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${obj.value}%` }}
                    className={`h-full ${obj.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="glass-card w-full max-w-md relative z-10 p-8"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><XCircle size={24} /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
};

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', email: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLeads = () => fetch('/api/leads').then(res => res.json()).then(setLeads);
  const fetchScripts = () => fetch('/api/scripts').then(res => res.json()).then(setScripts);

  useEffect(() => {
    fetchLeads();
    fetchScripts();
  }, []);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setNewLead({ name: '', phone: '', email: '' });
        fetchLeads();
      }
    } catch (e) {
      alert('Erro ao adicionar lead.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as any[];
      
      const formattedLeads = data.map(row => ({
        name: row.Nome || row.name || row.Name,
        phone: row.Telefone || row.phone || row.Phone || row.number,
        email: row.Email || row.email
      })).filter(l => l.name && l.phone);

      if (formattedLeads.length === 0) return alert('Nenhum lead válido encontrado no arquivo.');

      try {
        await fetch('/api/leads/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formattedLeads)
        });
        alert(`${formattedLeads.length} leads importados com sucesso!`);
        fetchLeads();
      } catch (e) {
        alert('Erro na importação em massa.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCallLead = async (lead: Lead) => {
    if (!confirm(`Deseja ligar agora para ${lead.name}?`)) return;
    try {
      const res = await fetch('/api/calls/make', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: lead.phone, scriptId: scripts[0]?.id || 1, leadId: lead.id })
      });
      const data = await res.json();
      if (data.success) alert('Ligação iniciada! A IA está processando o script estratégico.');
      else alert('Erro: ' + data.error);
    } catch (e) {
      alert('Erro ao realizar chamada.');
    }
  };

  const handleAddToKnowledge = async (lead: Lead) => {
    if (!lead.ai_summary) return;
    try {
      await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: `Lead: ${lead.name}`, 
          content: `Resumo da Prospecção: ${lead.ai_summary}`,
          category: 'Leads'
        })
      });
      alert('Informação adicionada à Base de Conhecimento!');
    } catch (e) {
      alert('Erro ao adicionar à base.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Gestão de Leads</h2>
        <div className="flex gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".xlsx,.xls,.csv" 
          />
          <button onClick={() => fileInputRef.current?.click()} className="btn-secondary">
            <Upload size={18} /> Upload Excel
          </button>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
            <Plus size={18} /> Novo Lead
          </button>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Adicionar Novo Lead">
        <form onSubmit={handleAddLead} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40">Nome Completo</label>
            <input 
              required
              type="text" 
              className="input-field w-full" 
              value={newLead.name}
              onChange={e => setNewLead({...newLead, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40">Telefone (com DDD)</label>
            <input 
              required
              type="text" 
              className="input-field w-full" 
              value={newLead.phone}
              onChange={e => setNewLead({...newLead, phone: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40">E-mail (Opcional)</label>
            <input 
              type="email" 
              className="input-field w-full" 
              value={newLead.email}
              onChange={e => setNewLead({...newLead, email: e.target.value})}
            />
          </div>
          <button type="submit" className="btn-primary w-full justify-center mt-4">Salvar Lead</button>
        </form>
      </Modal>

      <div className="glass-card p-0 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome, telefone ou status..." 
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-sapphire-500/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-widest text-white/30 border-b border-white/10">
              <th className="px-6 py-4 font-medium">Lead</th>
              <th className="px-6 py-4 font-medium">Contato</th>
              <th className="px-6 py-4 font-medium">Análise IA</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4">
                  <p className="font-medium">{lead.name}</p>
                  <p className="text-xs text-white/40">{lead.email}</p>
                </td>
                <td className="px-6 py-4 text-sm text-white/60">{lead.phone}</td>
                <td className="px-6 py-4">
                  {lead.ai_summary ? (
                    <div className="flex items-start gap-2 max-w-xs">
                      <Zap size={14} className="text-sapphire-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-white/60 italic leading-relaxed">{lead.ai_summary}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-white/20 italic">Aguardando chamada...</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                    lead.status === 'Venda' ? 'bg-emerald-500/20 text-emerald-400' :
                    lead.status === 'Reunião' ? 'bg-sapphire-500/20 text-sapphire-400' :
                    'bg-white/10 text-white/60'
                  }`}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleCallLead(lead)}
                      className="p-2 hover:bg-sapphire-600/20 rounded-lg text-sapphire-400" 
                      title="Ligar Agora"
                    >
                      <PhoneCall size={18} />
                    </button>
                    {lead.ai_summary && (
                      <button 
                        onClick={() => handleAddToKnowledge(lead)}
                        className="p-2 hover:bg-emerald-600/20 rounded-lg text-emerald-400" 
                        title="Adicionar à Base de Conhecimento"
                      >
                        <Zap size={18} />
                      </button>
                    )}
                    <button className="p-2 hover:bg-white/10 rounded-lg text-white/40">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Campaigns = ({ initialModalOpen = false, onModalClose }: { initialModalOpen?: boolean, onModalClose?: () => void }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(initialModalOpen);
  const [newCampaign, setNewCampaign] = useState({ name: '', scriptId: '' });

  useEffect(() => {
    if (initialModalOpen) setIsModalOpen(true);
  }, [initialModalOpen]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    if (onModalClose) onModalClose();
  };

  const fetchCampaigns = () => fetch('/api/campaigns').then(res => res.json()).then(setCampaigns);
  const fetchScripts = () => fetch('/api/scripts').then(res => res.json()).then(setScripts);

  useEffect(() => {
    fetchCampaigns();
    fetchScripts();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCampaign)
      });
      const data = await res.json();
      if (data.success) {
        alert('Campanha criada com sucesso!');
        handleCloseModal();
        setNewCampaign({ name: '', scriptId: '' });
        fetchCampaigns();
      } else {
        alert('Erro ao criar campanha: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (e) {
      alert('Erro de rede ao criar campanha.');
    }
  };

  const handleStartCampaign = async (camp: Campaign) => {
    if (!confirm(`Deseja iniciar a campanha "${camp.name}"?`)) return;
    alert('Campanha iniciada! O sistema discará para os leads sequencialmente usando o script estratégico.');
    fetch('/api/leads').then(res => res.json()).then(leads => {
      const targetLeads = leads.slice(0, 3);
      targetLeads.forEach((lead: Lead) => {
        fetch('/api/calls/make', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: lead.phone, scriptId: camp.script_id || 1, leadId: lead.id, campaignId: camp.id })
        });
      });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Campanhas de Voz</h2>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary"><Plus size={18} /> Criar Campanha</button>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Criar Nova Campanha">
        <form onSubmit={handleCreateCampaign} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40">Nome da Campanha</label>
            <input 
              required
              type="text" 
              className="input-field w-full" 
              placeholder="Ex: Lançamento Abril"
              value={newCampaign.name}
              onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40">Script Estratégico</label>
            <select 
              required
              className="input-field w-full bg-[#151515]"
              value={newCampaign.scriptId}
              onChange={e => setNewCampaign({ ...newCampaign, scriptId: e.target.value })}
            >
              <option value="">Selecione um script...</option>
              {scripts.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.objective})</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary w-full justify-center mt-4">Criar Campanha</button>
        </form>
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map(camp => (
          <div key={camp.id} className="glass-card space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">{camp.name}</h3>
                <p className="text-xs text-white/40">ID: #{camp.id}</p>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                camp.status === 'Ativa' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {camp.status}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Progresso</span>
                <span className="font-bold">{camp.completed_leads} / {camp.total_leads}</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-sapphire-500" 
                  style={{ width: `${(camp.completed_leads / camp.total_leads) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {camp.status === 'Ativa' ? (
                <button className="btn-secondary flex-1 justify-center"><Pause size={16} /> Pausar</button>
              ) : (
                <button 
                  onClick={() => handleStartCampaign(camp)}
                  className="btn-primary flex-1 justify-center"
                >
                  <Play size={16} /> Iniciar
                </button>
              )}
              <button className="btn-secondary px-3"><Settings size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ScriptsView = () => {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newScript, setNewScript] = useState({ name: '', objective: 'MEETING', content: '' });

  const fetchScripts = () => fetch('/api/scripts').then(res => res.json()).then(setScripts);

  useEffect(() => {
    fetchScripts();
  }, []);

  const handleCreateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newScript)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setNewScript({ name: '', objective: 'MEETING', content: '' });
        fetchScripts();
      }
    } catch (e) {
      alert('Erro ao criar script.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Scripts de IA</h2>
          <p className="text-white/50 mt-1">Defina como a IA deve se comportar e qual o objetivo da ligação.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary"><Plus size={18} /> Novo Script</button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Criar Novo Script Estratégico">
        <form onSubmit={handleCreateScript} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40">Nome do Script</label>
            <input 
              required
              type="text" 
              className="input-field w-full" 
              placeholder="Ex: Prospecção Fria V2"
              value={newScript.name}
              onChange={e => setNewScript({ ...newScript, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40">Objetivo Estratégico</label>
            <select 
              className="input-field w-full bg-[#151515]"
              value={newScript.objective}
              onChange={e => setNewScript({ ...newScript, objective: e.target.value })}
            >
              <option value="MEETING">Agendar Reunião</option>
              <option value="SALE">Venda Direta</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40">Conteúdo do Script (Base para IA)</label>
            <textarea 
              required
              rows={4}
              className="input-field w-full resize-none" 
              placeholder="Escreva como a IA deve iniciar a conversa..."
              value={newScript.content}
              onChange={e => setNewScript({ ...newScript, content: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary w-full justify-center mt-4">Salvar Script</button>
        </form>
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {scripts.map(s => (
          <div key={s.id} className="glass-card space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">{s.name}</h3>
              <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${s.objective === 'SALE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-sapphire-500/20 text-sapphire-400'}`}>
                {s.objective === 'SALE' ? 'Venda' : 'Reunião'}
              </span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed line-clamp-3">{s.content}</p>
            <div className="flex gap-2 pt-2">
              <button className="btn-secondary flex-1 justify-center text-xs">Editar</button>
              <button className="btn-secondary px-3"><MoreVertical size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const KnowledgeBaseView = () => {
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({ title: '', content: '', category: 'General' });

  const fetchKnowledge = () => fetch('/api/knowledge').then(res => res.json()).then(setKnowledge);

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setNewEntry({ title: '', content: '', category: 'General' });
        fetchKnowledge();
      }
    } catch (e) {
      alert('Erro ao salvar conhecimento.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Base de Conhecimento</h2>
          <p className="text-white/50 mt-1">Adicione informações sobre sua empresa para a IA usar durante as ligações.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary"><Plus size={18} /> Novo Conhecimento</button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Adicionar Conhecimento para IA">
        <form onSubmit={handleCreateEntry} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40">Título / Tópico</label>
            <input 
              required
              type="text" 
              className="input-field w-full" 
              placeholder="Ex: Preços, Benefícios, FAQ"
              value={newEntry.title}
              onChange={e => setNewEntry({ ...newEntry, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40">Conteúdo Detalhado</label>
            <textarea 
              required
              rows={6}
              className="input-field w-full resize-none" 
              placeholder="Descreva as informações que a IA deve saber..."
              value={newEntry.content}
              onChange={e => setNewEntry({ ...newEntry, content: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary w-full justify-center mt-4">Salvar na Base</button>
        </form>
      </Modal>

      <div className="grid grid-cols-1 gap-4">
        {knowledge.map(k => (
          <div key={k.id} className="glass-card p-6">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg">{k.title}</h3>
              <span className="text-[10px] bg-white/5 px-2 py-1 rounded-full text-white/40 uppercase tracking-widest">{k.category}</span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">{k.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const SalesPipeline = () => {
  const stages = ['Novo', 'Contato', 'Qualificado', 'Reunião', 'Proposta', 'Venda', 'Não interessado'];
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    fetch('/api/leads').then(res => res.json()).then(setLeads);
  }, []);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-6">
      <h2 className="text-3xl font-bold tracking-tight">Pipeline de Vendas</h2>
      
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => (
          <div key={stage} className="min-w-[280px] flex flex-col gap-4">
            <div className="flex justify-between items-center px-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">{stage}</h4>
              <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-white/30">
                {leads.filter(l => l.status === stage).length}
              </span>
            </div>
            
            <div className="flex-1 glass bg-white/[0.02] rounded-2xl p-3 space-y-3 overflow-y-auto">
              {leads.filter(l => l.status === stage).map(lead => (
                <motion.div 
                  layoutId={lead.id.toString()}
                  key={lead.id} 
                  className="glass-card p-4 text-sm cursor-grab active:cursor-grabbing hover:bg-white/10"
                >
                  <p className="font-bold">{lead.name}</p>
                  <p className="text-xs text-white/40 mt-1">{lead.phone}</p>
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-sapphire-600 border-2 border-[#050505] flex items-center justify-center text-[10px]">S</div>
                    </div>
                    <button className="text-white/20 hover:text-white"><ChevronRight size={16} /></button>
                  </div>
                </motion.div>
              ))}
              <button className="w-full py-3 border-2 border-dashed border-white/5 rounded-xl text-white/20 hover:text-white/40 hover:border-white/10 transition-all text-xs font-medium">
                + Adicionar Lead
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CRMAnalytics = () => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/dashboard/stats').then(res => res.json()).then(setStats);
  }, []);

  if (!stats) return null;

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold tracking-tight">CRM Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card">
          <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Conversão Total</h4>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold">12.5%</span>
            <span className="text-emerald-400 text-sm mb-1">+2.1%</span>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-emerald-500 w-[12.5%]" />
          </div>
        </div>
        <div className="glass-card">
          <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Valor em Pipeline</h4>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold">R$ 45.200</span>
          </div>
          <p className="text-xs text-white/30 mt-4">Baseado em 128 leads qualificados</p>
        </div>
        <div className="glass-card">
          <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Custo por Lead (CPL)</h4>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold">R$ 2.45</span>
          </div>
          <p className="text-xs text-white/30 mt-4">Redução de 15% este mês</p>
        </div>
      </div>

      <div className="glass-card">
        <h3 className="font-bold text-lg mb-6">Desempenho Semanal</h3>
        <div className="h-64 flex items-end gap-4">
          {[40, 65, 30, 85, 55, 90, 70].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                className="w-full bg-sapphire-600/40 border border-sapphire-500/30 rounded-t-lg"
              />
              <span className="text-[10px] text-white/30 uppercase">Dia {i+1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SettingsView = () => {
  const [settings, setSettings] = useState({
    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',
    TWILIO_PHONE_NUMBER: '',
    TEST_PHONE_NUMBER: '',
    WHATSAPP_API_KEY: ''
  });
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setSettings(prev => ({ ...prev, ...data }));
        setInitialLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar configurações:", err);
        setInitialLoading(false);
      });
  }, []);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-sapphire-500" size={32} />
      </div>
    );
  }

  const handleSave = async () => {
    console.log("Iniciando salvamento de configurações...");
    
    // Basic validation
    if (!settings.TWILIO_ACCOUNT_SID || !settings.TWILIO_AUTH_TOKEN || !settings.TWILIO_PHONE_NUMBER) {
      alert('Por favor, preencha todos os campos da Twilio (SID, Token e Número).');
      return;
    }

    setLoading(true);
    setSaveStatus('loading');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro desconhecido no servidor');
      }

      console.log("Configurações salvas com sucesso!");
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
      alert('Configurações salvas com sucesso! Sua telefonia está pronta.');
    } catch (e: any) {
      console.error("Erro ao salvar configurações:", e);
      setSaveStatus('error');
      alert('Erro ao salvar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestCall = async () => {
    console.log("Iniciando chamada de teste para:", settings.TEST_PHONE_NUMBER);
    if (!settings.TEST_PHONE_NUMBER) return alert('Por favor, insira o número de teste no campo "Meu celular para teste".');
    
    setTestLoading(true);
    try {
      const res = await fetch('/api/calls/make', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: settings.TEST_PHONE_NUMBER, scriptId: 1 })
      });
      const data = await res.json();
      console.log("Resposta do servidor:", data);
      if (data.success) {
        alert('Sucesso! Ligação iniciada. Você deve receber uma chamada em instantes.');
      } else {
        alert('Erro ao ligar: ' + (data.error || 'Erro desconhecido no Twilio'));
      }
    } catch (e) {
      console.error("Erro na requisição:", e);
      alert('Erro de rede ao tentar realizar a chamada.');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Conectar Telefonia</h2>
          <p className="text-white/50 mt-1">Configure sua conta Twilio para habilitar ligações reais.</p>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="btn-secondary text-xs"
        >
          <LayoutDashboard size={14} /> Voltar ao Início
        </button>
      </div>

      <div className="glass-card space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40">Twilio Account SID</label>
            <input 
              type="text" 
              className="input-field w-full" 
              placeholder="AC..." 
              value={settings.TWILIO_ACCOUNT_SID}
              onChange={e => setSettings({...settings, TWILIO_ACCOUNT_SID: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40">Twilio Auth Token</label>
            <input 
              type="password" 
              className="input-field w-full" 
              placeholder="••••••••" 
              value={settings.TWILIO_AUTH_TOKEN}
              onChange={e => setSettings({...settings, TWILIO_AUTH_TOKEN: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40">Número Twilio</label>
            <input 
              type="text" 
              className="input-field w-full" 
              placeholder="+1..." 
              value={settings.TWILIO_PHONE_NUMBER}
              onChange={e => setSettings({...settings, TWILIO_PHONE_NUMBER: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40">Meu celular para teste</label>
            <input 
              type="text" 
              className="input-field w-full" 
              placeholder="+55..." 
              value={settings.TEST_PHONE_NUMBER}
              onChange={e => setSettings({...settings, TEST_PHONE_NUMBER: e.target.value})}
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button 
            onClick={handleSave}
            disabled={loading}
            className={`btn-primary flex-1 justify-center transition-all ${saveStatus === 'success' ? 'bg-emerald-600 border-emerald-500' : ''}`}
          >
            {saveStatus === 'loading' ? 'Salvando...' : 
             saveStatus === 'success' ? 'Conectado!' : 
             saveStatus === 'error' ? 'Erro ao Salvar' : 'Salvar e Conectar'}
          </button>
          <button 
            onClick={handleTestCall}
            disabled={testLoading}
            className="btn-secondary flex-1 justify-center"
          >
            {testLoading ? 'Ligando...' : <><PhoneCall size={18} /> Testar Ligação Agora</>}
          </button>
        </div>
        
        {saveStatus === 'success' && (
          <p className="text-center text-emerald-400 text-xs font-medium animate-pulse">
            Configurações salvas! Agora você pode realizar chamadas reais.
          </p>
        )}
        {saveStatus === 'error' && (
          <p className="text-center text-red-400 text-xs font-medium">
            Ocorreu um erro ao salvar. Verifique sua conexão e tente novamente.
          </p>
        )}
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold">WhatsApp & Outras Conexões</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card space-y-4">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-white/5 rounded-xl">
                <Zap className="text-sapphire-400" size={24} />
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${settings.WHATSAPP_API_KEY ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}>
                {settings.WHATSAPP_API_KEY ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-lg">WhatsApp API</h3>
              <p className="text-sm text-white/50 mt-1">Envio automático de mensagens pós-call.</p>
            </div>
            <input 
              type="text" 
              className="input-field w-full" 
              placeholder="API Key do WhatsApp..." 
              value={settings.WHATSAPP_API_KEY}
              onChange={e => setSettings({...settings, WHATSAPP_API_KEY: e.target.value})}
            />
            <button 
              onClick={handleSave} 
              disabled={loading}
              className="btn-secondary w-full justify-center"
            >
              {loading ? 'Salvando...' : 'Salvar Conexão'}
            </button>
          </div>
          <div className="glass-card opacity-50 pointer-events-none">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/5 rounded-xl">
                <Calendar className="text-sapphire-400" size={24} />
              </div>
              <span className="text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider bg-white/10 text-white/40">Desconectado</span>
            </div>
            <h3 className="font-bold text-lg">Agenda</h3>
            <p className="text-sm text-white/50 mt-1">Sincronize com Google Calendar.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [autoOpenCampaignModal, setAutoOpenCampaignModal] = useState(false);

  const handleNewCampaignFromDashboard = () => {
    setActiveTab('campaigns');
    setAutoOpenCampaignModal(true);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNewCampaign={handleNewCampaignFromDashboard} />;
      case 'leads': return <Leads />;
      case 'campaigns': return (
        <Campaigns 
          initialModalOpen={autoOpenCampaignModal} 
          onModalClose={() => setAutoOpenCampaignModal(false)} 
        />
      );
      case 'scripts': return <ScriptsView />;
      case 'knowledge': return <KnowledgeBaseView />;
      case 'pipeline': return <SalesPipeline />;
      case 'analytics': return <CRMAnalytics />;
      case 'settings': return <SettingsView />;
      default: return <Dashboard onNewCampaign={handleNewCampaignFromDashboard} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="ml-64 p-10 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global Call Overlay (Demo) */}
      <div className="fixed bottom-8 right-8 z-[100]">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-16 h-16 bg-sapphire-600 rounded-full flex items-center justify-center shadow-2xl shadow-sapphire-600/40 animate-pulse-sapphire"
        >
          <PhoneCall size={28} />
        </motion.button>
      </div>
    </div>
  );
}
