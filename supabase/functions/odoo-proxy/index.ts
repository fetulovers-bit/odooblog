import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OdooRpcParams {
  url: string;
  database: string;
  login: string;
  apiKey: string;
}

interface OdooSession {
  uid: number;
  database: string;
  sessionCookie: string;
}

function normalizeBaseUrl(url: string) {
  // Strip trailing slashes and any path (e.g. /blog, /web) — Odoo RPC endpoints are always at root
  const trimmed = url.trim().replace(/\/+$/, "");
  try {
    const parsed = new URL(trimmed);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return trimmed;
  }
}

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function extractSessionCookie(headers: Headers, result: unknown) {
  const setCookie = headers.get("set-cookie");
  const headerMatch = setCookie?.match(/session_id=[^;]+/i)?.[0];
  if (headerMatch) return headerMatch;

  if (result && typeof result === "object" && "session_id" in result) {
    const sessionId = String((result as { session_id?: string }).session_id || "").trim();
    if (sessionId) return `session_id=${sessionId}`;
  }

  return null;
}

async function inferDatabaseFromLoginPage(baseUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`${normalizeBaseUrl(baseUrl)}/web/login`, {
      method: "GET",
      headers: { Accept: "text/html" },
    });

    if (!res.ok) return null;

    const html = await res.text();
    const inputMatch = html.match(/name=["']db["'][^>]*value=["']([^"']+)["']/i);
    if (inputMatch?.[1]) return inputMatch[1].trim();

    const jsMatch = html.match(/["']db["']\s*:\s*["']([^"']+)["']/i);
    if (jsMatch?.[1]) return jsMatch[1].trim();
  } catch {
    // ignore
  }

  return null;
}

async function odooJsonRpcWithResponse(
  baseUrl: string,
  endpoint: string,
  params: Record<string, unknown>,
  extraHeaders: Record<string, string> = {}
) {
  const url = `${normalizeBaseUrl(baseUrl)}${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "call",
      params,
    }),
  });

  const text = await res.text();
  let data: Record<string, any> | null = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
      throw new Error(`Resposta inválida do Odoo: ${text}`);
    }
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }

  if (data?.error) {
    throw new Error(data.error.data?.message || data.error.message || JSON.stringify(data.error));
  }

  return { result: data?.result, headers: res.headers };
}

async function odooJsonRpc(
  baseUrl: string,
  endpoint: string,
  params: Record<string, unknown>,
  extraHeaders: Record<string, string> = {}
) {
  const { result } = await odooJsonRpcWithResponse(baseUrl, endpoint, params, extraHeaders);
  return result;
}

async function listDatabases(baseUrl: string): Promise<string[]> {
  try {
    const res = await fetch(`${normalizeBaseUrl(baseUrl)}/web/database/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "call", params: {} }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.result || [];
    }
  } catch { /* ignore */ }
  return [];
}

async function resolveDatabase(p: OdooRpcParams): Promise<string> {
  if (p.database?.trim()) return p.database.trim();

  const loginPageDb = await inferDatabaseFromLoginPage(p.url);
  if (loginPageDb) return loginPageDb;

  const dbs = await listDatabases(p.url);
  if (dbs.length === 1) return dbs[0];
  if (dbs.length > 1) {
    throw new Error(`Múltiplos bancos encontrados (${dbs.join(", ")}). Informe o nome do banco nas configurações.`);
  }
  throw new Error("Não foi possível detectar o banco de dados. Informe o nome manualmente nas configurações.");
}

async function authenticate(p: OdooRpcParams): Promise<OdooSession> {
  const db = await resolveDatabase(p);
  p.database = db;
  const { result, headers } = await odooJsonRpcWithResponse(p.url, "/web/session/authenticate", {
    db,
    login: p.login,
    password: p.apiKey,
  });

  const uid = typeof result === "object" ? result?.uid : result;
  const sessionCookie = extractSessionCookie(headers, result);

  if (!uid || uid === false || !sessionCookie) {
    throw new Error("Autenticação falhou. Verifique login, API Key e nome do banco de dados.");
  }

  return {
    uid: Number(uid),
    database: db,
    sessionCookie,
  };
}

async function callModel(
  session: OdooSession,
  p: OdooRpcParams,
  model: string,
  method: string,
  args: unknown[],
  kwargs: Record<string, unknown> = {}
) {
  return odooJsonRpc(p.url, "/web/dataset/call_kw", {
    model,
    method,
    args,
    kwargs: {
      context: { lang: "pt_BR" },
      ...kwargs,
    },
  }, {
    Cookie: session.sessionCookie,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, odooConfig, postData } = body;

    if (!action || !odooConfig) {
      return new Response(
        JSON.stringify({ error: "action and odooConfig are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { url, database, login, apiKey } = odooConfig as OdooRpcParams;
    if (!url || !login || !apiKey) {
      return new Response(
        JSON.stringify({ error: "url, login and apiKey are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dbName = database || "";

    const params: OdooRpcParams = { url, database: dbName, login, apiKey };

    switch (action) {
      // ---- TEST CONNECTION ----
      case "test_connection": {
        try {
          const session = await authenticate(params);

          return new Response(
            JSON.stringify({ success: true, uid: session.uid, database: session.database, message: `Conexão estabelecida! Banco: ${session.database}` }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (e) {
          const msg = extractErrorMessage(e);
          // Check if server is reachable
          try {
            const versionRes = await fetch(`${normalizeBaseUrl(url)}/web/webclient/version_info`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "call", params: {} }),
            });
            if (versionRes.ok) {
              return new Response(
                JSON.stringify({ success: false, error: `Servidor encontrado, mas: ${msg}` }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          } catch { /* ignore */ }
          return new Response(
            JSON.stringify({ success: false, error: `Não foi possível conectar: ${msg}` }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // ---- FETCH BLOGS ----
      case "fetch_blogs": {
        const session = await authenticate(params);
        const blogs = await callModel(session, params, "blog.blog", "search_read", [
          [],
          ["id", "name"],
        ]);
        return new Response(JSON.stringify({ success: true, blogs, database: session.database }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ---- FETCH TAGS ----
      case "fetch_tags": {
        const session = await authenticate(params);
        const tags = await callModel(session, params, "blog.tag", "search_read", [
          [],
          ["id", "name"],
        ]);
        return new Response(JSON.stringify({ success: true, tags, database: session.database }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ---- FETCH POSTS ----
      case "fetch_posts": {
        const session = await authenticate(params);
        const domain: unknown[] = [];
        if (odooConfig.blogId) {
          domain.push(["blog_id", "=", parseInt(odooConfig.blogId)]);
        }
        const posts = await callModel(session, params, "blog.post", "search_read", [
          domain,
          ["id", "name", "subtitle", "website_meta_description", "tag_ids", "create_date", "write_date", "website_published", "blog_id"],
        ], { limit: 100, order: "write_date desc" });
        return new Response(JSON.stringify({ success: true, posts, database: session.database }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ---- PUBLISH POST ----
      case "publish_post": {
        if (!postData) {
          return new Response(
            JSON.stringify({ error: "postData is required for publish_post" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const session = await authenticate(params);

        const blogId = postData.blogId
          ? parseInt(postData.blogId)
          : odooConfig.blogId
          ? parseInt(odooConfig.blogId)
          : undefined;

        if (!blogId) {
          return new Response(
            JSON.stringify({ error: "Blog ID é obrigatório para publicar. Configure nas preferências ou selecione um blog." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Build the post values
        const values: Record<string, unknown> = {
          blog_id: blogId,
          name: postData.title,
          subtitle: postData.subtitle || "",
          content: postData.htmlContent,
          website_meta_description: postData.metaDescription || "",
          website_published: postData.publish !== false,
        };

        if (postData.coverImageUrl) {
          // Download image and convert to base64 for Odoo
          try {
            const imgRes = await fetch(postData.coverImageUrl);
            if (imgRes.ok) {
              const buf = await imgRes.arrayBuffer();
              const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
              values.cover_properties = JSON.stringify({
                background_image: `data:image/png;base64,${base64}`,
                resize_class: "cover_mid",
                opacity: "0",
              });
            }
          } catch (e) {
            console.error("Failed to download cover image:", e);
          }
        }

        // Create the post
        const postId = await callModel(session, params, "blog.post", "create", [values]);

        // Handle tags if provided
        if (postData.tags && postData.tags.length > 0) {
          // Search existing tags
          const existingTags = await callModel(session, params, "blog.tag", "search_read", [
            [["name", "in", postData.tags]],
            ["id", "name"],
          ]);
          const existingNames = new Set((existingTags as any[]).map((t: any) => t.name));
          const tagIds: number[] = (existingTags as any[]).map((t: any) => t.id);

          // Create missing tags
          for (const tagName of postData.tags) {
            if (!existingNames.has(tagName)) {
              const newId = await callModel(session, params, "blog.tag", "create", [{ name: tagName }]);
              tagIds.push(newId as number);
            }
          }

          // Link tags to post
          if (tagIds.length > 0) {
            await callModel(session, params, "blog.post", "write", [
              [postId],
              { tag_ids: [[6, 0, tagIds]] },
            ]);
          }
        }

        return new Response(
          JSON.stringify({ success: true, postId, message: "Post publicado com sucesso no Odoo!" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Ação desconhecida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (e) {
    console.error("odoo-proxy error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
