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

async function odooJsonRpc(
  baseUrl: string,
  endpoint: string,
  params: Record<string, unknown>
) {
  const url = `${baseUrl.replace(/\/+$/, "")}${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "call",
      params,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const data = await res.json();
  if (data.error) {
    throw new Error(
      data.error.data?.message || data.error.message || JSON.stringify(data.error)
    );
  }
  return data.result;
}

async function listDatabases(baseUrl: string): Promise<string[]> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/web/database/list`, {
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
  if (p.database) return p.database;
  const dbs = await listDatabases(p.url);
  if (dbs.length === 1) return dbs[0];
  if (dbs.length > 1) {
    throw new Error(`Múltiplos bancos encontrados (${dbs.join(", ")}). Informe o nome do banco nas configurações.`);
  }
  throw new Error("Não foi possível detectar o banco de dados. Informe o nome manualmente nas configurações.");
}

async function authenticate(p: OdooRpcParams): Promise<number> {
  const db = await resolveDatabase(p);
  p.database = db;
  const result = await odooJsonRpc(p.url, "/web/session/authenticate", {
    db,
    login: p.login,
    password: p.apiKey,
  });
  const uid = typeof result === "object" ? result?.uid : result;
  if (!uid || uid === false) {
    throw new Error("Autenticação falhou. Verifique login, API Key e nome do banco de dados.");
  }
  return uid;
}

async function callModel(
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
          // Auto-detect database if not provided
          const resolvedDb = await resolveDatabase(params);
          params.database = resolvedDb;

          const result = await odooJsonRpc(url, "/web/session/authenticate", {
            db: resolvedDb,
            login,
            password: apiKey,
          });
          const uid = typeof result === "object" ? result?.uid : result;
          if (!uid || uid === false) {
            return new Response(
              JSON.stringify({ success: false, error: `Credenciais inválidas para o banco "${resolvedDb}". Verifique login e API Key.` }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          return new Response(
            JSON.stringify({ success: true, uid, database: resolvedDb, message: `Conexão estabelecida! Banco: ${resolvedDb}` }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          // Check if server is reachable
          try {
            const versionRes = await fetch(`${url.replace(/\/+$/, "")}/web/webclient/version_info`, {
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
        await authenticate(params);
        const blogs = await callModel(params, "blog.blog", "search_read", [
          [],
          ["id", "name"],
        ]);
        return new Response(JSON.stringify({ success: true, blogs }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ---- FETCH TAGS ----
      case "fetch_tags": {
        await authenticate(params);
        const tags = await callModel(params, "blog.tag", "search_read", [
          [],
          ["id", "name"],
        ]);
        return new Response(JSON.stringify({ success: true, tags }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ---- FETCH POSTS ----
      case "fetch_posts": {
        await authenticate(params);
        const domain: unknown[] = [];
        if (odooConfig.blogId) {
          domain.push(["blog_id", "=", parseInt(odooConfig.blogId)]);
        }
        const posts = await callModel(params, "blog.post", "search_read", [
          domain,
          ["id", "name", "subtitle", "website_meta_description", "tag_ids", "create_date", "write_date", "website_published", "blog_id"],
        ], { limit: 100, order: "write_date desc" });
        return new Response(JSON.stringify({ success: true, posts }),
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

        await authenticate(params);

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
        const postId = await callModel(params, "blog.post", "create", [values]);

        // Handle tags if provided
        if (postData.tags && postData.tags.length > 0) {
          // Search existing tags
          const existingTags = await callModel(params, "blog.tag", "search_read", [
            [["name", "in", postData.tags]],
            ["id", "name"],
          ]);
          const existingNames = new Set((existingTags as any[]).map((t: any) => t.name));
          const tagIds: number[] = (existingTags as any[]).map((t: any) => t.id);

          // Create missing tags
          for (const tagName of postData.tags) {
            if (!existingNames.has(tagName)) {
              const newId = await callModel(params, "blog.tag", "create", [{ name: tagName }]);
              tagIds.push(newId as number);
            }
          }

          // Link tags to post
          if (tagIds.length > 0) {
            await callModel(params, "blog.post", "write", [
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
