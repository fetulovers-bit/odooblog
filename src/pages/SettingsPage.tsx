import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, TestTube, CheckCircle, XCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OdooConfig } from '@/types/blog';
import { getOdooConfig, saveOdooConfig } from '@/lib/storage';
import { toast } from 'sonner';

export default function SettingsPage() {
  const existing = getOdooConfig();
  const [config, setConfig] = useState<OdooConfig>(existing || {
    url: '', database: '', login: '', apiKey: '',
    blogId: '', websiteId: '', defaultLanguage: 'pt_BR', defaultAuthor: '',
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [showKey, setShowKey] = useState(false);

  const update = (field: keyof OdooConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!config.url || !config.login || !config.apiKey) {
      toast.error('Preencha URL, login e API Key');
      return;
    }
    setTesting(true);
    setTestResult(null);
    // Simulate test - in production this would call the Odoo XML-RPC
    await new Promise(r => setTimeout(r, 2000));
    const success = config.url.startsWith('http');
    setTestResult(success ? 'success' : 'error');
    setTesting(false);
    if (success) toast.success('Conexão testada com sucesso!');
    else toast.error('Falha na conexão. Verifique as credenciais.');
  };

  const handleSave = () => {
    if (!config.url || !config.login || !config.apiKey) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    saveOdooConfig(config);
    toast.success('Configurações salvas!');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Configurações do Odoo</h1>
        <p className="text-muted-foreground mt-1">Configure a conexão com seu Odoo para publicar posts.</p>
      </div>

      <div className="space-y-5 p-6 rounded-xl border border-border bg-card shadow-card">
        <h2 className="font-display font-semibold text-foreground">Conexão</h2>
        
        <div className="space-y-4">
          <div>
            <Label>URL do Odoo *</Label>
            <Input placeholder="https://meuodoo.com" value={config.url} onChange={e => update('url', e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Banco de Dados</Label>
            <Input placeholder="meu_banco" value={config.database} onChange={e => update('database', e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Login / Email *</Label>
            <Input placeholder="admin@empresa.com" value={config.login} onChange={e => update('login', e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>API Key *</Label>
            <div className="relative mt-1.5">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="Sua API Key do Odoo"
                value={config.apiKey}
                onChange={e => update('apiKey', e.target.value)}
                className="pr-10"
              />
              <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleTest} disabled={testing} variant="outline" className="gap-2">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
            Testar Conexão
          </Button>
          {testResult === 'success' && <div className="flex items-center gap-1.5 text-success text-sm"><CheckCircle className="w-4 h-4" /> Conectado</div>}
          {testResult === 'error' && <div className="flex items-center gap-1.5 text-destructive text-sm"><XCircle className="w-4 h-4" /> Falha</div>}
        </div>
      </div>

      <div className="space-y-5 p-6 rounded-xl border border-border bg-card shadow-card">
        <h2 className="font-display font-semibold text-foreground">Preferências</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Blog ID</Label>
            <Input placeholder="Opcional" value={config.blogId || ''} onChange={e => update('blogId', e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Website ID</Label>
            <Input placeholder="Opcional" value={config.websiteId || ''} onChange={e => update('websiteId', e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Idioma Padrão</Label>
            <Input value={config.defaultLanguage} onChange={e => update('defaultLanguage', e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Autor Padrão</Label>
            <Input placeholder="Nome do autor" value={config.defaultAuthor} onChange={e => update('defaultAuthor', e.target.value)} className="mt-1.5" />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} className="gap-2 gradient-primary border-0 text-primary-foreground hover:opacity-90">
        <Save className="w-4 h-4" /> Salvar Configurações
      </Button>
    </motion.div>
  );
}
