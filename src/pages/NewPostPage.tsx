import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Eraser, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GenerationBriefing, BlogPostDraft, GenerationStep, ToneOfVoice, ArticleLength, ImageStyle, TemplateType } from '@/types/blog';
import { saveDraft, getOdooConfig } from '@/lib/storage';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const defaultBriefing: GenerationBriefing = {
  topic: '', primaryKeyword: '', secondaryKeywords: '', audience: '',
  objective: '', tone: 'profissional', language: 'pt-BR', length: 'médio',
  internalImageCount: 3, imageStyle: 'corporativo', cta: '', category: '', blogName: '',
};

const tones: { value: ToneOfVoice; label: string }[] = [
  { value: 'profissional', label: 'Profissional' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'educativo', label: 'Educativo' },
  { value: 'técnico', label: 'Técnico' },
  { value: 'inspirador', label: 'Inspirador' },
];

const lengths: { value: ArticleLength; label: string }[] = [
  { value: 'curto', label: 'Curto (~600 palavras)' },
  { value: 'médio', label: 'Médio (~1200 palavras)' },
  { value: 'longo', label: 'Longo (~2000 palavras)' },
];

const imageStyles: { value: ImageStyle; label: string }[] = [
  { value: 'realista', label: 'Realista' },
  { value: 'corporativo', label: 'Corporativo' },
  { value: 'ilustração', label: 'Ilustração' },
  { value: 'minimalista', label: 'Minimalista' },
  { value: 'tecnologia', label: 'Tecnologia' },
];

const templates: { value: TemplateType; label: string }[] = [
  { value: 'educacional', label: 'Artigo Educacional' },
  { value: 'comparativo', label: 'Comparativo' },
  { value: 'dicas', label: 'Lista de Dicas' },
  { value: 'estudo-de-caso', label: 'Estudo de Caso' },
  { value: 'tutorial', label: 'Tutorial Passo a Passo' },
];

const initialSteps: GenerationStep[] = [
  { id: 'briefing', label: 'Gerando briefing', status: 'pending' },
  { id: 'content', label: 'Escrevendo artigo', status: 'pending' },
  { id: 'cover', label: 'Criando imagem de capa', status: 'pending' },
  { id: 'images', label: 'Criando imagens internas', status: 'pending' },
  { id: 'finalizing', label: 'Finalizando', status: 'pending' },
];

export default function NewPostPage() {
  const navigate = useNavigate();
  const [briefing, setBriefing] = useState<GenerationBriefing>(defaultBriefing);
  const [batchCount, setBatchCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [steps, setSteps] = useState<GenerationStep[]>(initialSteps);
  const defaultAuthor = getOdooConfig()?.defaultAuthor || '';

  const updateField = <K extends keyof GenerationBriefing>(field: K, value: GenerationBriefing[K]) => {
    setBriefing(prev => ({ ...prev, [field]: value }));
  };

  const updateStep = (id: string, status: GenerationStep['status']) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleGenerate = async () => {
    if (!briefing.topic) {
      toast.error('Informe o tema do artigo');
      return;
    }
    if (!briefing.primaryKeyword) {
      toast.error('Informe a palavra-chave principal');
      return;
    }

    setGenerating(true);
    setSteps(initialSteps);

    try {
      const total = Math.max(1, Math.min(50, batchCount));
      const createdDraftIds: string[] = [];

      for (let postIndex = 0; postIndex < total; postIndex++) {
        const draftId = crypto.randomUUID();
        const topicVariation = total > 1
          ? `${briefing.topic} (variação ${postIndex + 1} com abordagem única)`
          : briefing.topic;

        // Step 1: Generate content
        updateStep('briefing', 'active');
        const { data, error } = await supabase.functions.invoke('generate-blog-post', {
          body: { briefing: { ...briefing, topic: topicVariation } },
        });

        if (error) throw error;
        updateStep('briefing', 'done');
        updateStep('content', 'done');

      // Step 2: Generate cover image
      updateStep('cover', 'active');
      let coverImage: BlogPostDraft['coverImage'] = undefined;
      try {
        const coverPrompt = data.coverImagePrompt || `Professional ${briefing.imageStyle} blog cover image about ${briefing.topic}, horizontal, no text, premium quality`;
        const { data: coverData, error: coverError } = await supabase.functions.invoke('generate-blog-image', {
          body: { prompt: coverPrompt, filename: `${draftId}/cover` },
        });
        if (!coverError && coverData?.url) {
          coverImage = {
            id: crypto.randomUUID(),
            type: 'cover' as const,
            prompt: coverPrompt,
            url: coverData.url,
            sectionReference: 'cover',
            altText: data.title || briefing.topic,
          };
        }
      } catch (imgErr) {
        console.warn('Cover image generation failed:', imgErr);
      }
      updateStep('cover', coverImage ? 'done' : 'error');

      // Step 3: Generate internal images
      updateStep('images', 'active');
      const internalImages: BlogPostDraft['internalImages'] = [];
      const imagePrompts = data.internalImagePrompts || [];
      const count = Math.min(imagePrompts.length, briefing.internalImageCount);
      
      for (let i = 0; i < count; i++) {
        try {
          const imgInfo = imagePrompts[i];
          const prompt = typeof imgInfo === 'string' ? imgInfo : imgInfo.prompt;
          const altText = typeof imgInfo === 'string' ? `Imagem ${i + 1}` : (imgInfo.altText || `Imagem ${i + 1}`);
          const sectionRef = typeof imgInfo === 'string' ? `section-${i + 1}` : (imgInfo.sectionReference || `section-${i + 1}`);

          const { data: imgData, error: imgError } = await supabase.functions.invoke('generate-blog-image', {
            body: { prompt: `${prompt}, ${briefing.imageStyle} style, professional, no text`, filename: `${draftId}/internal-${i}` },
          });

          if (!imgError && imgData?.url) {
            internalImages.push({
              id: crypto.randomUUID(),
              type: 'internal',
              prompt,
              url: imgData.url,
              sectionReference: sectionRef,
              altText,
            });
          }
        } catch (imgErr) {
          console.warn(`Internal image ${i} generation failed:`, imgErr);
        }
      }
      updateStep('images', internalImages.length > 0 ? 'done' : 'error');

      // Step 4: Finalize
      updateStep('finalizing', 'active');

      // Insert images into HTML content
      let htmlContent = data.htmlContent || '<p>Conteúdo gerado</p>';
      if (internalImages.length > 0) {
        // Find h2 tags and insert images after them
        const h2Regex = /<\/h2>/g;
        let h2Index = 0;
        htmlContent = htmlContent.replace(h2Regex, (match: string) => {
          if (h2Index < internalImages.length) {
            const img = internalImages[h2Index];
            h2Index++;
            return `${match}\n<figure><img src="${img.url}" alt="${img.altText}" style="width:100%;border-radius:8px;margin:16px 0" /><figcaption>${img.altText}</figcaption></figure>`;
          }
          return match;
        });
      }

        const draft: BlogPostDraft = {
          id: draftId,
          ...briefing,
          topic: topicVariation,
          secondaryKeywords: briefing.secondaryKeywords.split(',').map(s => s.trim()).filter(Boolean),
          title: data.title || `Artigo sobre ${topicVariation}`,
          subtitle: data.subtitle || '',
          slug: data.slug || topicVariation.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          metaDescription: data.metaDescription || '',
          excerpt: data.excerpt || '',
          htmlContent,
          coverImage,
          internalImages,
          tags: data.tags || [],
          cta: briefing.cta || data.cta || '',
          authorName: defaultAuthor,
          status: 'gerado',
          template: briefing.template,
          imageStyle: briefing.imageStyle,
          internalImageCount: briefing.internalImageCount,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        saveDraft(draft);
        createdDraftIds.push(draft.id);
      }
      updateStep('finalizing', 'done');
      toast.success(`${createdDraftIds.length} artigo(s) gerado(s) com sucesso!`);
      setTimeout(() => navigate(createdDraftIds.length > 1 ? '/history' : `/editor/${createdDraftIds[0]}`), 500);
    } catch (err: any) {
      console.error('Generation error:', err);
      toast.error('Erro ao gerar artigo. Tente novamente.');
      setSteps(prev => prev.map(s => s.status === 'active' ? { ...s, status: 'error' } : s));
    } finally {
      setGenerating(false);
    }
  };

  const handleClear = () => {
    setBriefing(defaultBriefing);
    setSteps(initialSteps);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Novo Post</h1>
        <p className="text-muted-foreground mt-1">Preencha o briefing e deixe a IA gerar seu artigo.</p>
      </div>

      {/* Generation progress */}
      {generating && (
        <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" /> Gerando seu artigo...
          </p>
          <div className="space-y-2">
            {steps.map(step => (
              <div key={step.id} className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  step.status === 'done' ? 'bg-success' :
                  step.status === 'active' ? 'bg-primary animate-pulse-slow' :
                  step.status === 'error' ? 'bg-destructive' :
                  'bg-muted-foreground/30'
                }`} />
                <span className={step.status === 'active' ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <div className="space-y-5 p-6 rounded-xl border border-border bg-card shadow-card">
        <h2 className="font-display font-semibold text-foreground">Briefing do Artigo</h2>

        <div className="space-y-4">
          <div>
            <Label>Tema do Artigo *</Label>
            <Input placeholder="Ex: Como implementar automação de marketing no Odoo" value={briefing.topic} onChange={e => updateField('topic', e.target.value)} className="mt-1.5" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Palavra-chave Principal *</Label>
              <Input placeholder="automação de marketing" value={briefing.primaryKeyword} onChange={e => updateField('primaryKeyword', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Quantidade de Posts (1-50)</Label>
              <Input type="number" min={1} max={50} value={batchCount} onChange={e => setBatchCount(Number(e.target.value || 1))} className="mt-1.5" />
            </div>
            <div>
              <Label>Palavras-chave Secundárias</Label>
              <Input placeholder="email marketing, CRM, leads" value={briefing.secondaryKeywords} onChange={e => updateField('secondaryKeywords', e.target.value)} className="mt-1.5" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Público-alvo</Label>
              <Input placeholder="Gestores de marketing" value={briefing.audience} onChange={e => updateField('audience', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Objetivo do Artigo</Label>
              <Input placeholder="Educar e converter leads" value={briefing.objective} onChange={e => updateField('objective', e.target.value)} className="mt-1.5" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Tom de Voz</Label>
              <Select value={briefing.tone} onValueChange={v => updateField('tone', v as ToneOfVoice)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tones.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tamanho</Label>
              <Select value={briefing.length} onValueChange={v => updateField('length', v as ArticleLength)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {lengths.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Idioma</Label>
              <Select value={briefing.language} onValueChange={v => updateField('language', v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (BR)</SelectItem>
                  <SelectItem value="pt-PT">Português (PT)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Template</Label>
            <Select value={briefing.template || ''} onValueChange={v => updateField('template', v as TemplateType)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione um template (opcional)" /></SelectTrigger>
              <SelectContent>
                {templates.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Estilo das Imagens</Label>
              <Select value={briefing.imageStyle} onValueChange={v => updateField('imageStyle', v as ImageStyle)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {imageStyles.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Imagens Internas ({briefing.internalImageCount})</Label>
              <Input type="number" min={2} max={5} value={briefing.internalImageCount} onChange={e => updateField('internalImageCount', parseInt(e.target.value) || 2)} className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label>Categoria</Label>
            <Input placeholder="Marketing Digital" value={briefing.category} onChange={e => updateField('category', e.target.value)} className="mt-1.5" />
          </div>

          <div>
            <Label>CTA Final</Label>
            <Textarea placeholder="Ex: Solicite uma demonstração gratuita do Odoo" value={briefing.cta} onChange={e => updateField('cta', e.target.value)} className="mt-1.5" rows={2} />
          </div>

          <div>
            <Label>Blog no Odoo</Label>
            <Input placeholder="Nome ou ID do blog" value={briefing.blogName} onChange={e => updateField('blogName', e.target.value)} className="mt-1.5" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleGenerate} disabled={generating} className="gap-2 gradient-primary border-0 text-primary-foreground hover:opacity-90">
          <Sparkles className="w-4 h-4" /> Gerar Artigo
        </Button>
        <Button onClick={handleClear} variant="outline" disabled={generating} className="gap-2">
          <Eraser className="w-4 h-4" /> Limpar
        </Button>
      </div>
    </motion.div>
  );
}
