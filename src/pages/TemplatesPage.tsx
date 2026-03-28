import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, BarChart, Lightbulb, GraduationCap, Wrench, PenSquare } from 'lucide-react';
import { TemplateType } from '@/types/blog';

const templates: { type: TemplateType; label: string; description: string; icon: typeof BookOpen }[] = [
  { type: 'educacional', label: 'Artigo Educacional', description: 'Conteúdo aprofundado para ensinar conceitos ao leitor.', icon: GraduationCap },
  { type: 'comparativo', label: 'Comparativo', description: 'Compare duas ou mais soluções, ferramentas ou abordagens.', icon: BarChart },
  { type: 'dicas', label: 'Lista de Dicas', description: 'Lista prática de dicas e recomendações sobre um tema.', icon: Lightbulb },
  { type: 'estudo-de-caso', label: 'Estudo de Caso', description: 'Narrativa de sucesso com dados e resultados reais.', icon: BookOpen },
  { type: 'tutorial', label: 'Tutorial Passo a Passo', description: 'Guia prático com instruções detalhadas.', icon: Wrench },
];

export default function TemplatesPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Templates</h1>
        <p className="text-muted-foreground mt-1">Escolha um modelo para começar rapidamente.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(t => (
          <Link key={t.type} to={`/new-post?template=${t.type}`} className="group p-5 rounded-xl border border-border bg-card shadow-card hover:shadow-elevated hover:border-primary/30 transition-all">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
              <t.icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">{t.label}</h3>
            <p className="text-xs text-muted-foreground mt-1.5">{t.description}</p>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
