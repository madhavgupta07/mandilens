import fs from "node:fs";
import path from "node:path";

const DIAGRAMS_DIR = path.resolve(process.cwd(), "diagrams");
const ARTIFACTS_DIR = "C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\be14fac0-3cf0-45d6-a0d0-4affb3c76e8b\\diagrams";

fs.mkdirSync(DIAGRAMS_DIR, { recursive: true });
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

// 1. Flow Diagram SVG
const flowSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 960" width="1600" height="960" style="background:#090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <defs>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10B981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="100%" stop-color="#0284C7"/>
    </linearGradient>
    <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBBF24"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
    <linearGradient id="indigoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#818CF8"/>
      <stop offset="100%" stop-color="#4F46E5"/>
    </linearGradient>
    <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C084FC"/>
      <stop offset="100%" stop-color="#9333EA"/>
    </linearGradient>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="#10B981"/>
    </marker>
    <marker id="arrowSky" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="#38BDF8"/>
    </marker>
    <marker id="arrowAmber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="#FBBF24"/>
    </marker>
    <pattern id="bgGrid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" stroke-width="0.8" opacity="0.4"/>
    </pattern>
  </defs>

  <!-- Background Grid -->
  <rect width="100%" height="100%" fill="#090D16"/>
  <rect width="100%" height="100%" fill="url(#bgGrid)"/>

  <!-- Top Header -->
  <g transform="translate(80, 50)">
    <rect x="0" y="0" width="1440" height="80" rx="16" fill="#131B2E" stroke="#1E293B" stroke-width="1.5" filter="url(#cardShadow)"/>
    <rect x="24" y="20" width="40" height="40" rx="10" fill="url(#primaryGrad)"/>
    <text x="36" y="47" font-size="22" font-weight="bold" fill="#FFFFFF">ML</text>
    <text x="78" y="44" font-size="24" font-weight="bold" fill="#F8FAFC">MandiLens — User &amp; Decision Workflow</text>
    <text x="78" y="65" font-size="13" fill="#94A3B8">End-to-End Decision Flow: Commodity Discovery → Deterministic Cost Subtraction → Grounded AI Verification → Counterparty Trade</text>
    <rect x="1270" y="26" width="144" height="28" rx="14" fill="#064E3B" stroke="#059669" stroke-width="1"/>
    <text x="1285" y="45" font-size="11" font-weight="600" fill="#34D399">DECIMAL-EXACT MATH</text>
  </g>

  <!-- Flow Steps Layout (5 Horizontal Stages) -->

  <!-- STEP 1: Discovery & Input -->
  <g transform="translate(80, 160)">
    <rect width="260" height="730" rx="16" fill="#0F172A" stroke="#1E293B" stroke-width="1.5" filter="url(#cardShadow)"/>
    <rect x="0" y="0" width="260" height="52" rx="16" fill="#1E293B"/>
    <rect x="16" y="14" width="24" height="24" rx="6" fill="url(#primaryGrad)"/>
    <text x="24" y="31" font-size="12" font-weight="bold" fill="#FFFFFF">1</text>
    <text x="50" y="32" font-size="15" font-weight="bold" fill="#F1F5F9">Input &amp; Discovery</text>

    <!-- Card 1.1 -->
    <rect x="16" y="70" width="228" height="135" rx="10" fill="#172236" stroke="#334155" stroke-width="1"/>
    <text x="28" y="96" font-size="13" font-weight="bold" fill="#38BDF8">Crop &amp; Volume</text>
    <text x="28" y="118" font-size="12" fill="#E2E8F0">• Commodity: Maize, Paddy, ...</text>
    <text x="28" y="138" font-size="12" fill="#E2E8F0">• Quantity: 50 Quintals</text>
    <text x="28" y="158" font-size="12" fill="#E2E8F0">• Unit: kg / quintal / tonne</text>
    <text x="28" y="186" font-size="10" fill="#94A3B8">Supports 8 primary Bihar crops</text>

    <!-- Card 1.2 -->
    <rect x="16" y="225" width="228" height="150" rx="10" fill="#172236" stroke="#334155" stroke-width="1"/>
    <text x="28" y="251" font-size="13" font-weight="bold" fill="#38BDF8">Location Context</text>
    <text x="28" y="273" font-size="12" fill="#E2E8F0">• Origin State: Bihar</text>
    <text x="28" y="293" font-size="12" fill="#E2E8F0">• District: Samastipur</text>
    <text x="28" y="313" font-size="12" fill="#E2E8F0">• Search Radius: Local APMCs</text>
    <text x="28" y="348" font-size="11" fill="#10B981">✓ Auto-detects nearby mandis</text>

    <!-- Card 1.3 -->
    <rect x="16" y="395" width="228" height="150" rx="10" fill="#172236" stroke="#334155" stroke-width="1"/>
    <text x="28" y="421" font-size="13" font-weight="bold" fill="#38BDF8">Comparison Mode</text>
    <text x="28" y="443" font-size="12" fill="#E2E8F0">• Strategy: Auto-pick top mandis</text>
    <text x="28" y="463" font-size="12" fill="#E2E8F0">• Manual market selection</text>
    <text x="28" y="483" font-size="12" fill="#E2E8F0">• Data mode: Real vs Demo</text>
    <text x="28" y="520" font-size="11" fill="#F59E0B">⚠️ Isolated demo &amp; real data</text>

    <!-- Callout Box -->
    <rect x="16" y="565" width="228" height="140" rx="10" fill="#1E293B" stroke="#059669" stroke-width="1"/>
    <text x="28" y="593" font-size="12" font-weight="bold" fill="#34D399">Farmer's Dilemma:</text>
    <text x="28" y="618" font-size="11" fill="#CBD5E1">"A distant mandi quotes ₹2,350</text>
    <text x="28" y="636" font-size="11" fill="#CBD5E1">while local mandi quotes ₹2,180.</text>
    <text x="28" y="654" font-size="11" fill="#CBD5E1">Which one actually puts more</text>
    <text x="28" y="672" font-size="11" font-weight="bold" fill="#FFFFFF">net cash in my pocket?"</text>
  </g>

  <!-- Connect 1 -> 2 -->
  <path d="M 340 300 L 375 300" stroke="#10B981" stroke-width="2.5" fill="none" marker-end="url(#arrow)"/>
  <path d="M 340 470 L 375 470" stroke="#10B981" stroke-width="2.5" fill="none" marker-end="url(#arrow)"/>

  <!-- STEP 2: Cost Modeling -->
  <g transform="translate(380, 160)">
    <rect width="260" height="730" rx="16" fill="#0F172A" stroke="#1E293B" stroke-width="1.5" filter="url(#cardShadow)"/>
    <rect x="0" y="0" width="260" height="52" rx="16" fill="#1E293B"/>
    <rect x="16" y="14" width="24" height="24" rx="6" fill="url(#primaryGrad)"/>
    <text x="23" y="31" font-size="12" font-weight="bold" fill="#FFFFFF">2</text>
    <text x="50" y="32" font-size="15" font-weight="bold" fill="#F1F5F9">Cost Parametrization</text>

    <!-- Card 2.1 -->
    <rect x="16" y="70" width="228" height="135" rx="10" fill="#172236" stroke="#334155" stroke-width="1"/>
    <text x="28" y="96" font-size="13" font-weight="bold" fill="#10B981">Transport Freight</text>
    <text x="28" y="118" font-size="12" fill="#E2E8F0">• Distance-based or flat rate</text>
    <text x="28" y="138" font-size="12" fill="#E2E8F0">• ₹1,200 (Samastipur local)</text>
    <text x="28" y="158" font-size="12" fill="#E2E8F0">• ₹3,400 (Distant APMC)</text>
    <text x="28" y="186" font-size="10" fill="#94A3B8">Tractor / small truck payload</text>

    <!-- Card 2.2 -->
    <rect x="16" y="225" width="228" height="150" rx="10" fill="#172236" stroke="#334155" stroke-width="1"/>
    <text x="28" y="251" font-size="13" font-weight="bold" fill="#10B981">Handling &amp; Labor</text>
    <text x="28" y="273" font-size="12" fill="#E2E8F0">• Loading charge: ₹400</text>
    <text x="28" y="293" font-size="12" fill="#E2E8F0">• Unloading charge: ₹400</text>
    <text x="28" y="313" font-size="12" fill="#E2E8F0">• Bagging / Weighing fees</text>
    <text x="28" y="348" font-size="11" fill="#94A3B8">Subtracted per market</text>

    <!-- Card 2.3 -->
    <rect x="16" y="395" width="228" height="150" rx="10" fill="#172236" stroke="#334155" stroke-width="1"/>
    <text x="28" y="421" font-size="13" font-weight="bold" fill="#10B981">APMC Statutory Fees</text>
    <text x="28" y="443" font-size="12" fill="#E2E8F0">• Mandi Cess / Market Fee: ₹250</text>
    <text x="28" y="463" font-size="12" fill="#E2E8F0">• Commission agent: 1.5%</text>
    <text x="28" y="483" font-size="12" fill="#E2E8F0">• Other local levies</text>
    <text x="28" y="520" font-size="11" fill="#38BDF8">Supports flat or % formulas</text>

    <!-- Formula Box -->
    <rect x="16" y="565" width="228" height="140" rx="10" fill="#1E293B" stroke="#3B82F6" stroke-width="1"/>
    <text x="28" y="593" font-size="12" font-weight="bold" fill="#60A5FA">Total Expenses T(m):</text>
    <text x="28" y="620" font-size="11" fill="#E2E8F0">T = Transport + Loading</text>
    <text x="28" y="640" font-size="11" fill="#E2E8F0">  + Unloading + Cess</text>
    <text x="28" y="660" font-size="11" fill="#E2E8F0">  + (Gross × Commission %)</text>
    <text x="28" y="685" font-size="10" fill="#94A3B8">Exact arithmetic — no rounding bias</text>
  </g>

  <!-- Connect 2 -> 3 -->
  <path d="M 640 380 L 675 380" stroke="#10B981" stroke-width="2.5" fill="none" marker-end="url(#arrow)"/>

  <!-- STEP 3: Deterministic Engine -->
  <g transform="translate(680, 160)">
    <rect width="260" height="730" rx="16" fill="#0F172A" stroke="#059669" stroke-width="2" filter="url(#cardShadow)"/>
    <rect x="0" y="0" width="260" height="52" rx="16" fill="url(#primaryGrad)"/>
    <rect x="16" y="14" width="24" height="24" rx="6" fill="#FFFFFF"/>
    <text x="23" y="31" font-size="12" font-weight="bold" fill="#065F46">3</text>
    <text x="50" y="32" font-size="15" font-weight="bold" fill="#FFFFFF">Deterministic Engine</text>

    <!-- Core Math Card -->
    <rect x="16" y="70" width="228" height="175" rx="10" fill="#172236" stroke="#10B981" stroke-width="1.5"/>
    <text x="28" y="96" font-size="13" font-weight="bold" fill="#34D399">Decimal.js Core</text>
    <text x="28" y="120" font-size="12" fill="#F8FAFC">Gross = Qty × Modal Price</text>
    <text x="28" y="142" font-size="12" font-weight="bold" fill="#10B981">Net = Gross − Total Expenses</text>
    <text x="28" y="168" font-size="11" fill="#CBD5E1">• Zero floating-point drift</text>
    <text x="28" y="188" font-size="11" fill="#CBD5E1">• Certified pure functions</text>
    <text x="28" y="208" font-size="11" fill="#CBD5E1">• 15+ automated unit tests</text>
    <text x="28" y="230" font-size="10" fill="#34D399">✓ Tested against edge values</text>

    <!-- Ranking Card -->
    <rect x="16" y="265" width="228" height="200" rx="10" fill="#172236" stroke="#334155" stroke-width="1"/>
    <text x="28" y="291" font-size="13" font-weight="bold" fill="#FBBF24">True Net Ranking</text>
    <text x="28" y="313" font-size="12" fill="#E2E8F0">1. Darbhanga APMC: ₹1,06,900</text>
    <text x="28" y="333" font-size="11" fill="#10B981">   🏆 Highest Realized Profit</text>
    <text x="28" y="358" font-size="12" fill="#E2E8F0">2. Begusarai APMC: ₹1,05,250</text>
    <text x="28" y="378" font-size="11" fill="#EF4444">   -₹1,650 vs best option</text>
    <text x="28" y="403" font-size="12" fill="#E2E8F0">3. Samastipur APMC: ₹98,800</text>
    <text x="28" y="423" font-size="11" fill="#EF4444">   -₹8,100 vs best option</text>
    <text x="28" y="450" font-size="10" fill="#94A3B8">Ranks by pocket money, not quote</text>

    <!-- Guardrails Card -->
    <rect x="16" y="485" width="228" height="220" rx="10" fill="#1E293B" stroke="#F59E0B" stroke-width="1"/>
    <text x="28" y="511" font-size="13" font-weight="bold" fill="#FBBF24">Integrity Guardrails</text>
    <text x="28" y="535" font-size="11" fill="#CBD5E1">• Freshness scoring (0-3d fresh)</text>
    <text x="28" y="555" font-size="11" fill="#CBD5E1">• Stale price warning flags</text>
    <text x="28" y="575" font-size="11" fill="#CBD5E1">• Missing assumptions alert</text>
    <text x="28" y="595" font-size="11" fill="#CBD5E1">• Record type isolation</text>
    <text x="28" y="625" font-size="11" font-weight="600" fill="#38BDF8">Rule of Grounding:</text>
    <text x="28" y="645" font-size="10" fill="#94A3B8">"The AI is never allowed to</text>
    <text x="28" y="663" font-size="10" fill="#94A3B8">override or compute arithmetic;</text>
    <text x="28" y="681" font-size="10" font-weight="bold" fill="#10B981">only the engine computes."</text>
  </g>

  <!-- Connect 3 -> 4 -->
  <path d="M 940 330 L 975 330" stroke="#38BDF8" stroke-width="2.5" fill="none" marker-end="url(#arrowSky)"/>
  <path d="M 940 540 L 975 540" stroke="#10B981" stroke-width="2.5" fill="none" marker-end="url(#arrow)"/>

  <!-- STEP 4: Grounded AI Copilot -->
  <g transform="translate(980, 160)">
    <rect width="260" height="730" rx="16" fill="#0F172A" stroke="#1E293B" stroke-width="1.5" filter="url(#cardShadow)"/>
    <rect x="0" y="0" width="260" height="52" rx="16" fill="#1E293B"/>
    <rect x="16" y="14" width="24" height="24" rx="6" fill="url(#skyGrad)"/>
    <text x="23" y="31" font-size="12" font-weight="bold" fill="#FFFFFF">4</text>
    <text x="50" y="32" font-size="15" font-weight="bold" fill="#F1F5F9">Grounded AI Copilot</text>

    <!-- NLU Intent -->
    <rect x="16" y="70" width="228" height="135" rx="10" fill="#172236" stroke="#334155" stroke-width="1"/>
    <text x="28" y="96" font-size="13" font-weight="bold" fill="#38BDF8">Natural Language Query</text>
    <text x="28" y="118" font-size="11" fill="#E2E8F0">"Which market pays the most for</text>
    <text x="28" y="136" font-size="11" fill="#E2E8F0">Maize in Samastipur right now?"</text>
    <text x="28" y="165" font-size="11" fill="#10B981">✓ Deterministic NLU Parser</text>
    <text x="28" y="185" font-size="10" fill="#94A3B8">Zero-hallucination intent resolution</text>

    <!-- Tool Execution Trace -->
    <rect x="16" y="225" width="228" height="165" rx="10" fill="#172236" stroke="#38BDF8" stroke-width="1"/>
    <text x="28" y="251" font-size="13" font-weight="bold" fill="#38BDF8">Validated Tool Call</text>
    <text x="28" y="273" font-size="11" font-family="monospace" fill="#34D399">tool: getMarketPrices()</text>
    <text x="28" y="293" font-size="11" fill="#E2E8F0">• Fetched 8 APMCs prices</text>
    <text x="28" y="313" font-size="11" fill="#E2E8F0">• Verified source &amp; dates</text>
    <text x="28" y="333" font-size="11" fill="#E2E8F0">• DedupeKey validated</text>
    <text x="28" y="365" font-size="10" fill="#38BDF8">Tool trace visible to user in UI</text>

    <!-- Provenance Banner -->
    <rect x="16" y="410" width="228" height="145" rx="10" fill="#1E293B" stroke="#059669" stroke-width="1"/>
    <text x="28" y="436" font-size="12" font-weight="bold" fill="#34D399">Transparency Banner</text>
    <text x="28" y="460" font-size="10" fill="#CBD5E1">"Produced by MandiLens</text>
    <text x="28" y="478" font-size="10" fill="#CBD5E1">deterministic mode: rule-based</text>
    <text x="28" y="496" font-size="10" fill="#CBD5E1">lookups &amp; exact calculations.</text>
    <text x="28" y="514" font-size="10" font-weight="bold" fill="#FFFFFF">Not generated by an AI model."</text>
    <text x="28" y="540" font-size="9" fill="#10B981">🛡️ Grounded in your data</text>

    <!-- Open-Weight Support -->
    <rect x="16" y="575" width="228" height="130" rx="10" fill="#172236" stroke="#818CF8" stroke-width="1"/>
    <text x="28" y="601" font-size="12" font-weight="bold" fill="#A5B4FC">Open-Weight Friendly</text>
    <text x="28" y="623" font-size="11" fill="#E2E8F0">• Ollama (gemma3:4b local)</text>
    <text x="28" y="643" font-size="11" fill="#E2E8F0">• Google AI Studio (Gemma 3)</text>
    <text x="28" y="663" font-size="11" fill="#E2E8F0">• Generic OpenAI-compatible</text>
    <text x="28" y="690" font-size="10" fill="#94A3B8">Runs 100% offline or cloud</text>
  </g>

  <!-- Connect 4 -> 5 -->
  <path d="M 1240 380 L 1275 380" stroke="#10B981" stroke-width="2.5" fill="none" marker-end="url(#arrow)"/>

  <!-- STEP 5: Execution & Action -->
  <g transform="translate(1280, 160)">
    <rect width="240" height="730" rx="16" fill="#0F172A" stroke="#1E293B" stroke-width="1.5" filter="url(#cardShadow)"/>
    <rect x="0" y="0" width="240" height="52" rx="16" fill="#1E293B"/>
    <rect x="16" y="14" width="24" height="24" rx="6" fill="url(#primaryGrad)"/>
    <text x="24" y="31" font-size="12" font-weight="bold" fill="#FFFFFF">5</text>
    <text x="50" y="32" font-size="15" font-weight="bold" fill="#F1F5F9">Market Action</text>

    <!-- Marketplace Listing -->
    <rect x="16" y="70" width="208" height="145" rx="10" fill="#172236" stroke="#334155" stroke-width="1"/>
    <text x="28" y="96" font-size="13" font-weight="bold" fill="#10B981">Post Marketplace Listing</text>
    <text x="28" y="118" font-size="12" fill="#E2E8F0">• Sell offer: 50Q Maize</text>
    <text x="28" y="138" font-size="12" fill="#E2E8F0">• Price: ₹2,180/quintal</text>
    <text x="28" y="158" font-size="12" fill="#E2E8F0">• Contact: In-App chat</text>
    <text x="28" y="195" font-size="10" fill="#38BDF8">Instant counterparty visibility</text>

    <!-- Inquiries & Trade -->
    <rect x="16" y="235" width="208" height="145" rx="10" fill="#172236" stroke="#334155" stroke-width="1"/>
    <text x="28" y="261" font-size="13" font-weight="bold" fill="#10B981">Inquiries &amp; Deals</text>
    <text x="28" y="283" font-size="12" fill="#E2E8F0">• Direct buyer inquiries</text>
    <text x="28" y="303" font-size="12" fill="#E2E8F0">• Quantity negotiation</text>
    <text x="28" y="323" font-size="12" fill="#E2E8F0">• In-app chat threads</text>
    <text x="28" y="360" font-size="10" fill="#94A3B8">Notification alert sent</text>

    <!-- Price Alerts -->
    <rect x="16" y="400" width="208" height="145" rx="10" fill="#172236" stroke="#F59E0B" stroke-width="1"/>
    <text x="28" y="426" font-size="13" font-weight="bold" fill="#FBBF24">Automated Price Alerts</text>
    <text x="28" y="448" font-size="12" fill="#E2E8F0">• Alert if Maize &gt; ₹2,200</text>
    <text x="28" y="468" font-size="12" fill="#E2E8F0">• Triggered on new ingestion</text>
    <text x="28" y="488" font-size="12" fill="#E2E8F0">• Never alerts twice (dedupe)</text>
    <text x="28" y="525" font-size="10" fill="#34D399">In-app &amp; email delivery</text>

    <!-- Saved Comparison -->
    <rect x="16" y="565" width="208" height="140" rx="10" fill="#172236" stroke="#818CF8" stroke-width="1"/>
    <text x="28" y="591" font-size="13" font-weight="bold" fill="#A5B4FC">Saved Comparison</text>
    <text x="28" y="613" font-size="12" fill="#E2E8F0">• Bookmark estimate</text>
    <text x="28" y="633" font-size="12" fill="#E2E8F0">• Re-evaluate with new prices</text>
    <text x="28" y="653" font-size="12" fill="#E2E8F0">• Track harvest timeline</text>
    <text x="28" y="685" font-size="10" fill="#94A3B8">Stored in User Dashboard</text>
  </g>

</svg>`;

// 2. Architecture Diagram SVG
const architectureSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000" style="background:#090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <defs>
    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10B981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <linearGradient id="skyGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="100%" stop-color="#0284C7"/>
    </linearGradient>
    <linearGradient id="amberGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBBF24"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
    <linearGradient id="purpleGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A855F7"/>
      <stop offset="100%" stop-color="#7E22CE"/>
    </linearGradient>
    <linearGradient id="indigoGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366F1"/>
      <stop offset="100%" stop-color="#4338CA"/>
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
    <pattern id="bgGridArch" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" stroke-width="0.8" opacity="0.4"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="#090D16"/>
  <rect width="100%" height="100%" fill="url(#bgGridArch)"/>

  <!-- Top Title Banner -->
  <g transform="translate(60, 40)">
    <rect width="1480" height="80" rx="16" fill="#131B2E" stroke="#1E293B" stroke-width="1.5" filter="url(#shadow)"/>
    <rect x="24" y="20" width="40" height="40" rx="10" fill="url(#brandGrad)"/>
    <text x="36" y="47" font-size="22" font-weight="bold" fill="#FFFFFF">ML</text>
    <text x="78" y="44" font-size="24" font-weight="bold" fill="#F8FAFC">MandiLens — Full System Architecture</text>
    <text x="78" y="66" font-size="13" fill="#94A3B8">Next.js 16 App Router · Deterministic Math Engine · Grounded Open-Weight AI · AGMARKNET Ingestion · MongoDB</text>
    <rect x="1310" y="26" width="144" height="28" rx="14" fill="#1E293B" stroke="#38BDF8" stroke-width="1"/>
    <text x="1328" y="45" font-size="11" font-weight="600" fill="#38BDF8">OPEN SOURCE AI</text>
  </g>

  <!-- TIER 1: Presentation & Client Layer -->
  <g transform="translate(60, 145)">
    <rect width="1480" height="145" rx="16" fill="#0F172A" stroke="#1E293B" stroke-width="1.5" filter="url(#shadow)"/>
    <rect x="0" y="0" width="220" height="32" rx="16" fill="#1E293B"/>
    <text x="16" y="21" font-size="12" font-weight="bold" fill="#38BDF8">TIER 1: PRESENTATION &amp; UI</text>

    <g transform="translate(20, 42)">
      <!-- Card 1: Public Explorers -->
      <rect x="0" y="0" width="265" height="85" rx="10" fill="#172236" stroke="#334155" stroke-width="1"/>
      <text x="14" y="24" font-size="13" font-weight="bold" fill="#F1F5F9">Public Explorers</text>
      <text x="14" y="44" font-size="11" fill="#94A3B8">Home (/), Commodities (/commodities)</text>
      <text x="14" y="62" font-size="11" fill="#94A3B8">Mandi Directory (/markets), Provenance</text>

      <!-- Card 2: Interactive Workbench -->
      <rect x="285" y="0" width="280" height="85" rx="10" fill="#172236" stroke="#059669" stroke-width="1.5"/>
      <text x="299" y="24" font-size="13" font-weight="bold" fill="#34D399">Compare Workbench</text>
      <text x="299" y="44" font-size="11" fill="#94A3B8">Multi-market net proceeds ranking</text>
      <text x="299" y="62" font-size="11" fill="#94A3B8">Expense inputs, unit conversion, trophies</text>

      <!-- Card 3: AI Copilot UI -->
      <rect x="585" y="0" width="270" height="85" rx="10" fill="#172236" stroke="#38BDF8" stroke-width="1.5"/>
      <text x="599" y="24" font-size="13" font-weight="bold" fill="#38BDF8">Grounded Copilot Interface</text>
      <text x="599" y="44" font-size="11" fill="#94A3B8">Natural language input + prompt chips</text>
      <text x="599" y="62" font-size="11" fill="#94A3B8">Tool trace drawer &amp; provenance badge</text>

      <!-- Card 4: Marketplace & Dashboard -->
      <rect x="875" y="0" width="280" height="85" rx="10" fill="#172236" stroke="#F59E0B" stroke-width="1"/>
      <text x="889" y="24" font-size="13" font-weight="bold" fill="#FBBF24">Marketplace &amp; User Area</text>
      <text x="889" y="44" font-size="11" fill="#94A3B8">Listings, Inquiries, Watchlists, Alerts</text>
      <text x="889" y="62" font-size="11" fill="#94A3B8">Saved comparisons &amp; Notifications</text>

      <!-- Card 5: Admin Console -->
      <rect x="1175" y="0" width="285" height="85" rx="10" fill="#172236" stroke="#A855F7" stroke-width="1"/>
      <text x="1189" y="24" font-size="13" font-weight="bold" fill="#C084FC">Admin Console</text>
      <text x="1189" y="44" font-size="11" fill="#94A3B8">Sources Sync, CSV 2-Phase Import</text>
      <text x="1189" y="62" font-size="11" fill="#94A3B8">Listing Moderation, Users &amp; Audit Log</text>
    </g>
  </g>

  <!-- TIER 2: API Gateway & Security -->
  <g transform="translate(60, 310)">
    <rect width="1480" height="135" rx="16" fill="#0F172A" stroke="#1E293B" stroke-width="1.5" filter="url(#shadow)"/>
    <rect x="0" y="0" width="260" height="32" rx="16" fill="#1E293B"/>
    <text x="16" y="21" font-size="12" font-weight="bold" fill="#A5B4FC">TIER 2: API &amp; APPLICATION GATEWAY</text>

    <g transform="translate(20, 42)">
      <rect x="0" y="0" width="345" height="75" rx="10" fill="#172236" stroke="#334155" stroke-width="1"/>
      <text x="14" y="24" font-size="13" font-weight="bold" fill="#F1F5F9">Next.js 16 Route Handlers</text>
      <text x="14" y="44" font-size="11" fill="#94A3B8">/api/compare, /api/compare/auto</text>
      <text x="14" y="60" font-size="11" fill="#94A3B8">/api/ai/chat, /api/commodities, /api/markets</text>

      <rect x="365" y="0" width="345" height="75" rx="10" fill="#172236" stroke="#334155" stroke-width="1"/>
      <text x="379" y="24" font-size="13" font-weight="bold" fill="#F1F5F9">Authentication &amp; Session</text>
      <text x="379" y="44" font-size="11" fill="#94A3B8">HS256 Signed JWTs in HttpOnly cookies</text>
      <text x="379" y="60" font-size="11" fill="#94A3B8">Bcrypt password hashing &amp; Role-based RBAC</text>

      <rect x="730" y="0" width="345" height="75" rx="10" fill="#172236" stroke="#334155" stroke-width="1"/>
      <text x="744" y="24" font-size="13" font-weight="bold" fill="#F1F5F9">Protection &amp; Rate Limiting</text>
      <text x="744" y="44" font-size="11" fill="#94A3B8">Sliding window memory rate limiter</text>
      <text x="744" y="60" font-size="11" fill="#94A3B8">CSRF Same-origin assertion &amp; Zod schemas</text>

      <rect x="1095" y="0" width="345" height="75" rx="10" fill="#172236" stroke="#334155" stroke-width="1"/>
      <text x="1109" y="24" font-size="13" font-weight="bold" fill="#F1F5F9">System Audit Logging</text>
      <text x="1109" y="44" font-size="11" fill="#94A3B8">Tamper-evident record of admin actions</text>
      <text x="1109" y="60" font-size="11" fill="#94A3B8">Ingestion runs, user creations, moderations</text>
    </g>
  </g>

  <!-- TIER 3: Core Decision Engine & AI Grounding (HIGHLIGHT) -->
  <g transform="translate(60, 465)">
    <rect width="1480" height="235" rx="16" fill="#0C1527" stroke="#059669" stroke-width="2" filter="url(#shadow)"/>
    <rect x="0" y="0" width="340" height="32" rx="16" fill="url(#brandGrad)"/>
    <text x="16" y="21" font-size="12" font-weight="bold" fill="#FFFFFF">TIER 3: CORE LOGIC &amp; GROUNDED AI ORCHESTRATION</text>

    <!-- Sub-Block 3A: Deterministic Engine -->
    <g transform="translate(25, 45)">
      <rect width="700" height="170" rx="12" fill="#131F33" stroke="#10B981" stroke-width="1.5"/>
      <text x="20" y="28" font-size="15" font-weight="bold" fill="#34D399">Deterministic Calculation Engine (Pure Arithmetic)</text>
      
      <rect x="20" y="42" width="205" height="110" rx="8" fill="#1A2942"/>
      <text x="30" y="64" font-size="12" font-weight="bold" fill="#F8FAFC">Decimal.js Precision</text>
      <text x="30" y="84" font-size="11" fill="#CBD5E1">• High-precision money</text>
      <text x="30" y="102" font-size="11" fill="#CBD5E1">• No floating point error</text>
      <text x="30" y="120" font-size="11" fill="#CBD5E1">• Exact INR computations</text>
      <text x="30" y="140" font-size="10" fill="#34D399">✓ 15+ unit tests passed</text>

      <rect x="245" y="42" width="205" height="110" rx="8" fill="#1A2942"/>
      <text x="255" y="64" font-size="12" font-weight="bold" fill="#F8FAFC">Unit Matrix</text>
      <text x="255" y="84" font-size="11" fill="#CBD5E1">• kg ↔ quintal ↔ tonne</text>
      <text x="255" y="102" font-size="11" fill="#CBD5E1">• Flat transport vs per-km</text>
      <text x="255" y="120" font-size="11" fill="#CBD5E1">• Labor &amp; loading charges</text>
      <text x="255" y="140" font-size="10" fill="#94A3B8">Strict base-unit normalization</text>

      <rect x="470" y="42" width="210" height="110" rx="8" fill="#1A2942"/>
      <text x="480" y="64" font-size="12" font-weight="bold" fill="#F8FAFC">Opportunity Engine</text>
      <text x="480" y="84" font-size="11" fill="#CBD5E1">• Gross = Qty × Modal Price</text>
      <text x="480" y="102" font-size="11" fill="#CBD5E1">• Net = Gross − Expenses</text>
      <text x="480" y="120" font-size="11" fill="#CBD5E1">• Gap to best ranking</text>
      <text x="480" y="140" font-size="10" fill="#FBBF24">Ranks by net realized profit</text>
    </g>

    <!-- Sub-Block 3B: Grounded AI Copilot Layer -->
    <g transform="translate(755, 45)">
      <rect width="700" height="170" rx="12" fill="#131F33" stroke="#38BDF8" stroke-width="1.5"/>
      <text x="20" y="28" font-size="15" font-weight="bold" fill="#38BDF8">Grounded AI Copilot &amp; NLU Orchestrator</text>

      <rect x="20" y="42" width="205" height="110" rx="8" fill="#1A2942"/>
      <text x="30" y="64" font-size="12" font-weight="bold" fill="#F8FAFC">Deterministic NLU</text>
      <text x="30" y="84" font-size="11" fill="#CBD5E1">• Rule-based entity parsing</text>
      <text x="30" y="102" font-size="11" fill="#CBD5E1">• Zero-hallucination default</text>
      <text x="30" y="120" font-size="11" fill="#CBD5E1">• Intent &amp; crop extractor</text>
      <text x="30" y="140" font-size="10" fill="#38BDF8">Never invents numbers</text>

      <rect x="245" y="42" width="205" height="110" rx="8" fill="#1A2942"/>
      <text x="255" y="64" font-size="12" font-weight="bold" fill="#F8FAFC">Tool Execution</text>
      <text x="255" y="84" font-size="11" fill="#CBD5E1">• getMarketPrices()</text>
      <text x="255" y="102" font-size="11" fill="#CBD5E1">• compareMarkets()</text>
      <text x="255" y="120" font-size="11" fill="#CBD5E1">• getPriceHistory()</text>
      <text x="255" y="140" font-size="10" fill="#34D399">Emits full tool trace in UI</text>

      <rect x="470" y="42" width="210" height="110" rx="8" fill="#1A2942"/>
      <text x="480" y="64" font-size="12" font-weight="bold" fill="#F8FAFC">Open Models</text>
      <text x="480" y="84" font-size="11" fill="#CBD5E1">• Google AI Studio Gemma 3</text>
      <text x="480" y="102" font-size="11" fill="#CBD5E1">• Local Ollama (gemma3:4b)</text>
      <text x="480" y="120" font-size="11" fill="#CBD5E1">• Pluggable OpenAI-compat</text>
      <text x="480" y="140" font-size="10" fill="#A78BFA">Vendor-agnostic runtime</text>
    </g>
  </g>

  <!-- TIER 4: Data Ingestion & Data Integrity -->
  <g transform="translate(60, 720)">
    <rect width="1480" height="120" rx="16" fill="#0F172A" stroke="#1E293B" stroke-width="1.5" filter="url(#shadow)"/>
    <rect x="0" y="0" width="260" height="32" rx="16" fill="#1E293B"/>
    <text x="16" y="21" font-size="12" font-weight="bold" fill="#FBBF24">TIER 4: INGESTION &amp; DATA PROVENANCE</text>

    <g transform="translate(20, 42)">
      <rect x="0" y="0" width="345" height="65" rx="10" fill="#172236" stroke="#334155" stroke-width="1"/>
      <text x="14" y="24" font-size="13" font-weight="bold" fill="#F1F5F9">AGMARKNET Open Data Adapter</text>
      <text x="14" y="44" font-size="11" fill="#94A3B8">data.gov.in Daily APMC API · Rate limiting &amp; Backoff</text>

      <rect x="365" y="0" width="345" height="65" rx="10" fill="#172236" stroke="#334155" stroke-width="1"/>
      <text x="379" y="24" font-size="13" font-weight="bold" fill="#F1F5F9">2-Phase CSV / JSON Importer</text>
      <text x="379" y="44" font-size="11" fill="#94A3B8">Upload → Schema Map → Dry Run Validation → Commit</text>

      <rect x="730" y="0" width="345" height="65" rx="10" fill="#172236" stroke="#334155" stroke-width="1"/>
      <text x="744" y="24" font-size="13" font-weight="bold" fill="#F1F5F9">Idempotent Deduplication Engine</text>
      <text x="744" y="44" font-size="11" fill="#94A3B8">Unique dedupeKey: source + market + crop + date</text>

      <rect x="1095" y="0" width="345" height="65" rx="10" fill="#172236" stroke="#334155" stroke-width="1"/>
      <text x="1109" y="24" font-size="13" font-weight="bold" fill="#F1F5F9">Strict Data Isolation Barrier</text>
      <text x="1109" y="44" font-size="11" fill="#94A3B8">Demo records flagged isDemo=true; never mixed silently</text>
    </g>
  </g>

  <!-- TIER 5: Persistence Layer -->
  <g transform="translate(60, 860)">
    <rect width="1480" height="105" rx="16" fill="#0F172A" stroke="#1E293B" stroke-width="1.5" filter="url(#shadow)"/>
    <rect x="0" y="0" width="220" height="32" rx="16" fill="#1E293B"/>
    <text x="16" y="21" font-size="12" font-weight="bold" fill="#10B981">TIER 5: PERSISTENCE (MONGODB)</text>

    <g transform="translate(20, 42)">
      <rect x="0" y="0" width="275" height="50" rx="8" fill="#172236" stroke="#334155"/>
      <text x="14" y="22" font-size="12" font-weight="bold" fill="#F8FAFC">MarketPrice &amp; History</text>
      <text x="14" y="38" font-size="10" fill="#94A3B8">Compound date &amp; dedupe indexes</text>

      <rect x="295" y="0" width="275" height="50" rx="8" fill="#172236" stroke="#334155"/>
      <text x="14" y="22" font-size="12" font-weight="bold" fill="#F8FAFC" transform="translate(295,0)">Market &amp; Commodity</text>
      <text x="14" y="38" font-size="10" fill="#94A3B8" transform="translate(295,0)">Normalized catalog &amp; slug indexes</text>

      <rect x="590" y="0" width="275" height="50" rx="8" fill="#172236" stroke="#334155"/>
      <text x="14" y="22" font-size="12" font-weight="bold" fill="#F8FAFC" transform="translate(590,0)">Listing &amp; Inquiry</text>
      <text x="14" y="38" font-size="10" fill="#94A3B8" transform="translate(590,0)">Text search &amp; counterparty matching</text>

      <rect x="885" y="0" width="275" height="50" rx="8" fill="#172236" stroke="#334155"/>
      <text x="14" y="22" font-size="12" font-weight="bold" fill="#F8FAFC" transform="translate(885,0)">PriceAlert &amp; Watchlist</text>
      <text x="14" y="38" font-size="10" fill="#94A3B8" transform="translate(885,0)">Trigger thresholds &amp; tracking</text>

      <rect x="1180" y="0" width="280" height="50" rx="8" fill="#172236" stroke="#334155"/>
      <text x="14" y="22" font-size="12" font-weight="bold" fill="#F8FAFC" transform="translate(1180,0)">User, Notification, Audit</text>
      <text x="14" y="38" font-size="10" fill="#94A3B8" transform="translate(1180,0)">Auth sessions, alerts, immutable log</text>
    </g>
  </g>

</svg>`;

// Write SVG files
fs.writeFileSync(path.join(DIAGRAMS_DIR, "flow.svg"), flowSvg);
fs.writeFileSync(path.join(ARTIFACTS_DIR, "flow.svg"), flowSvg);
console.log("✓ Saved diagrams/flow.svg");

fs.writeFileSync(path.join(DIAGRAMS_DIR, "architecture.svg"), architectureSvg);
fs.writeFileSync(path.join(ARTIFACTS_DIR, "architecture.svg"), architectureSvg);
console.log("✓ Saved diagrams/architecture.svg");

// 3. Flow Diagram Mermaid Markdown
const flowMermaid = `# MandiLens — Decision & User Workflow Diagram

\`\`\`mermaid
flowchart TD
  classDef startEnd fill:#064E3B,stroke:#059669,stroke-width:2px,color:#FFFFFF
  classDef step fill:#1E293B,stroke:#334155,stroke-width:1.5px,color:#F8FAFC
  classDef highlight fill:#0F291E,stroke:#10B981,stroke-width:2px,color:#34D399
  classDef ai fill:#0C243B,stroke:#38BDF8,stroke-width:2px,color:#7DD3FC
  classDef decision fill:#2A1B0E,stroke:#F59E0B,stroke-width:2px,color:#FDE68A

  Start([Farmer / Trader Arrives]):::startEnd --> Discovery[1. Select Commodity & Quantity<br/>e.g. Maize, 50 Quintals, Samastipur]:::step
  Discovery --> CostInput[2. Enter Operational Expenses<br/>Transport Freight, Loading, APMC Cess, Commission %]:::step
  
  CostInput --> DecisionMode{Comparison Mode}:::decision
  DecisionMode -->|Auto-Pick| AutoPick[Auto-query top reporting APMCs in District/State]:::step
  DecisionMode -->|Manual Selection| ManualPick[Select specific target markets from catalog]:::step

  AutoPick --> Engine
  ManualPick --> Engine

  subgraph Engine["3. Deterministic Opportunity Engine (Pure Decimal.js)"]
    direction TB
    UnitConv[Unit Matrix Normalization<br/>kg ↔ quintal ↔ tonne]:::highlight
    GrossCalc[Gross Sale Value = Qty × Modal Price]:::highlight
    ExpenseCalc[Total Deductions = Freight + Labor + Fees + Commission]:::highlight
    NetCalc[Net Proceeds = Gross − Total Deductions]:::highlight
    RankCalc[Rank Candidate Mandis by True Net Proceeds]:::highlight
    UnitConv --> GrossCalc --> ExpenseCalc --> NetCalc --> RankCalc
  end

  Engine --> RankingOutput[4. Display Ranked Workbench<br/>🏆 Winner Trophy, Net Proceeds, Gap to Runner-Up, Assumptions]:::step

  RankingOutput --> DecisionPath{Action Path}:::decision
  
  DecisionPath -->|Consult Assistant| Copilot[5. Grounded AI Copilot<br/>Deterministic NLU → Database Tool Call → Tool Trace & Provenance Banner]:::ai
  DecisionPath -->|Trade / Sell| Marketplace[6. Post Buy/Sell Listing on Marketplace<br/>Find counterparties & negotiate in-app]:::step
  DecisionPath -->|Track Price| Alerts[7. Configure Price Alert & Watchlist<br/>Receive notifications when threshold crossed]:::step
  DecisionPath -->|Bookmark| Saved[8. Save Comparison to Dashboard<br/>Track harvest decision over time]:::step

  Copilot --> ActionDone([Informed Trading Decision]):::startEnd
  Marketplace --> ActionDone
  Alerts --> ActionDone
  Saved --> ActionDone
\`\`\`
`;

// 4. Architecture Diagram Mermaid Markdown
const architectureMermaid = `# MandiLens — System Architecture Diagram

\`\`\`mermaid
flowchart TB
  classDef client fill:#172554,stroke:#3B82F6,stroke-width:1.5px,color:#DBEAFE
  classDef api fill:#1E1B4B,stroke:#6366F1,stroke-width:1.5px,color:#E0E7FF
  classDef core fill:#064E3B,stroke:#10B981,stroke-width:2px,color:#A7F3D0
  classDef ai fill:#0C243B,stroke:#38BDF8,stroke-width:2px,color:#BAE6FD
  classDef data fill:#2D1500,stroke:#F59E0B,stroke-width:1.5px,color:#FEF3C7
  classDef db fill:#022C22,stroke:#059669,stroke-width:1.5px,color:#6EE7B7

  subgraph ClientTier["Tier 1: Client & Presentation Layer (Next.js 16 + React 19)"]
    direction LR
    Home[Public Explorers<br/>Home, Catalog, Markets]:::client
    Workbench[Compare Workbench<br/>Interactive Net Calculator]:::client
    CopilotUI[Grounded Copilot<br/>NLU Chat + Tool Traces]:::client
    DashboardUI[Farmer/Trader Dashboard<br/>Alerts, Watchlists, Inquiries]:::client
    AdminUI[Admin Console<br/>Ingestion, Imports, Moderation]:::client
  end

  subgraph GatewayTier["Tier 2: API Gateway & Application Handlers"]
    direction LR
    Routes[Next.js App Router API Routes<br/>/api/compare, /api/ai/chat, /api/catalog]:::api
    Auth[First-Party Auth<br/>HS256 JWT in HttpOnly Cookie]:::api
    RateLimit[Sliding Window Rate Limiter<br/>Sliding Memory Token Bucket]:::api
    AuditLogService[Tamper-Evident Audit Trail<br/>Actor, action, timestamp, metadata]:::api
  end

  subgraph LogicTier["Tier 3: Core Business & AI Orchestration Layer"]
    subgraph DeterministicEngine["Deterministic Opportunity Engine"]
      DecimalJS[Decimal.js Money Engine<br/>Exact decimal arithmetic]:::core
      UnitConv[Unit Matrix Normalization<br/>kg / quintal / tonne]:::core
      NetFormula[Gross − (Transport + Handling + Cess + Commission)]:::core
    end

    subgraph GroundedCopilot["Grounded AI Copilot Layer"]
      NLU[Deterministic NLU Parser<br/>Entity & Intent Resolver]:::ai
      ToolsReg[Tool Execution Registry<br/>getMarketPrices, compareMarkets, freshness]:::ai
      Models[Open-Weight Providers<br/>Ollama local / Google AI Studio Gemma / OpenAI-compat]:::ai
    end
  end

  subgraph IngestionTier["Tier 4: Data Ingestion & Integrity Pipeline"]
    direction LR
    Agmarknet[AGMARKNET Adapter<br/>data.gov.in API with retry]:::data
    CSVImporter[2-Phase CSV/JSON Importer<br/>Upload → Validation Dry Run → Commit]:::data
    Dedupe[Deduplication Engine<br/>Deterministic dedupeKey]:::data
    Isolation[Data Isolation Barrier<br/>Demo dataset partitioned from real quotes]:::data
  end

  subgraph StorageTier["Tier 5: Database Layer (MongoDB)"]
    direction LR
    PricesCol[(MarketPrices<br/>Dedupe index, date index)]:::db
    CatalogCol[(Markets &amp; Commodities<br/>Slugs, text index)]:::db
    ListingsCol[(Listings &amp; Inquiries<br/>Trades &amp; negotiations)]:::db
    UserCol[(Users, Alerts, Watchlists<br/>Auth &amp; preferences)]:::db
  end

  ClientTier --> GatewayTier
  GatewayTier --> LogicTier
  LogicTier --> StorageTier
  IngestionTier --> StorageTier
  DeterministicEngine -.->|Supplies verified figures| GroundedCopilot
\`\`\`
`;

fs.writeFileSync(path.join(DIAGRAMS_DIR, "flow.md"), flowMermaid);
fs.writeFileSync(path.join(ARTIFACTS_DIR, "flow.md"), flowMermaid);
console.log("✓ Saved diagrams/flow.md");

fs.writeFileSync(path.join(DIAGRAMS_DIR, "architecture.md"), architectureMermaid);
fs.writeFileSync(path.join(ARTIFACTS_DIR, "architecture.md"), architectureMermaid);
console.log("✓ Saved diagrams/architecture.md");

console.log("\nDiagrams generated successfully in ./diagrams and artifact directory!");
