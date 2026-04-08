"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════
const TABS = [
  { id: "summary", label: "Product Summary", icon: "📦" },
  { id: "icp", label: "Ideal Customer", icon: "🎯" },
  { id: "pain", label: "Pain Points", icon: "🔥" },
  { id: "value", label: "Value Props", icon: "💎" },
  { id: "landing", label: "Landing Page", icon: "🖥️" },
  { id: "ads", label: "Ad Creatives", icon: "📣" },
  { id: "email", label: "Email Sequences", icon: "✉️" },
  { id: "faq", label: "FAQs", icon: "❓" },
];

const ANALYSIS_PROMPTS = {
  summary: (content, url) =>
    `You are a senior marketing strategist. Analyze this webpage and provide a comprehensive product/service summary. URL: ${url}\n\nContent:\n${content}\n\nReturn JSON:\n{companyName,coreOffering,targetMarket,differentiators:[],pricingModel,positioningStatement,competitiveAdvantage,industry,brandVoice,keyMetrics:[{number,label}]}`,
  icp: (content, url) =>
    `You are an ICP specialist. Build a detailed ideal customer profile from this page. URL: ${url}\n\nContent:\n${content}\n\nReturn JSON:\n{demographics:{ageRange,gender,location,incomeLevel,education},psychographics:{values:[],interests:[],lifestyle,personality},professional:{jobTitles:[],industry,companySize,decisionMakingPower},buyingBehavior:{triggers:[],objections:[],preferredChannels:[],budgetRange},customerPersona:{name,bio,quote,avatar_description}}`,
  pain: (content, url) =>
    `You are a customer pain point analyst. Extract customer pain points. URL: ${url}\n\nContent:\n${content}\n\nReturn JSON:\n{primaryPains:[{pain,severity,description,emotionalImpact}],secondaryPains:[{pain,description}],unspokenPains:[],painToSolutionMap:[{pain,solution,proofPoint}]}`,
  value: (content, url) =>
    `You are a value proposition expert. Create compelling value propositions. URL: ${url}\n\nContent:\n${content}\n\nReturn JSON:\n{primaryValueProp:{headline,subheadline,description},valueProps:[{title,description,metric,icon}],uniqueSellingPoints:[],valueMatrix:{functional:[],emotional:[],social:[]},elevatorPitch}`,
  landing: (content, url) =>
    `You are a world-class landing page designer and copywriter. Create COMPLETE deploy-ready landing page content with SPECIFIC, REAL copy — not generic placeholders. Make it conversion-focused, emotional, and specific to the product. URL: ${url}\n\nContent:\n${content}\n\nReturn JSON:\n{"brand":{name,tagline,primaryColor,accentColor},"hero":{headline,subheadline,ctaText,ctaSubtext,backgroundKeyword,trustBadges:[]},"socialProof":{headline,stats:[{number,label,prefix,suffix}],logos:[]},"problemSection":{headline,subheadline,problems:[{icon,title,description}]},"solutionSection":{headline,subheadline,features:[{icon,title,description,imageKeyword}]},"howItWorks":{headline,steps:[{number,title,description}]},"testimonials":[{name,role,quote,rating}],"pricing":{headline,subheadline,plans:[{name,price,period,features:[],highlighted,ctaText}]},"finalCta":{headline,subheadline,ctaText,urgencyText},"seoMeta":{title,description}}\n\nIMPORTANT: For imageKeyword and backgroundKeyword fields, provide specific descriptive search terms suitable for stock photography. Make ALL copy specific and compelling.`,
  ads: (content, url) =>
    `You are a performance marketing creative director. Create REALISTIC ad creatives with specific copy. URL: ${url}\n\nContent:\n${content}\n\nReturn JSON:\n{"brand":{name,url,logoText,primaryColor,accentColor},"google":{"searchAds":[{headlines:[3 strings max 30 chars],descriptions:[2 strings max 90 chars],sitelinks:[{text,description}]}],"displayAd":{headline,description,cta,imageKeyword,size:"300x250"}},"facebook":{"feedAds":[{headline,primaryText,description,cta,imageKeyword,format:"single_image"}],"storyAd":{headline,cta,imageKeyword},"carouselAd":{cards:[{headline,description,imageKeyword}],primaryText}},"instagram":{"feedAd":{headline,caption,cta,imageKeyword},"reelScript":{hook,body,cta,duration:"15s"}},"hooks":[5 attention hooks],"targetingKeywords":[10 keywords],"audiences":[{name,description,size}]}\n\nFor ALL imageKeyword fields: provide vivid, specific stock photo search terms.`,
  email: (content, url) =>
    `You are an email marketing strategist. Create email sequences with proper HTML-ready content. URL: ${url}\n\nContent:\n${content}\n\nReturn JSON:\n{"brand":{name,primaryColor,accentColor,fromName,fromEmail},"welcomeSequence":[{subject,preheader,sections:[{type:"text"|"cta"|"image"|"divider",content,buttonText,buttonUrl,imageKeyword}],delay:"immediate"|"1 day"|"3 days"}],"nurture":[{subject,preheader,sections:[{type,content,buttonText,buttonUrl,imageKeyword}],delay}],"conversion":[{subject,preheader,sections:[{type,content,buttonText,buttonUrl,imageKeyword}],delay}],"winback":{subject,preheader,sections:[{type,content,buttonText,buttonUrl,imageKeyword}],delay}}\n\nWrite REAL email copy that sounds human, urgent and specific.`,
  faq: (content, url) =>
    `Generate comprehensive FAQs. URL: ${url}\n\nContent:\n${content}\n\nReturn JSON:\n{general:[{q,a}],product:[{q,a}],pricing:[{q,a}],trust:[{q,a}],technical:[{q,a}]}\n\nProvide 4+ per category.`,
};

// ═══════════════════════════════════════════════
//  API HELPER — calls our Next.js route, NOT Anthropic directly
// ═══════════════════════════════════════════════
async function callAPI({ messages, tools, max_tokens }) {
  const resp = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, tools, max_tokens }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `API returned ${resp.status}`);
  }
  return resp.json();
}

// ═══════════════════════════════════════════════
//  TINY COMPONENTS
// ═══════════════════════════════════════════════
function StockImg({ keyword, style: s }) {
  const q = encodeURIComponent(keyword || "business technology");
  return (
    <img
      src={`https://source.unsplash.com/800x500/?${q}`}
      alt={keyword}
      style={{ objectFit: "cover", ...s }}
      loading="lazy"
      onError={(e) => {
        e.target.src = `https://picsum.photos/800/500?random=${Math.random()}`;
      }}
    />
  );
}

function Loader({ message }) {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const i = setInterval(
      () => setDots((d) => (d.length >= 3 ? "" : d + ".")),
      400
    );
    return () => clearInterval(i);
  }, []);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 20px",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: "3px solid rgba(0,230,118,0.15)",
          borderTop: "3px solid #00e676",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <p style={{ color: "#94a3b8", fontSize: 14 }}>
        {message}
        {dots}
      </p>
    </div>
  );
}

function Badge({ children, color = "#00e676" }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: `${color}18`,
        color,
        border: `1px solid ${color}30`,
        marginRight: 6,
        marginBottom: 4,
      }}
    >
      {children}
    </span>
  );
}

function Card({ title, children, accent = "#00e676" }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        borderLeft: `3px solid ${accent}`,
      }}
    >
      {title && (
        <h4
          style={{
            margin: "0 0 12px",
            color: "#e2e8f0",
            fontSize: 14,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {title}
        </h4>
      )}
      {children}
    </div>
  );
}

function CopyBtn({ text }) {
  const [c, setC] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(
          typeof text === "string" ? text : JSON.stringify(text, null, 2)
        );
        setC(true);
        setTimeout(() => setC(false), 1500);
      }}
      style={{
        padding: "4px 10px",
        borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.1)",
        background: c ? "#00e67620" : "rgba(255,255,255,0.04)",
        color: c ? "#00e676" : "#94a3b8",
        fontSize: 11,
        cursor: "pointer",
      }}
    >
      {c ? "✓ Copied" : "Copy"}
    </button>
  );
}

function CopyHtmlBtn({ html, label }) {
  const [c, setC] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(html);
        setC(true);
        setTimeout(() => setC(false), 2000);
      }}
      style={{
        padding: "8px 20px",
        borderRadius: 8,
        border: "1px solid #00e67640",
        background: c ? "#00e67625" : "#00e67612",
        color: "#00e676",
        fontWeight: 600,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      {c ? "✓ Copied HTML!" : label || "📋 Copy Full HTML"}
    </button>
  );
}

// ═══════════════════════════════════════════════
//  RENDERERS — Summary, ICP, Pain, Value
// ═══════════════════════════════════════════════
function RenderSummary({ data }) {
  return (
    <div>
      <div style={{ padding: "20px 24px", background: "linear-gradient(135deg, #00e67612, #0ea5e912)", borderRadius: 14, marginBottom: 20, border: "1px solid #00e67620" }}>
        <h3 style={{ margin: 0, fontSize: 22, color: "#f1f5f9" }}>{data.companyName}</h3>
        <p style={{ margin: "8px 0 0", color: "#94a3b8", fontSize: 14, lineHeight: 1.6 }}>{data.positioningStatement}</p>
      </div>
      <Card title="Core Offering"><p style={{ color: "#cbd5e1", fontSize: 14, margin: 0, lineHeight: 1.7 }}>{data.coreOffering}</p></Card>
      <Card title="Target Market"><p style={{ color: "#cbd5e1", fontSize: 14, margin: 0 }}>{data.targetMarket}</p></Card>
      <Card title="Differentiators"><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{(data.differentiators || []).map((d, i) => <Badge key={i}>{d}</Badge>)}</div></Card>
      {data.keyMetrics?.length > 0 && (
        <Card title="Key Metrics" accent="#f59e0b">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12 }}>
            {data.keyMetrics.map((m, i) => (
              <div key={i} style={{ textAlign: "center", padding: 12, background: "rgba(245,158,11,0.06)", borderRadius: 10 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#f59e0b" }}>{m.number}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card title="Pricing" accent="#f59e0b"><p style={{ color: "#cbd5e1", fontSize: 14, margin: 0 }}>{data.pricingModel}</p></Card>
        <Card title="Competitive Edge" accent="#8b5cf6"><p style={{ color: "#cbd5e1", fontSize: 14, margin: 0 }}>{data.competitiveAdvantage}</p></Card>
      </div>
    </div>
  );
}

function RenderICP({ data }) {
  const p = data.customerPersona || {};
  return (
    <div>
      <div style={{ padding: 20, background: "linear-gradient(135deg,#8b5cf615,#ec489915)", borderRadius: 14, marginBottom: 20, border: "1px solid #8b5cf625" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#8b5cf6,#ec4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👤</div>
          <div>
            <h3 style={{ margin: 0, color: "#f1f5f9", fontSize: 18 }}>{p.name || "Persona"}</h3>
            <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13, fontStyle: "italic" }}>"{p.quote}"</p>
          </div>
        </div>
        {p.bio && <p style={{ color: "#cbd5e1", fontSize: 14, margin: "12px 0 0", lineHeight: 1.6 }}>{p.bio}</p>}
      </div>
      <Card title="Demographics" accent="#8b5cf6">{data.demographics && Object.entries(data.demographics).map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}><span style={{ color: "#94a3b8", fontSize: 13, textTransform: "capitalize" }}>{k.replace(/([A-Z])/g, " $1")}</span><span style={{ color: "#e2e8f0", fontSize: 13 }}>{v}</span></div>)}</Card>
      <Card title="Psychographics" accent="#ec4899"><div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>{(data.psychographics?.values || []).map((v, i) => <Badge key={i} color="#ec4899">{v}</Badge>)}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{(data.psychographics?.interests || []).map((v, i) => <Badge key={i} color="#8b5cf6">{v}</Badge>)}</div></Card>
      <Card title="Buying Triggers" accent="#f59e0b">{(data.buyingBehavior?.triggers || []).map((t, i) => <div key={i} style={{ display: "flex", gap: 8, padding: "4px 0" }}><span style={{ color: "#f59e0b" }}>→</span><span style={{ color: "#cbd5e1", fontSize: 13 }}>{t}</span></div>)}</Card>
      <Card title="Objections" accent="#ef4444">{(data.buyingBehavior?.objections || []).map((o, i) => <div key={i} style={{ display: "flex", gap: 8, padding: "4px 0" }}><span style={{ color: "#ef4444" }}>✕</span><span style={{ color: "#cbd5e1", fontSize: 13 }}>{o}</span></div>)}</Card>
    </div>
  );
}

function RenderPain({ data }) {
  return (
    <div>
      <Card title="Primary Pain Points" accent="#ef4444">{(data.primaryPains || []).map((p, i) => <div key={i} style={{ padding: 14, background: "rgba(239,68,68,0.05)", borderRadius: 10, marginBottom: 10, border: "1px solid rgba(239,68,68,0.1)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14 }}>{p.pain}</span><span style={{ background: p.severity >= 7 ? "#ef444430" : "#f59e0b30", color: p.severity >= 7 ? "#ef4444" : "#f59e0b", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>Severity: {p.severity}/10</span></div><p style={{ color: "#94a3b8", fontSize: 13, margin: "4px 0 0", lineHeight: 1.5 }}>{p.description}</p>{p.emotionalImpact && <p style={{ color: "#f87171", fontSize: 12, margin: "6px 0 0", fontStyle: "italic" }}>💔 {p.emotionalImpact}</p>}</div>)}</Card>
      <Card title="Unspoken Pains" accent="#f59e0b">{(data.unspokenPains || []).map((p, i) => <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0" }}><span style={{ color: "#f59e0b" }}>🤫</span><span style={{ color: "#cbd5e1", fontSize: 13 }}>{p}</span></div>)}</Card>
      <Card title="Pain → Solution" accent="#00e676">{(data.painToSolutionMap || []).map((m, i) => <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}><span style={{ color: "#f87171", fontSize: 13 }}>{m.pain}</span><span style={{ color: "#475569" }}>→</span><span style={{ color: "#4ade80", fontSize: 13 }}>{m.solution}</span></div>)}</Card>
    </div>
  );
}

function RenderValue({ data }) {
  return (
    <div>
      <div style={{ padding: 24, background: "linear-gradient(135deg,#0ea5e912,#00e67612)", borderRadius: 14, marginBottom: 20, border: "1px solid #0ea5e920", textAlign: "center" }}>
        <h2 style={{ margin: 0, fontSize: 24, color: "#f1f5f9" }}>{data.primaryValueProp?.headline}</h2>
        <p style={{ margin: "8px 0 0", color: "#94a3b8", fontSize: 15 }}>{data.primaryValueProp?.subheadline}</p>
      </div>
      <Card title="Value Propositions" accent="#0ea5e9">{(data.valueProps || []).map((v, i) => <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}><span style={{ fontSize: 20 }}>{v.icon}</span><div><h5 style={{ margin: 0, color: "#e2e8f0", fontSize: 14 }}>{v.title}</h5><p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>{v.description}</p></div></div>)}</Card>
      <Card title="USPs"><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{(data.uniqueSellingPoints || []).map((u, i) => <Badge key={i}>{u}</Badge>)}</div></Card>
      <Card title="Elevator Pitch"><p style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 1.7, margin: 0, fontStyle: "italic", padding: "8px 16px", borderLeft: "3px solid #00e676" }}>{data.elevatorPitch}</p><div style={{ marginTop: 10 }}><CopyBtn text={data.elevatorPitch || ""} /></div></Card>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  LANDING PAGE — uses imported generateLandingHTML
// ═══════════════════════════════════════════════
function RenderLanding({ data }) {
  const pc = data.brand?.primaryColor || "#00e676";
  const ac = data.brand?.accentColor || "#0ea5e9";
  const brandName = data.brand?.name || "Brand";
  const [previewMode, setPreviewMode] = useState("desktop");
  const iframeRef = useRef(null);

  const generateFullHTML = useCallback(() => {
    return generateLandingHTML(data);
  }, [data]);

  useEffect(() => {
    if (iframeRef.current && data.hero) {
      const doc = iframeRef.current.contentDocument;
      doc.open();
      doc.write(generateFullHTML());
      doc.close();
    }
  }, [data, previewMode, generateFullHTML]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["desktop", "tablet", "mobile"].map((m) => (
            <button key={m} onClick={() => setPreviewMode(m)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${previewMode === m ? "#00e67640" : "rgba(255,255,255,0.08)"}`, background: previewMode === m ? "#00e67615" : "rgba(255,255,255,0.03)", color: previewMode === m ? "#00e676" : "#64748b", fontSize: 12, cursor: "pointer", textTransform: "capitalize" }}>
              {m === "desktop" ? "🖥️" : m === "tablet" ? "📱" : "📲"} {m}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <CopyHtmlBtn html={generateFullHTML()} />
          <button
            onClick={() => {
              const b = new Blob([generateFullHTML()], { type: "text/html" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(b);
              a.download = `${brandName.toLowerCase().replace(/\s/g, "-")}-landing.html`;
              a.click();
            }}
            style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #0ea5e940", background: "#0ea5e912", color: "#0ea5e9", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            ⬇️ Download HTML
          </button>
        </div>
      </div>
      <div style={{ background: "#1e293b", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ padding: "8px 16px", background: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
          </div>
          <div style={{ flex: 1, padding: "4px 12px", background: "rgba(255,255,255,0.06)", borderRadius: 6, fontSize: 12, color: "#64748b" }}>
            🔒 {brandName.toLowerCase().replace(/\s/g, "")}.com
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", background: "#e2e8f0", padding: previewMode !== "desktop" ? "20px" : 0 }}>
          <iframe ref={iframeRef} style={{ width: previewMode === "mobile" ? 375 : previewMode === "tablet" ? 768 : "100%", height: 720, border: "none", background: "#fff" }} title="Preview" />
        </div>
      </div>
      <Card title="SEO Meta" accent="#0ea5e9">
        <p style={{ color: "#94a3b8", fontSize: 12 }}>Title: <span style={{ color: "#e2e8f0" }}>{data.seoMeta?.title}</span></p>
        <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>Description: <span style={{ color: "#e2e8f0" }}>{data.seoMeta?.description}</span></p>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  AD CREATIVES
// ═══════════════════════════════════════════════
function RenderAds({ data }) {
  const pc = data.brand?.primaryColor || "#00e676";
  const brandName = data.brand?.name || "Brand";
  const brandUrl = data.brand?.url || "brand.com";

  return (
    <div>
      <h3 style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 600, margin: "0 0 16px" }}>🔍 Google Search Ads</h3>
      {(data.google?.searchAds || []).map((ad, i) => (
        <div key={i} style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 16, border: "1px solid #e2e8f0", maxWidth: 600 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#4285f4", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>G</span></div>
            <div><p style={{ margin: 0, fontSize: 13, color: "#202124", fontWeight: 500 }}>{brandName}</p><p style={{ margin: 0, fontSize: 11, color: "#4d5156" }}>{brandUrl}</p></div>
            <span style={{ fontSize: 10, padding: "1px 6px", border: "1px solid #dadce0", borderRadius: 4, color: "#70757a", marginLeft: "auto" }}>Ad</span>
          </div>
          <h3 style={{ margin: "0 0 4px", fontSize: 18, color: "#1a0dab", fontWeight: 400, lineHeight: 1.3 }}>{(ad.headlines || []).join(" | ")}</h3>
          {(ad.descriptions || []).map((d, j) => <p key={j} style={{ margin: "2px 0", fontSize: 13, color: "#4d5156", lineHeight: 1.5 }}>{d}</p>)}
          <div style={{ marginTop: 10 }}><CopyBtn text={`${(ad.headlines || []).join(" | ")}\n${(ad.descriptions || []).join("\n")}`} /></div>
        </div>
      ))}

      {data.google?.displayAd && (
        <>
          <h3 style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 600, margin: "24px 0 16px" }}>🖼️ Google Display Ad (300×250)</h3>
          <div style={{ width: 300, height: 250, borderRadius: 12, overflow: "hidden", position: "relative", border: "1px solid #e2e8f0", marginBottom: 16 }}>
            <StockImg keyword={data.google.displayAd.imageKeyword} style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.82) 100%)", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 20 }}>
              <h4 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: "0 0 4px", lineHeight: 1.2 }}>{data.google.displayAd.headline}</h4>
              <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, margin: "0 0 10px", lineHeight: 1.4 }}>{data.google.displayAd.description}</p>
              <button style={{ alignSelf: "flex-start", padding: "7px 18px", background: pc, color: "#fff", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12 }}>{data.google.displayAd.cta}</button>
            </div>
          </div>
        </>
      )}

      <h3 style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 600, margin: "24px 0 16px" }}>📘 Facebook Feed Ads</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {(data.facebook?.feedAds || []).map((ad, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: pc, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>{brandName[0]}</div>
              <div><p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1c1e21" }}>{brandName}</p><p style={{ margin: 0, fontSize: 11, color: "#65676b" }}>Sponsored · 🌐</p></div>
            </div>
            <div style={{ padding: "0 16px 12px" }}><p style={{ margin: 0, fontSize: 14, color: "#1c1e21", lineHeight: 1.5 }}>{ad.primaryText}</p></div>
            <div style={{ width: "100%", height: 250, overflow: "hidden" }}><StockImg keyword={ad.imageKeyword} style={{ width: "100%", height: "100%" }} /></div>
            <div style={{ padding: "12px 16px", background: "#f0f2f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#1c1e21" }}>{ad.headline}</p><p style={{ margin: 0, fontSize: 13, color: "#65676b" }}>{ad.description}</p></div>
              <button style={{ padding: "8px 18px", background: "#0866ff", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", flexShrink: 0 }}>{ad.cta || "Learn More"}</button>
            </div>
            <div style={{ padding: "8px 16px" }}><CopyBtn text={`${ad.primaryText}\n\n${ad.headline}\n${ad.description}`} /></div>
          </div>
        ))}
      </div>

      {data.instagram?.feedAd && (
        <>
          <h3 style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 600, margin: "24px 0 16px" }}>📸 Instagram Feed Ad</h3>
          <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0", maxWidth: 400 }}>
            <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", padding: 2 }}><div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#262626" }}>{brandName[0]}</div></div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#262626" }}>{brandName.toLowerCase().replace(/\s/g, "")}</p>
              <span style={{ fontSize: 11, color: "#8e8e8e", marginLeft: 4 }}>Sponsored</span>
            </div>
            <div style={{ width: "100%", height: 380, overflow: "hidden", position: "relative" }}>
              <StockImg keyword={data.instagram.feedAd.imageKeyword} style={{ width: "100%", height: "100%" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 16px 16px", background: "linear-gradient(transparent, rgba(0,0,0,0.65))" }}>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 17, margin: 0 }}>{data.instagram.feedAd.headline}</p>
              </div>
            </div>
            <div style={{ padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 14 }}><span style={{ fontSize: 18 }}>♡</span><span style={{ fontSize: 18 }}>💬</span><span style={{ fontSize: 18 }}>↗</span></div>
              <button style={{ padding: "5px 14px", background: "#0095f6", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 12 }}>{data.instagram.feedAd.cta || "Learn More"}</button>
            </div>
            <div style={{ padding: "4px 14px 12px" }}><p style={{ margin: 0, fontSize: 13, color: "#262626", lineHeight: 1.5 }}><b>{brandName.toLowerCase().replace(/\s/g, "")}</b> {data.instagram.feedAd.caption}</p></div>
          </div>
        </>
      )}

      {data.instagram?.reelScript && (
        <Card title="🎬 Reel Script" accent="#e4405f">
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px" }}>
            <Badge color="#e4405f">Hook</Badge><p style={{ color: "#e2e8f0", fontSize: 13, margin: 0 }}>{data.instagram.reelScript.hook}</p>
            <Badge color="#8b5cf6">Body</Badge><p style={{ color: "#cbd5e1", fontSize: 13, margin: 0 }}>{data.instagram.reelScript.body}</p>
            <Badge color="#00e676">CTA</Badge><p style={{ color: "#4ade80", fontSize: 13, margin: 0 }}>{data.instagram.reelScript.cta}</p>
          </div>
        </Card>
      )}

      <Card title="🎣 Hooks" accent="#f59e0b">{(data.hooks || []).map((h, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}><span style={{ color: "#fbbf24", fontSize: 13 }}>⚡ {h}</span><CopyBtn text={h} /></div>)}</Card>
      <Card title="🔑 Keywords" accent="#00e676"><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{(data.targetingKeywords || []).map((k, i) => <Badge key={i}>{k}</Badge>)}</div></Card>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  EMAIL SEQUENCES
// ═══════════════════════════════════════════════
function RenderEmail({ data }) {
  const pc = data.brand?.primaryColor || "#00e676";
  const brandName = data.brand?.name || "Brand";
  const [sel, setSel] = useState(null);
  const all = [
    ...(data.welcomeSequence || []).map((e, i) => ({ ...e, type: "Welcome", index: i, color: "#00e676" })),
    ...(data.nurture || []).map((e, i) => ({ ...e, type: "Nurture", index: i, color: "#0ea5e9" })),
    ...(data.conversion || []).map((e, i) => ({ ...e, type: "Conversion", index: i, color: "#f59e0b" })),
    ...(data.winback ? [{ ...data.winback, type: "Win-back", index: 0, color: "#ef4444" }] : []),
  ];
  const active = sel !== null ? all[sel] : null;

  const genHtml = (email) => {
    const body = (email.sections || []).map((s) => {
      if (s.type === "text") return `<p style="font-size:16px;color:#333;line-height:1.7;margin:0 0 16px">${s.content}</p>`;
      if (s.type === "cta") return `<div style="text-align:center;margin:24px 0"><a href="${s.buttonUrl || "#"}" style="display:inline-block;padding:14px 36px;background:${pc};color:#fff;border-radius:10px;font-weight:700;font-size:16px;text-decoration:none">${s.buttonText}</a></div>`;
      if (s.type === "image") return `<img src="https://source.unsplash.com/600x250/?${encodeURIComponent(s.imageKeyword || "business")}" style="width:100%;border-radius:10px;margin:16px 0" />`;
      if (s.type === "divider") return `<hr style="border:none;border-top:1px solid #eee;margin:20px 0" />`;
      return "";
    }).join("\n");
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:40px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)"><div style="padding:24px 32px;background:${pc};text-align:center"><h1 style="color:#fff;margin:0;font-size:22px">${brandName}</h1></div><div style="padding:32px">${body}</div><div style="padding:16px 32px;background:#fafbfc;text-align:center;border-top:1px solid #eee"><p style="font-size:12px;color:#999;margin:0">${brandName} · <a href="#" style="color:#999">Unsubscribe</a></p></div></div></body></html>`;
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: active ? "260px 1fr" : "1fr", gap: 16 }}>
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>📥 Sequence ({all.length} emails)</p>
          </div>
          {all.map((email, i) => (
            <div key={i} onClick={() => setSel(i)} style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", background: sel === i ? "rgba(0,230,118,0.08)" : "transparent", borderLeft: sel === i ? `3px solid ${email.color}` : "3px solid transparent" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}><Badge color={email.color}>{email.type}</Badge><span style={{ fontSize: 10, color: "#475569" }}>{email.delay}</span></div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email.subject}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email.preheader}</p>
            </div>
          ))}
        </div>
        {active ? (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <CopyHtmlBtn html={genHtml(active)} label="📋 Copy Email HTML" />
              <CopyBtn text={`Subject: ${active.subject}\n${(active.sections || []).filter((s) => s.type === "text").map((s) => s.content).join("\n\n")}`} />
            </div>
            <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", background: "#fafbfc" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: pc, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>{brandName[0]}</div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>{data.brand?.fromName || brandName}</p>
                    <p style={{ margin: 0, fontSize: 12, color: "#8e8e8e" }}>{data.brand?.fromEmail || `hello@${brandName.toLowerCase().replace(/\s/g, "")}.com`}</p>
                  </div>
                  <Badge color={active.color}>{active.type} #{active.index + 1}</Badge>
                </div>
                <h3 style={{ margin: "12px 0 0", fontSize: 18, fontWeight: 600, color: "#1a1a2e" }}>{active.subject}</h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#8e8e8e" }}>{active.preheader}</p>
              </div>
              <div style={{ padding: "24px 32px", maxWidth: 600, margin: "0 auto" }}>
                {(active.sections || []).map((sec, j) => {
                  if (sec.type === "text") return <p key={j} style={{ fontSize: 15, color: "#333", lineHeight: 1.7, margin: "0 0 16px", whiteSpace: "pre-line" }}>{sec.content}</p>;
                  if (sec.type === "cta") return <div key={j} style={{ textAlign: "center", margin: "24px 0" }}><span style={{ display: "inline-block", padding: "14px 36px", background: pc, color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 15 }}>{sec.buttonText}</span></div>;
                  if (sec.type === "image") return <div key={j} style={{ margin: "16px 0", borderRadius: 10, overflow: "hidden" }}><StockImg keyword={sec.imageKeyword} style={{ width: "100%", height: 200 }} /></div>;
                  if (sec.type === "divider") return <hr key={j} style={{ border: "none", borderTop: "1px solid #eee", margin: "20px 0" }} />;
                  return null;
                })}
              </div>
              <div style={{ padding: "16px 32px", borderTop: "1px solid #f1f5f9", background: "#fafbfc", textAlign: "center" }}>
                <p style={{ fontSize: 11, color: "#8e8e8e", margin: 0 }}>{brandName} · Unsubscribe · Privacy</p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, color: "#475569", fontSize: 14 }}>← Select an email to preview</div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  FAQ
// ═══════════════════════════════════════════════
function RenderFAQ({ data }) {
  const [open, setOpen] = useState(null);
  const cats = [
    { key: "general", label: "General", color: "#00e676" },
    { key: "product", label: "Product", color: "#0ea5e9" },
    { key: "pricing", label: "Pricing", color: "#f59e0b" },
    { key: "trust", label: "Trust & Safety", color: "#8b5cf6" },
    { key: "technical", label: "Technical", color: "#ef4444" },
  ];
  return (
    <div>
      {cats.map((cat) => (
        <Card key={cat.key} title={`${cat.label} FAQs`} accent={cat.color}>
          {(data[cat.key] || []).map((faq, i) => {
            const id = `${cat.key}-${i}`;
            return (
              <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }} onClick={() => setOpen(open === id ? null : id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
                  <span style={{ color: "#e2e8f0", fontSize: 14 }}>{faq.q}</span>
                  <span style={{ color: "#64748b", fontSize: 18, transition: "transform 0.2s", transform: open === id ? "rotate(45deg)" : "none" }}>+</span>
                </div>
                {open === id && (
                  <div style={{ padding: "0 0 12px" }}>
                    <p style={{ color: "#94a3b8", fontSize: 13, margin: 0, lineHeight: 1.6 }}>{faq.a}</p>
                    <div style={{ marginTop: 8 }}><CopyBtn text={`Q: ${faq.q}\nA: ${faq.a}`} /></div>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  LANDING PAGE HTML GENERATOR (extracted)
// ═══════════════════════════════════════════════
function generateLandingHTML(data) {
  const pc = data.brand?.primaryColor || "#00e676";
  const ac = data.brand?.accentColor || "#0ea5e9";
  const brandName = data.brand?.name || "Brand";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${data.seoMeta?.title || brandName}</title>
<meta name="description" content="${data.seoMeta?.description || ""}">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Plus Jakarta Sans',sans-serif;color:#1a1a2e;background:#fff;overflow-x:hidden}a{text-decoration:none}
nav{position:fixed;top:0;left:0;right:0;z-index:99;padding:14px 40px;display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.92);backdrop-filter:blur(16px);border-bottom:1px solid #f1f5f9}
nav .logo{font-weight:800;font-size:1.3rem;color:#0f172a}nav .nav-cta{padding:10px 24px;background:${pc};color:#fff;border-radius:10px;font-weight:600;font-size:.95rem;border:none;cursor:pointer}
.hero{position:relative;min-height:92vh;display:flex;align-items:center;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,${pc}06,${ac}08,transparent)}
.hero::after{content:'';position:absolute;top:-30%;right:-15%;width:55vw;height:55vw;background:radial-gradient(circle,${pc}12,transparent 65%);border-radius:50%;pointer-events:none}
.hero-inner{max-width:1200px;margin:0 auto;padding:100px 40px 80px;display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center;position:relative;z-index:1}
.hero h1{font-size:clamp(2.4rem,4.5vw,3.6rem);font-weight:800;line-height:1.08;margin-bottom:18px;color:#0f172a;letter-spacing:-.02em}
.hero h1 em{font-style:normal;background:linear-gradient(135deg,${pc},${ac});-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero p{font-size:1.12rem;color:#64748b;line-height:1.7;margin-bottom:28px}
.btn-primary{display:inline-block;padding:16px 40px;background:${pc};color:#fff;border-radius:12px;font-weight:700;font-size:1.05rem;border:none;cursor:pointer;box-shadow:0 4px 24px ${pc}35}
.hero-visual{border-radius:20px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.18)}.hero-visual img{width:100%;height:auto;display:block}
.trust-bar{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}.trust-badge{padding:6px 14px;background:#f1f5f9;border-radius:8px;font-size:.82rem;color:#475569;font-weight:500;border:1px solid #e2e8f0}
section{padding:80px 40px}.section-inner{max-width:1200px;margin:0 auto}
.section-title{font-size:2rem;font-weight:800;text-align:center;margin-bottom:12px;color:#0f172a}
.section-sub{text-align:center;color:#64748b;margin-bottom:48px;font-size:1.08rem;max-width:600px;margin-left:auto;margin-right:auto}
.stats-section{background:#f8fafc}.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:28px}
.stat-card{padding:28px;background:#fff;border-radius:16px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.04);border:1px solid #f1f5f9}
.stat-number{font-size:2.4rem;font-weight:800;background:linear-gradient(135deg,${pc},${ac});-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.stat-label{font-size:.9rem;color:#64748b;margin-top:6px}
.problem-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}
.problem-card{padding:24px;background:linear-gradient(135deg,#fff5f5,#fff);border-radius:16px;border:1px solid #fee2e2}
.problem-card .icon{font-size:1.8rem;margin-bottom:10px}.problem-card h3{font-size:1.05rem;font-weight:700;margin-bottom:6px;color:#dc2626}.problem-card p{font-size:.9rem;color:#64748b;line-height:1.6}
.features-section{background:linear-gradient(180deg,#f8fafc,#fff)}
.feature-row{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;margin-bottom:56px}
.feature-row.reverse{direction:rtl}.feature-row.reverse>*{direction:ltr}
.feature-text h3{font-size:1.35rem;font-weight:700;margin-bottom:10px;color:#0f172a}.feature-text p{color:#64748b;line-height:1.7;font-size:.98rem}
.feature-img{border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.12)}.feature-img img{width:100%;height:280px;object-fit:cover;display:block}
.how-steps{display:flex;gap:28px;justify-content:center;flex-wrap:wrap}
.step{flex:1;min-width:200px;max-width:300px;padding:28px 22px;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.05);text-align:center;border:1px solid #f1f5f9}
.step-num{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,${pc},${ac});color:#fff;font-weight:800;font-size:1.1rem;display:flex;align-items:center;justify-content:center;margin:0 auto 14px}
.step h3{font-size:1.05rem;font-weight:700;margin-bottom:6px}.step p{font-size:.88rem;color:#64748b;line-height:1.5}
.testimonials-section{background:#0f172a;color:#fff}
.test-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}
.test-card{padding:24px;background:rgba(255,255,255,0.04);border-radius:16px;border:1px solid rgba(255,255,255,0.08)}
.test-stars{color:#fbbf24;margin-bottom:10px}.test-quote{font-size:.95rem;line-height:1.7;color:#cbd5e1;margin-bottom:14px;font-style:italic}
.test-name{font-weight:700;color:#f1f5f9}.test-role{font-size:.8rem;color:#64748b}
.price-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;max-width:960px;margin:0 auto}
.price-card{padding:28px;background:#fff;border-radius:20px;box-shadow:0 2px 16px rgba(0,0,0,0.06);border:2px solid #f1f5f9;text-align:center}
.price-card.hl{border-color:${pc};box-shadow:0 8px 40px ${pc}20;transform:scale(1.04);position:relative}
.price-card.hl::before{content:'POPULAR';position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:${pc};color:#fff;padding:4px 16px;border-radius:20px;font-size:.7rem;font-weight:700}
.price-name{font-size:1.05rem;font-weight:700;margin-bottom:6px}.price-amount{font-size:2.6rem;font-weight:800;color:${pc}}.price-period{font-size:.85rem;color:#94a3b8;margin-bottom:20px}
.price-features{list-style:none;padding:0;margin:0 0 24px;text-align:left}.price-features li{padding:7px 0;border-bottom:1px solid #f8fafc;font-size:.9rem;color:#475569}.price-features li::before{content:'✓';color:${pc};font-weight:700;margin-right:8px}
.price-btn{display:block;width:100%;padding:13px;border-radius:12px;font-weight:700;font-size:.95rem;border:none;cursor:pointer}.price-btn.primary{background:${pc};color:#fff}.price-btn.secondary{background:#f1f5f9;color:#0f172a}
.final-cta-section{padding:100px 40px;background:linear-gradient(135deg,${pc},${ac});text-align:center;color:#fff;position:relative;overflow:hidden}
.final-cta-section::before{content:'';position:absolute;top:-50%;left:-20%;width:60vw;height:60vw;background:rgba(255,255,255,0.06);border-radius:50%}
.final-cta-section h2{font-size:clamp(1.8rem,3.5vw,2.8rem);font-weight:800;margin-bottom:14px;position:relative}
.final-cta-section p{font-size:1.1rem;opacity:.9;margin-bottom:28px;max-width:560px;margin-left:auto;margin-right:auto;position:relative}
.final-cta-section .cta-btn{display:inline-block;padding:16px 44px;background:#fff;color:${pc};border-radius:14px;font-weight:800;font-size:1.1rem;border:none;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.15);position:relative}
.final-cta-section .urgency{margin-top:14px;font-size:.9rem;opacity:.75;position:relative}
footer{padding:32px 40px;text-align:center;background:#0f172a;color:#64748b;font-size:.85rem}
@media(max-width:768px){.hero-inner,.feature-row,.feature-row.reverse{grid-template-columns:1fr;direction:ltr}.hero{min-height:auto}.hero-inner{padding:100px 24px 60px}section{padding:60px 24px}}
</style></head><body>
<nav><div class="logo">${brandName}</div><button class="nav-cta">${data.hero?.ctaText || "Get Started"}</button></nav>
<section class="hero"><div class="hero-inner"><div><h1>${data.hero?.headline?.replace(/\b(\w+)$/, "<em>$1</em>") || ""}</h1><p>${data.hero?.subheadline || ""}</p><button class="btn-primary">${data.hero?.ctaText || "Get Started"}</button>${data.hero?.ctaSubtext ? `<p style="margin-top:10px;font-size:.88rem;color:#94a3b8">${data.hero.ctaSubtext}</p>` : ""}<div class="trust-bar">${(data.hero?.trustBadges || []).map((b) => `<span class="trust-badge">${b}</span>`).join("")}</div></div><div class="hero-visual"><img src="https://source.unsplash.com/700x480/?${encodeURIComponent(data.hero?.backgroundKeyword || "trading finance")}" alt="Hero" /></div></div></section>
${data.socialProof?.stats?.length ? `<section class="stats-section"><div class="section-inner"><h2 class="section-title">${data.socialProof.headline || "Trusted Worldwide"}</h2><div class="stats-grid">${data.socialProof.stats.map((s) => `<div class="stat-card"><div class="stat-number">${s.prefix || ""}${s.number}${s.suffix || ""}</div><div class="stat-label">${s.label}</div></div>`).join("")}</div></div></section>` : ""}
${data.problemSection ? `<section><div class="section-inner"><h2 class="section-title">${data.problemSection.headline}</h2><p class="section-sub">${data.problemSection.subheadline || ""}</p><div class="problem-grid">${(data.problemSection.problems || []).map((p) => `<div class="problem-card"><div class="icon">${p.icon}</div><h3>${p.title}</h3><p>${p.description}</p></div>`).join("")}</div></div></section>` : ""}
${data.solutionSection ? `<section class="features-section"><div class="section-inner"><h2 class="section-title">${data.solutionSection.headline}</h2><p class="section-sub">${data.solutionSection.subheadline || ""}</p>${(data.solutionSection.features || []).map((f, i) => `<div class="feature-row ${i % 2 ? "reverse" : ""}"><div class="feature-text"><h3>${f.icon} ${f.title}</h3><p>${f.description}</p></div><div class="feature-img"><img src="https://source.unsplash.com/600x400/?${encodeURIComponent(f.imageKeyword || "technology")}" alt="${f.title}" /></div></div>`).join("")}</div></section>` : ""}
${data.howItWorks ? `<section><div class="section-inner"><h2 class="section-title">${data.howItWorks.headline}</h2><div class="how-steps">${(data.howItWorks.steps || []).map((s) => `<div class="step"><div class="step-num">${s.number}</div><h3>${s.title}</h3><p>${s.description}</p></div>`).join("")}</div></div></section>` : ""}
${data.testimonials?.length ? `<section class="testimonials-section"><div class="section-inner"><h2 class="section-title" style="color:#fff">What Our Users Say</h2><div style="height:32px"></div><div class="test-grid">${data.testimonials.map((t) => `<div class="test-card"><div class="test-stars">${"★".repeat(t.rating || 5)}</div><p class="test-quote">"${t.quote}"</p><p class="test-name">${t.name}</p><p class="test-role">${t.role}</p></div>`).join("")}</div></div></section>` : ""}
${data.pricing?.plans?.length ? `<section><div class="section-inner"><h2 class="section-title">${data.pricing.headline}</h2><p class="section-sub">${data.pricing.subheadline || ""}</p><div class="price-grid">${data.pricing.plans.map((p) => `<div class="price-card ${p.highlighted ? "hl" : ""}"><p class="price-name">${p.name}</p><p class="price-amount">${p.price}</p><p class="price-period">${p.period || ""}</p><ul class="price-features">${(p.features || []).map((f) => `<li>${f}</li>`).join("")}</ul><button class="price-btn ${p.highlighted ? "primary" : "secondary"}">${p.ctaText || "Get Started"}</button></div>`).join("")}</div></div></section>` : ""}
<section class="final-cta-section"><h2>${data.finalCta?.headline || "Ready to Start?"}</h2><p>${data.finalCta?.subheadline || ""}</p><button class="cta-btn">${data.finalCta?.ctaText || "Get Started Now"}</button>${data.finalCta?.urgencyText ? `<p class="urgency">${data.finalCta.urgencyText}</p>` : ""}</section>
<footer>&copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.</footer>
</body></html>`;
}

// ═══════════════════════════════════════════════
//  RENDERER MAP
// ═══════════════════════════════════════════════
const RENDERERS = {
  summary: RenderSummary,
  icp: RenderICP,
  pain: RenderPain,
  value: RenderValue,
  landing: RenderLanding,
  ads: RenderAds,
  email: RenderEmail,
  faq: RenderFAQ,
};

// ═══════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════
export default function SalesBrain() {
  const [url, setUrl] = useState("");
  const [context, setContext] = useState("");
  const [activeTab, setActiveTab] = useState("summary");
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState({});
  const [scrapedContent, setScrapedContent] = useState(null);
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState(null);
  const [history, setHistory] = useState([]);

  const scrapeURL = useCallback(async (targetUrl) => {
    setScraping(true);
    setScrapeError(null);
    setScrapedContent(null);
    setResults({});
    setError({});
    try {
      const data = await callAPI({
        messages: [
          {
            role: "user",
            content: `Visit this URL and extract ALL text content, product details, pricing, features, testimonials, marketing copy. Be thorough. URL: ${targetUrl}\n\nReturn ONLY extracted content as plain text.`,
          },
        ],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        max_tokens: 1000,
      });
      const text = (data.content || [])
        .map((b) => b.text || "")
        .filter(Boolean)
        .join("\n");
      if (text.length < 50) throw new Error("Could not extract enough content.");
      setScrapedContent(text);
      setHistory((h) => [{ url: targetUrl, time: new Date().toLocaleTimeString() }, ...h.slice(0, 4)]);
    } catch (e) {
      setScrapeError(e.message);
    } finally {
      setScraping(false);
    }
  }, []);

  const analyze = useCallback(
    async (tabId) => {
      if (!scrapedContent) return;
      setLoading((l) => ({ ...l, [tabId]: true }));
      setError((e) => ({ ...e, [tabId]: null }));
      try {
        const prompt = ANALYSIS_PROMPTS[tabId](
          scrapedContent + (context ? `\n\nAdditional context: ${context}` : ""),
          url
        );
        const data = await callAPI({
          messages: [
            {
              role: "user",
              content:
                prompt +
                "\n\nCRITICAL: Return ONLY valid JSON. No markdown, no backticks.",
            },
          ],
          max_tokens: 4096,
        });
        const text = (data.content || [])
          .map((b) => b.text || "")
          .filter(Boolean)
          .join("\n");
        setResults((r) => ({
          ...r,
          [tabId]: JSON.parse(
            text
              .replace(/```json\s*/g, "")
              .replace(/```\s*/g, "")
              .trim()
          ),
        }));
      } catch (e) {
        setError((er) => ({ ...er, [tabId]: "Analysis failed. Retry." }));
      } finally {
        setLoading((l) => ({ ...l, [tabId]: false }));
      }
    },
    [scrapedContent, context, url]
  );

  useEffect(() => {
    if (scrapedContent && !results[activeTab] && !loading[activeTab])
      analyze(activeTab);
  }, [activeTab, scrapedContent, results, loading, analyze]);

  const generateAll = async () => {
    for (const tab of TABS) {
      if (!results[tab.id]) await analyze(tab.id);
    }
  };

  const exportJSON = () => {
    const b = new Blob([JSON.stringify(results, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `salesbrain-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const Renderer = RENDERERS[activeTab];

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* HEADER */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(11,15,26,0.9)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#00e676,#0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🧠</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, fontFamily: "'Space Mono',monospace", background: "linear-gradient(135deg,#00e676,#0ea5e9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>SALES BRAIN</h1>
            <p style={{ margin: 0, fontSize: 10, color: "#64748b" }}>by Holaprime • AI Marketing Intelligence</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {scrapedContent && (
            <>
              <button onClick={generateAll} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #00e67640", background: "#00e67615", color: "#00e676", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>⚡ Generate All</button>
              <button onClick={exportJSON} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}>📥 Export</button>
            </>
          )}
        </div>
      </div>

      {/* INPUT */}
      <div style={{ padding: "20px 24px 0" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && url.trim() && scrapeURL(url.trim())} placeholder="Paste any URL — website, competitor, campaign, offer…" style={{ width: "100%", padding: "14px 16px 14px 42px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#f1f5f9", fontSize: 14, outline: "none" }} />
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, opacity: 0.4 }}>🔗</span>
            </div>
            <button onClick={() => url.trim() && scrapeURL(url.trim())} disabled={scraping || !url.trim()} style={{ padding: "14px 28px", borderRadius: 12, border: "none", background: scraping ? "#1e293b" : "linear-gradient(135deg,#00e676,#0ea5e9)", color: scraping ? "#64748b" : "#0f172a", fontWeight: 700, fontSize: 14, cursor: scraping ? "wait" : "pointer", whiteSpace: "nowrap" }}>
              {scraping ? "Scanning…" : "Analyze"}
            </button>
          </div>
          <textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="Optional: campaign goals, audience, competitor notes…" rows={2} style={{ width: "100%", marginTop: 10, padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", color: "#cbd5e1", fontSize: 13, outline: "none", resize: "vertical" }} />
          {history.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "#475569", lineHeight: "26px" }}>Recent:</span>
              {history.map((h, i) => (
                <button key={i} onClick={() => { setUrl(h.url); scrapeURL(h.url); }} style={{ padding: "3px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", color: "#64748b", fontSize: 11, cursor: "pointer", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {h.url.replace(/https?:\/\//, "").slice(0, 30)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {scraping && <div style={{ maxWidth: 900, margin: "24px auto", padding: "0 24px" }}><Loader message="Scanning URL and extracting content" /></div>}
      {scrapeError && <div style={{ maxWidth: 900, margin: "24px auto", padding: "0 24px" }}><div style={{ padding: 16, background: "#ef444415", border: "1px solid #ef444430", borderRadius: 10, color: "#f87171", fontSize: 13 }}>⚠️ {scrapeError}</div></div>}

      {/* MAIN CONTENT */}
      {scrapedContent && !scraping && (
        <div style={{ maxWidth: 1300, margin: "0 auto", padding: 24, display: "flex", gap: 20, animation: "fadeIn 0.4s ease" }}>
          <div style={{ width: 190, flexShrink: 0 }}>
            <div style={{ position: "sticky", top: 68 }}>
              {TABS.map((tab) => {
                const isA = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 4, borderRadius: 10, border: "none", textAlign: "left", cursor: "pointer", background: isA ? "rgba(0,230,118,0.1)" : "transparent", color: isA ? "#00e676" : "#64748b", borderLeft: isA ? "3px solid #00e676" : "3px solid transparent" }}>
                    <span style={{ fontSize: 15 }}>{tab.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: isA ? 600 : 400, flex: 1 }}>{tab.label}</span>
                    {loading[tab.id] && <span style={{ animation: "pulse 1s infinite", fontSize: 8, color: "#f59e0b" }}>●</span>}
                    {results[tab.id] && !loading[tab.id] && <span style={{ fontSize: 8, color: "#00e676" }}>●</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {loading[activeTab] && <Loader message={`Generating ${TABS.find((t) => t.id === activeTab)?.label}`} />}
            {error[activeTab] && (
              <div style={{ padding: 16, background: "#ef444415", border: "1px solid #ef444430", borderRadius: 10, color: "#f87171", fontSize: 13, marginBottom: 16 }}>
                ⚠️ {error[activeTab]}{" "}
                <button onClick={() => analyze(activeTab)} style={{ marginLeft: 12, padding: "4px 12px", borderRadius: 6, border: "1px solid #ef444440", background: "transparent", color: "#f87171", fontSize: 12, cursor: "pointer" }}>Retry</button>
              </div>
            )}
            {results[activeTab] && Renderer && (
              <div style={{ animation: "fadeIn 0.3s ease" }}><Renderer data={results[activeTab]} /></div>
            )}
            {!loading[activeTab] && !results[activeTab] && !error[activeTab] && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#475569" }}>
                <p style={{ fontSize: 40, margin: "0 0 12px" }}>{TABS.find((t) => t.id === activeTab)?.icon}</p>
                <p style={{ fontSize: 14 }}>Click to generate {TABS.find((t) => t.id === activeTab)?.label}</p>
                <button onClick={() => analyze(activeTab)} style={{ marginTop: 12, padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#00e676,#0ea5e9)", color: "#0f172a", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Generate Now</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {!scrapedContent && !scraping && (
        <div style={{ textAlign: "center", padding: "70px 24px", maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🧠</div>
          <h2 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 12px", fontFamily: "'Space Mono',monospace", background: "linear-gradient(135deg,#00e676,#0ea5e9,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Sales Brain</h2>
          <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.7, margin: "0 0 28px" }}>
            Turn any URL into a complete marketing kit — deploy-ready landing pages with real images, visual ad mockups for Google/Facebook/Instagram, HTML email sequences, and full sales intelligence.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, textAlign: "left" }}>
            {[
              { i: "🖥️", t: "Deploy-ready landing pages" },
              { i: "📣", t: "Visual ad mockups" },
              { i: "✉️", t: "HTML email sequences" },
              { i: "🎯", t: "ICP & personas" },
              { i: "🔥", t: "Pain & value mapping" },
              { i: "📥", t: "Export everything" },
            ].map((x, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize: 16 }}>{x.i}</span>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>{x.t}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28, display: "flex", gap: 8, justifyContent: "center" }}>
            {["holaprime.com", "competitor.com"].map((ex) => (
              <button key={ex} onClick={() => { setUrl(`https://${ex}`); if (ex === "holaprime.com") scrapeURL(`https://${ex}`); }} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", color: "#64748b", fontSize: 12, cursor: "pointer" }}>
                Try {ex}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
