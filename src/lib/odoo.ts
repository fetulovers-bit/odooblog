import { supabase } from "@/integrations/supabase/client";
import { OdooConfig } from "@/types/blog";
import { getOdooConfig } from "./storage";

function getConfig(): OdooConfig {
  const config = getOdooConfig();
  if (!config || !config.url || !config.login || !config.apiKey) {
    throw new Error("Configure a conexão com o Odoo em Configurações antes de continuar.");
  }
  return config;
}

async function callProxy(action: string, extra: Record<string, unknown> = {}) {
  const odooConfig = getConfig();
  const { data, error } = await supabase.functions.invoke("odoo-proxy", {
    body: { action, odooConfig, ...extra },
  });
  if (error) throw new Error(error.message || "Erro ao chamar o proxy Odoo");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function testOdooConnection(config: OdooConfig) {
  const { data, error } = await supabase.functions.invoke("odoo-proxy", {
    body: { action: "test_connection", odooConfig: config },
  });
  if (error) throw new Error(error.message || "Erro ao testar conexão");
  return data;
}

export async function fetchOdooBlogs() {
  return callProxy("fetch_blogs");
}

export async function fetchOdooTags() {
  return callProxy("fetch_tags");
}

export async function fetchOdooPosts() {
  return callProxy("fetch_posts");
}

export interface PublishPostData {
  title: string;
  subtitle?: string;
  htmlContent: string;
  metaDescription?: string;
  coverImageUrl?: string;
  tags?: string[];
  blogId?: string;
  publish?: boolean;
}

export async function publishToOdoo(postData: PublishPostData) {
  return callProxy("publish_post", { postData });
}
