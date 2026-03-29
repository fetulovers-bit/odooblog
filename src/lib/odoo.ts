import { supabase } from "@/integrations/supabase/client";
import { OdooConfig } from "@/types/blog";
import { getOdooConfig } from "./storage";

function normalizeConfig(config: OdooConfig): OdooConfig {
  return {
    ...config,
    url: config.url.trim().replace(/\/+$/, ""),
    database: config.database?.trim() || "",
    login: config.login.trim(),
    apiKey: config.apiKey.trim(),
    blogId: config.blogId?.trim(),
    websiteId: config.websiteId?.trim(),
    defaultLanguage: config.defaultLanguage?.trim() || "pt_BR",
    defaultAuthor: config.defaultAuthor?.trim() || "",
  };
}

function getConfig(configOverride?: OdooConfig): OdooConfig {
  const config = configOverride ?? getOdooConfig();
  if (!config || !config.url || !config.login || !config.apiKey) {
    throw new Error("Configure a conexão com o Odoo em Configurações antes de continuar.");
  }
  return normalizeConfig(config);
}

async function callProxy(action: string, extra: Record<string, unknown> = {}, configOverride?: OdooConfig) {
  const odooConfig = getConfig(configOverride);
  const { data, error } = await supabase.functions.invoke("odoo-proxy", {
    body: { action, odooConfig, ...extra },
  });
  if (error) {
    let message = error.message || "Erro ao chamar o proxy Odoo";
    const response = (error as unknown as { context?: Response }).context;
    if (response) {
      try {
        const payload = await response.json();
        if (payload?.error) message = payload.error;
      } catch {
        // ignore parse errors and keep default message
      }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function testOdooConnection(config: OdooConfig) {
  const odooConfig = getConfig(config);
  const { data, error } = await supabase.functions.invoke("odoo-proxy", {
    body: { action: "test_connection", odooConfig },
  });
  if (error) throw new Error(error.message || "Erro ao testar conexão");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function fetchOdooBlogs(config?: OdooConfig) {
  return callProxy("fetch_blogs", {}, config);
}

export async function fetchOdooTags(config?: OdooConfig) {
  return callProxy("fetch_tags", {}, config);
}

export async function fetchOdooPosts(config?: OdooConfig) {
  return callProxy("fetch_posts", {}, config);
}

export async function syncOdooPostCovers(config?: OdooConfig) {
  return callProxy("sync_post_covers", {}, config);
}

export async function updateOdooPost(
  postId: number,
  values: { title?: string; subtitle?: string; metaDescription?: string; htmlContent?: string },
  config?: OdooConfig
) {
  return callProxy("update_post", { postId, values }, config);
}

export async function deleteOdooPost(postId: number, config?: OdooConfig) {
  return callProxy("delete_post", { postId }, config);
}

export async function updateOdooPostCover(postId: number, coverDataUrl: string, config?: OdooConfig) {
  return callProxy("update_post_cover", { postId, coverDataUrl }, config);
}

export async function applyAuthorToAllOdooPosts(authorName: string, config?: OdooConfig) {
  return callProxy("apply_author_to_all_posts", { authorName }, config);
}

export interface PublishPostData {
  title: string;
  subtitle?: string;
  htmlContent: string;
  metaDescription?: string;
  coverImageUrl?: string;
  coverImageDataUrl?: string;
  authorName?: string;
  tags?: string[];
  blogId?: string;
  publish?: boolean;
}

export async function publishToOdoo(postData: PublishPostData, config?: OdooConfig) {
  return callProxy("publish_post", { postData }, config);
}
