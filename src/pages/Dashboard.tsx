import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PenSquare, Clock, Settings, FileText, TrendingUp, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { getDrafts } from '@/lib/storage';
import { getOdooConfig } from '@/lib/storage';
import { fetchOdooPosts } from '@/lib/odoo';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function Dashboard() {
  const drafts = getDrafts();
  const config = getOdooConfig();
  const [odooPostsCount, setOdooPostsCount] = useState<number | null>(null);
  const recentDrafts = drafts.slice(0, 5);
  const published = drafts.filter(d => d.status === 'publicado').length;
  const draftCount = drafts.filter(d => d.status === 'rascunho' || d.status === 'gerado').length;

  useEffect(() => {
    let alive = true;
    const loadOdooPosts = async () => {
      if (!config) {
        setOdooPostsCount(null);
        return;
      }
      try {
        const result = await fetchOdooPosts(config);
        if (!alive) return;
        setOdooPostsCount((result.posts || []).length);
      } catch {
        if (!alive) return;
        setOdooPostsCount(null);
      }
    };
    loadOdooPosts();
    return () => { alive = false; };
  }, [config?.url, config?.database, config?.login, config?.apiKey, config?.blogId]);

  const stats = [
    { label: 'Total de Posts', value: drafts.length, icon: FileText, color: 'text-primary' },
    { label: 'Publicados', value: published, icon: TrendingUp, color: 'text-success' },
    { label: 'Rascunhos', value: draftCount, icon: Clock, color: 'text-warning' },
    { label: 'Posts no Odoo', value: odooPostsCount ?? '—', icon: FileText, color: 'text-primary' },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-5xl">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Gerencie seus posts e acompanhe o desempenho.</p>
      </motion.div>

      {/* Connection status */}
      {!config && (
        <motion.div variants={item}>
          <Link to="/settings" className="block p-4 rounded-lg border border-warning/30 bg-warning/5 hover:bg-warning/10 transition-colors">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-warning" />
              <div>
                <p className="text-sm font-medium text-foreground">Configure sua conexão com o Odoo</p>
                <p className="text-xs text-muted-foreground">Adicione suas credenciais para começar a publicar.</p>
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="p-4 rounded-xl border border-border bg-card shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Quick actions */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/new-post" className="group p-5 rounded-xl border border-border bg-card shadow-card hover:shadow-elevated hover:border-primary/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">Criar Novo Post</p>
              <p className="text-xs text-muted-foreground">Gere um artigo com IA</p>
            </div>
          </div>
        </Link>
        <Link to="/history" className="group p-5 rounded-xl border border-border bg-card shadow-card hover:shadow-elevated hover:border-primary/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">Ver Histórico</p>
              <p className="text-xs text-muted-foreground">{drafts.length} posts gerados</p>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Recent posts */}
      {recentDrafts.length > 0 && (
        <motion.div variants={item}>
          <h2 className="text-lg font-display font-semibold text-foreground mb-3">Posts Recentes</h2>
          <div className="space-y-2">
            {recentDrafts.map(d => (
              <Link key={d.id} to={`/editor/${d.id}`} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{d.title || d.topic || 'Sem título'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  d.status === 'publicado' ? 'bg-success/10 text-success' :
                  d.status === 'gerado' ? 'bg-primary/10 text-primary' :
                  d.status === 'erro' ? 'bg-destructive/10 text-destructive' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {d.status}
                </span>
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
