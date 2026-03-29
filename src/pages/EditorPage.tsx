import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, Send, Copy, Download, RefreshCw, ArrowLeft, Eye, Code, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { BlogPostDraft } from '@/types/blog';
import { getDraft, saveDraft } from '@/lib/storage';
import { publishToOdoo } from '@/lib/odoo';
import { toast } from 'sonner';

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<BlogPostDraft | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'html'>('preview');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (id) {
      const found = getDraft(id);
      if (found) setDraft(found);
      else {
        toast.error('Post não encontrado');
        navigate('/history');
      }
    }
  }, [id]);

  if (!draft) return null;

  const updateField = <K extends keyof BlogPostDraft>(field: K, value: BlogPostDraft[K]) => {
    setDraft(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleSave = () => {
    if (draft) {
      saveDraft({ ...draft, status: 'rascunho' });
      toast.success('Rascunho salvo!');
    }
  };

  const handleCopyHTML = () => {
    navigator.clipboard.writeText(draft.htmlContent);
    toast.success('HTML copiado!');
  };

  const handleExportHTML = () => {
    const blob = new Blob([draft.htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draft.slug || 'artigo'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('HTML exportado!');
  };

  const handlePublish = async () => {
    if (!draft) return;
    setPublishing(true);
    try {
      const result = await publishToOdoo({
        title: draft.title,
        subtitle: draft.subtitle,
        htmlContent: draft.htmlContent,
        metaDescription: draft.metaDescription,
        coverImageUrl: draft.coverImage?.url,
        coverImageDataUrl: draft.coverImage?.dataUrl,
        authorName: draft.authorName,
        tags: draft.tags,
        publish: true,
      });
      saveDraft({ ...draft, status: 'publicado' });
      setDraft(prev => prev ? { ...prev, status: 'publicado' } : null);
      toast.success(result.message || 'Post publicado no Odoo!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao publicar no Odoo');
      saveDraft({ ...draft, status: 'erro' });
      setDraft(prev => prev ? { ...prev, status: 'erro' } : null);
    }
    setPublishing(false);
  };

  const handleCoverUpload = (file?: File) => {
    if (!file || !draft) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      updateField('coverImage', {
        id: draft.coverImage?.id || crypto.randomUUID(),
        type: 'cover',
        prompt: draft.coverImage?.prompt || `Capa para ${draft.title}`,
        url: dataUrl,
        dataUrl,
        sectionReference: 'cover',
        altText: draft.coverImage?.altText || draft.title,
      });
      toast.success('Imagem de capa atualizada no rascunho');
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handleSave} className="gap-1.5">
            <Save className="w-3.5 h-3.5" /> Salvar
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopyHTML} className="gap-1.5">
            <Copy className="w-3.5 h-3.5" /> Copiar
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportHTML} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Exportar
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={publishing} className="gap-1.5 gradient-primary border-0 text-primary-foreground hover:opacity-90">
            {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} {publishing ? 'Publicando...' : 'Publicar'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-4">
          {/* Meta fields */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-card space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Título</Label>
              <Input value={draft.title} onChange={e => updateField('title', e.target.value)} className="mt-1 text-lg font-display font-semibold" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Subtítulo</Label>
              <Input value={draft.subtitle} onChange={e => updateField('subtitle', e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Slug</Label>
                <Input value={draft.slug} onChange={e => updateField('slug', e.target.value)} className="mt-1 font-mono text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Meta Descrição</Label>
                <Input value={draft.metaDescription} onChange={e => updateField('metaDescription', e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Autor</Label>
              <Input value={draft.authorName || ''} onChange={e => updateField('authorName', e.target.value)} className="mt-1" />
            </div>
          </div>

          {/* Content */}
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/50">
              <button
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'preview' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
              <button
                onClick={() => setViewMode('html')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'html' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Code className="w-3.5 h-3.5" /> HTML
              </button>
            </div>

            {viewMode === 'preview' ? (
              <div className="p-6 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: draft.htmlContent }} />
            ) : (
              <Textarea
                value={draft.htmlContent}
                onChange={e => updateField('htmlContent', e.target.value)}
                className="min-h-[400px] font-mono text-xs border-0 rounded-none focus-visible:ring-0"
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-card space-y-3">
            <h3 className="text-sm font-display font-semibold text-foreground">Status</h3>
            <Badge variant={draft.status === 'publicado' ? 'default' : 'secondary'}>
              {draft.status}
            </Badge>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Criado: {new Date(draft.createdAt).toLocaleDateString('pt-BR')}</p>
              <p>Atualizado: {new Date(draft.updatedAt).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          {/* Tags */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-card space-y-3">
            <h3 className="text-sm font-display font-semibold text-foreground">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {draft.tags.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
              ))}
              {draft.tags.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma tag</p>}
            </div>
          </div>

          {/* Category */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-card space-y-3">
            <h3 className="text-sm font-display font-semibold text-foreground">Categoria</h3>
            <Input value={draft.category} onChange={e => updateField('category', e.target.value)} className="text-sm" />
          </div>

          {/* Cover Image */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-card space-y-3">
            <h3 className="text-sm font-display font-semibold text-foreground">Imagem de Capa</h3>
            {draft.coverImage && <img src={draft.coverImage.url} alt={draft.coverImage.altText} className="w-full rounded-lg" />}
            <Input type="file" accept="image/*" onChange={e => handleCoverUpload(e.target.files?.[0])} />
            {draft.coverImage && <p className="text-xs text-muted-foreground">{draft.coverImage.altText}</p>}
          </div>

          {/* Internal images */}
          {draft.internalImages.length > 0 && (
            <div className="p-4 rounded-xl border border-border bg-card shadow-card space-y-3">
              <h3 className="text-sm font-display font-semibold text-foreground">Imagens Internas</h3>
              <div className="space-y-2">
                {draft.internalImages.map((img, i) => (
                  <div key={i} className="space-y-1">
                    <img src={img.url} alt={img.altText} className="w-full rounded-lg" />
                    <p className="text-xs text-muted-foreground">{img.altText}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Excerpt */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-card space-y-3">
            <h3 className="text-sm font-display font-semibold text-foreground">Excerpt</h3>
            <Textarea value={draft.excerpt} onChange={e => updateField('excerpt', e.target.value)} rows={3} className="text-sm" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
