import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, Edit, Copy, Search, FileText, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getDrafts, deleteDraft, saveDraft, getOdooConfig } from '@/lib/storage';
import { BlogPostDraft } from '@/types/blog';
import { fetchOdooPosts, updateOdooPost, deleteOdooPost, updateOdooPostCover } from '@/lib/odoo';
import { toast } from 'sonner';

export default function HistoryPage() {
  const [drafts, setDrafts] = useState<BlogPostDraft[]>(getDrafts());
  const [search, setSearch] = useState('');
  const [odooPosts, setOdooPosts] = useState<any[]>([]);
  const [loadingOdoo, setLoadingOdoo] = useState(false);
  const odooConfig = getOdooConfig();

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

  const loadOdooPosts = async () => {
    if (!odooConfig) return;
    setLoadingOdoo(true);
    try {
      const result = await fetchOdooPosts(odooConfig);
      setOdooPosts(result.posts || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar posts do Odoo');
    }
    setLoadingOdoo(false);
  };

  useEffect(() => {
    loadOdooPosts();
  }, []);

  const handleEditOdooPost = async (post: any) => {
    if (!odooConfig) return;
    const title = prompt('Novo título do post', post.name || '');
    if (title === null) return;
    const subtitle = prompt('Novo subtítulo do post', post.subtitle || '');
    if (subtitle === null) return;
    try {
      await updateOdooPost(post.id, { title, subtitle }, odooConfig);
      toast.success('Post do Odoo atualizado');
      loadOdooPosts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar post');
    }
  };

  const handleDeleteOdooPost = async (post: any) => {
    if (!odooConfig) return;
    if (!confirm(`Excluir o post "${post.name}" do Odoo?`)) return;
    try {
      await deleteOdooPost(post.id, odooConfig);
      toast.success('Post do Odoo excluído');
      loadOdooPosts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir post');
    }
  };

  const handleUploadCover = async (post: any, file: File) => {
    if (!odooConfig) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = String(reader.result || '');
        await updateOdooPostCover(post.id, dataUrl, odooConfig);
        toast.success('Capa atualizada no Odoo');
        loadOdooPosts();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao atualizar capa');
      }
    };
    reader.readAsDataURL(file);
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
            <div key={d.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card shadow-card hover:shadow-elevated transition-shadow">
              {d.coverImage?.url && (
                <Link to={`/editor/${d.id}`} className="shrink-0">
                  <img src={d.coverImage.url} alt={d.coverImage.altText || d.title} className="w-16 h-16 rounded-lg object-cover" />
                </Link>
              )}
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

      <div className="space-y-3 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-semibold text-foreground">Posts Totais no Odoo</h2>
          <Button size="sm" variant="outline" onClick={loadOdooPosts} className="gap-1.5">
            {loadingOdoo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Atualizar
          </Button>
        </div>
        {!odooConfig && <p className="text-sm text-muted-foreground">Configure o Odoo para visualizar os posts remotos.</p>}
        {odooConfig && (
          <div className="space-y-2">
            {odooPosts.map(post => (
              <div key={post.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{post.name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(post.write_date || post.create_date).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-1">
                  <label className="inline-flex">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadCover(post, file);
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                      <span title="Atualizar capa">🖼️</span>
                    </Button>
                  </label>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditOdooPost(post)}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteOdooPost(post)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ))}
            {odooPosts.length === 0 && !loadingOdoo && <p className="text-sm text-muted-foreground">Nenhum post encontrado no Odoo.</p>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
