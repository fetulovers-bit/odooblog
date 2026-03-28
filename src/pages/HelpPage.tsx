import { motion } from 'framer-motion';
import { HelpCircle, BookOpen, Zap, Settings, MessageSquare } from 'lucide-react';

const sections = [
  { icon: Zap, title: 'Como gerar um artigo?', text: 'Acesse "Novo Post", preencha o briefing com tema, palavra-chave e configurações, e clique em "Gerar Artigo". A IA criará o conteúdo completo com imagens.' },
  { icon: Settings, title: 'Como configurar o Odoo?', text: 'Vá em "Configurações", preencha a URL do Odoo, banco de dados, login e API Key. Teste a conexão antes de salvar.' },
  { icon: BookOpen, title: 'Templates disponíveis', text: 'Temos 5 templates: Educacional, Comparativo, Dicas, Estudo de Caso e Tutorial. Cada um gera estruturas otimizadas para seu objetivo.' },
  { icon: MessageSquare, title: 'Como editar antes de publicar?', text: 'Após gerar, você será levado ao editor. Ali pode editar título, slug, meta descrição, conteúdo HTML e mais. Salve rascunho ou publique direto.' },
];

export default function HelpPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Ajuda</h1>
        <p className="text-muted-foreground mt-1">Saiba como usar o Odoo Blog AI Writer.</p>
      </div>

      <div className="space-y-4">
        {sections.map((s, i) => (
          <div key={i} className="p-5 rounded-xl border border-border bg-card shadow-card">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <s.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{s.text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
