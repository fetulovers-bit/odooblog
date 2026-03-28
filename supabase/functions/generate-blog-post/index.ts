import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { briefing } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const lengthGuide = briefing.length === 'curto' ? '600 palavras' : briefing.length === 'longo' ? '2000 palavras' : '1200 palavras';
    const templateGuide = briefing.template ? `Siga o formato de: ${briefing.template}. ` : '';

    const systemPrompt = `Você é um redator especialista em SEO e conteúdo para blog corporativo. Gere artigos em ${briefing.language || 'português'} com tom ${briefing.tone || 'profissional'}. ${templateGuide}O conteúdo deve ser original, aprofundado, escaneável e persuasivo.

REGRAS:
- Linguagem humana e natural
- Palavra-chave principal usada estrategicamente no título, introdução, pelo menos 1 H2, meta descrição e slug
- Evitar exageros promocionais e keyword stuffing
- Subtítulos úteis e hierarquia correta de headings
- Listas quando fizer sentido
- HTML limpo sem scripts, CSS inline ou markdown
- Conteúdo publicável com mínima edição
- Aproximadamente ${lengthGuide}

Responda APENAS com JSON válido no formato especificado.`;

    const userPrompt = `Gere um artigo completo de blog sobre: "${briefing.topic}"

Palavra-chave principal: ${briefing.primaryKeyword}
Palavras-chave secundárias: ${briefing.secondaryKeywords || 'nenhuma'}
Público-alvo: ${briefing.audience || 'geral'}
Objetivo: ${briefing.objective || 'informar e engajar'}
CTA: ${briefing.cta || 'Entre em contato para saber mais'}
Categoria: ${briefing.category || 'Geral'}

Retorne JSON com esta estrutura:
{
  "title": "título SEO com palavra-chave",
  "subtitle": "subtítulo atrativo",
  "slug": "slug-seo-friendly",
  "metaDescription": "meta descrição com até 155 caracteres",
  "excerpt": "resumo do artigo em 2-3 frases",
  "htmlContent": "HTML completo do artigo com h2, h3, p, ul, li - sem h1",
  "tags": ["tag1", "tag2", "tag3"],
  "cta": "texto do CTA final",
  "coverImagePrompt": "prompt descritivo para imagem de capa horizontal, estilo ${briefing.imageStyle || 'corporativo'}, profissional, sem texto",
  "internalImagePrompts": [
    {"prompt": "prompt descritivo", "sectionReference": "nome da seção", "altText": "texto alt SEO"}
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione fundos nas configurações." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    // Parse JSON from response - handle markdown code blocks
    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      parsed = {
        title: `Artigo sobre ${briefing.topic}`,
        subtitle: briefing.topic,
        slug: briefing.topic.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        metaDescription: `Saiba tudo sobre ${briefing.topic}`,
        excerpt: `Um artigo completo sobre ${briefing.topic}`,
        htmlContent: `<h2>${briefing.topic}</h2><p>${content || 'Conteúdo gerado com sucesso.'}</p>`,
        tags: [briefing.primaryKeyword],
        cta: briefing.cta || 'Saiba mais',
        coverImagePrompt: `Professional ${briefing.imageStyle} image about ${briefing.topic}`,
        internalImagePrompts: [],
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-blog-post error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
