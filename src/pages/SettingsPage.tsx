import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, TestTube, CheckCircle, XCircle, Loader2, Eye, EyeOff, RefreshCw, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OdooConfig } from '@/types/blog';
import { getOdooConfig, saveOdooConfig } from '@/lib/storage';
import { testOdooConnection, fetchOdooBlogs, fetchOdooTags } from '@/lib/odoo';
import { toast } from 'sonner';

interface OdooBlog { id: number; name: string; }
interface OdooTag { id: number; name: string; }

export default function SettingsPage() {
  const existing = getOdooConfig();
  const [config, setConfig] = useState<OdooConfig>(existing || {
    url: '', database: '', login: '', apiKey: '',
    blogId: '', websiteId: '', defaultLanguage: 'pt_BR', defaultAuthor: '',
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [blogs, setBlogs] = useState<OdooBlog[]>([]);
  const [tags, setTags] = useState<OdooTag[]>([]);
  const [loadingBlogs, setLoadingBlogs] = useState(false);

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
    setTestMessage('');
    try {
      const result = await testOdooConnection(config);
      if (result.success) {
        setTestResult('success');
        setTestMessage(result.message || 'Conexão estabelecida!');
        toast.success('Conexão testada com sucesso!');
        if (result.database && !config.database) {
          setConfig(prev => ({ ...prev, database: result.database }));
        }
      } else {
        setTestResult('error');
        setTestMessage(result.error || 'Falha na conexão');
        toast.error(result.error || 'Falha na conexão');
      }
    } catch (e) {
      setTestResult('error');
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      setTestMessage(msg);
      toast.error(msg);
    }
    setTesting(false);
  };

  const handleFetchBlogs = async () => {
    setLoadingBlogs(true);
    try {
      const result = await fetchOdooBlogs();
      setBlogs(result.blogs || []);
      const tagsResult = await fetchOdooTags();
      setTags(tagsResult.tags || []);
      toast.success(`${(result.blogs || []).length} blog(s) e ${(tagsResult.tags || []).length} tag(s) encontrados`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao buscar dados do Odoo');
    }
    setLoadingBlogs(false);
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

        <div className="flex flex-wrap gap-3 items-center">
          <Button onClick={handleTest} disabled={testing} variant="outline" className="gap-2">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
            Testar Conexão
          </Button>
          <Button onClick={handleFetchBlogs} disabled={loadingBlogs || testResult !== 'success'} variant="outline" className="gap-2">
            {loadingBlogs ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Buscar Blogs e Tags
          </Button>
          {testResult === 'success' && <div className="flex items-center gap-1.5 text-success text-sm"><CheckCircle className="w-4 h-4" /> {testMessage}</div>}
          {testResult === 'error' && <div className="flex items-center gap-1.5 text-destructive text-sm max-w-xs"><XCircle className="w-4 h-4 shrink-0" /> <span className="truncate">{testMessage}</span></div>}
        </div>
      </div>

      <div className="space-y-5 p-6 rounded-xl border border-border bg-card shadow-card">
        <h2 className="font-display font-semibold text-foreground">Preferências</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Blog</Label>
            {blogs.length > 0 ? (
              <Select value={config.blogId || ''} onValueChange={v => update('blogId', v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione um blog" /></SelectTrigger>
                <SelectContent>
                  {blogs.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input placeholder="Blog ID (teste a conexão para listar)" value={config.blogId || ''} onChange={e => update('blogId', e.target.value)} className="mt-1.5" />
            )}
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

        {tags.length > 0 && (
          <div>
            <Label className="text-xs text-muted-foreground">Tags disponíveis no Odoo</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {tags.map(t => (
                <span key={t.id} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t.name}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <Button onClick={handleSave} className="gap-2 gradient-primary border-0 text-primary-foreground hover:opacity-90">
        <Save className="w-4 h-4" /> Salvar Configurações
      </Button>
    </motion.div>
  );
}
