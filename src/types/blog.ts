export interface OdooConfig {
  url: string;
  database: string;
  login: string;
  apiKey: string;
  blogId?: string;
  websiteId?: string;
  defaultLanguage: string;
  defaultAuthor: string;
}

export type ToneOfVoice = 'profissional' | 'comercial' | 'educativo' | 'técnico' | 'inspirador';
export type ArticleLength = 'curto' | 'médio' | 'longo';
export type ImageStyle = 'realista' | 'corporativo' | 'ilustração' | 'minimalista' | 'tecnologia';
export type PostStatus = 'rascunho' | 'gerado' | 'publicado' | 'erro';
export type TemplateType = 'educacional' | 'comparativo' | 'dicas' | 'estudo-de-caso' | 'tutorial';

export interface GeneratedImage {
  id: string;
  type: 'cover' | 'internal';
  prompt: string;
  url: string;
  sectionReference: string;
  altText: string;
  caption?: string;
}

export interface BlogPostDraft {
  id: string;
  topic: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  audience: string;
  objective: string;
  tone: ToneOfVoice;
  language: string;
  length: ArticleLength;
  title: string;
  subtitle: string;
  slug: string;
  metaDescription: string;
  excerpt: string;
  htmlContent: string;
  coverImage?: GeneratedImage;
  internalImages: GeneratedImage[];
  tags: string[];
  category: string;
  cta: string;
  status: PostStatus;
  template?: TemplateType;
  imageStyle: ImageStyle;
  internalImageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationBriefing {
  topic: string;
  primaryKeyword: string;
  secondaryKeywords: string;
  audience: string;
  objective: string;
  tone: ToneOfVoice;
  language: string;
  length: ArticleLength;
  internalImageCount: number;
  imageStyle: ImageStyle;
  cta: string;
  category: string;
  blogName: string;
  template?: TemplateType;
}

export interface GenerationStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
}
