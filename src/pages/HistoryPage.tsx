import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, Edit, Copy, Search, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getDrafts, deleteDraft, saveDraft } from '@/lib/storage';
import { BlogPostDraft } from '@/types/blog';
import { toast } from 'sonner';

export default function HistoryPage() {
  const [drafts, setDrafts] = useState<BlogPostDraft[]>(getDrafts());
  const [search, setSearch] = useState('');

  const filtered = drafts.filter(d =>
    d.title?.toLowerCase().includes(search.toLowerCase()) ||
    d.topic?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string) => {
    deleteDraft(id);
    setDrafts(getDrafts());
    toast.success('Post excluído');
  };

  const handleDuplicate = (draft: BlogPostDraft) => {
    const dup: BlogPostDraft = {
      ...draft,
      id: crypto.randomUUID(),
      title: `${draft.title} (cópia)`,
      status: 'rascunho',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveDraft(dup);
    setDrafts(getDrafts());
    toast.success('Post duplicado');
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'publicado': return 'bg-success/10 text-success';
      case 'gerado': return 'bg-primary/10 text-primary';
      case 'erro': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Histórico</h1>
          <p className="text-muted-foreground mt-1">{drafts.length} posts gerados</p>
        </div>
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar posts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground mt-3">Nenhum post encontrado</p>
          <Link to="/new-post">
            <Button className="mt-4 gradient-primary border-0 text-primary-foreground hover:opacity-90">Criar Primeiro Post</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(d => (
            <div key={d.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card shadow-card hover:shadow-elevated transition-shadow">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link to={`/editor/${d.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate">
                    {d.title || d.topic || 'Sem título'}
                  </Link>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(d.status)}`}>{d.status}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{new Date(d.createdAt).toLocaleDateString('pt-BR')}</span>
                  {d.category && <span>• {d.category}</span>}
                  {d.primaryKeyword && <span>• {d.primaryKeyword}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-4">
                <Link to={`/editor/${d.id}`}>
                  <Button size="icon" variant="ghost" className="h-8 w-8"><Edit className="w-3.5 h-3.5" /></Button>
                </Link>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDuplicate(d)}><Copy className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(d.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
