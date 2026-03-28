import { OdooConfig, BlogPostDraft } from '@/types/blog';

const ODOO_CONFIG_KEY = 'odoo_blog_config';
const DRAFTS_KEY = 'odoo_blog_drafts';

export function getOdooConfig(): OdooConfig | null {
  const raw = localStorage.getItem(ODOO_CONFIG_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveOdooConfig(config: OdooConfig) {
  localStorage.setItem(ODOO_CONFIG_KEY, JSON.stringify(config));
}

export function getDrafts(): BlogPostDraft[] {
  const raw = localStorage.getItem(DRAFTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveDraft(draft: BlogPostDraft) {
  const drafts = getDrafts();
  const idx = drafts.findIndex(d => d.id === draft.id);
  if (idx >= 0) {
    drafts[idx] = { ...draft, updatedAt: new Date().toISOString() };
  } else {
    drafts.unshift(draft);
  }
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export function deleteDraft(id: string) {
  const drafts = getDrafts().filter(d => d.id !== id);
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export function getDraft(id: string): BlogPostDraft | undefined {
  return getDrafts().find(d => d.id === id);
}
