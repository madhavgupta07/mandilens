"""Render a Ken Burns product walkthrough with AI voiceover, animations, and diagrams.

Generates a fully narrated, 1080p 24fps MP4 video showcasing the MandiLens platform.
Includes:
  - Natural Indian English neural voiceover via edge-tts (en-IN-NeerjaNeural).
  - Dynamic scene duration scaling matching spoken audio.
  - Ken Burns pan and zoom camera motions with smooth cubic easing.
  - Cross-fade scene blending and seamless audio cross-transitions.
  - Animated top progress bar, walkthrough chapter cards, and lower-third overlays.
  - Interactive click ripple indicators on key user action points.

Usage:
  python scripts/generate-demo-video.py
"""

from __future__ import annotations

import asyncio
import hashlib
import math
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import edge_tts
import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "screenshots"
DIAGRAMS = ROOT / "diagrams"
OUT_DIR = ROOT / "demo"
OUT_PATH = OUT_DIR / "MandiLens-How-To-Use.mp4"
VOICE_DIR = OUT_DIR / "voice"
VIDEO_TMP = OUT_DIR / "_video_silent.mp4"
AUDIO_TMP = OUT_DIR / "_narration.m4a"

W, H = 1920, 1080
FPS = 24
FADE = 10  # crossfade frames between consecutive scenes
VOICE_NAME = "en-IN-NeerjaNeural"
VOICE_FALLBACK = "en-US-JennyNeural"
VOICE_RATE = "-4%"

INK = (20, 36, 28)
INK_SOFT = (55, 72, 62)
CREAM = (246, 243, 232)
FOREST = (21, 107, 58)
FOREST_DEEP = (13, 61, 36)
NAVY = (10, 18, 28)
WHITE = (255, 255, 255)
GOLD = (245, 201, 92)
MUTED = (120, 136, 124)

FONT_REG = Path(r"C:\Windows\Fonts\segoeui.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\segoeuib.ttf")
FONT_FALLBACK = Path(r"C:\Windows\Fonts\arial.ttf")


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_BOLD if bold and FONT_BOLD.exists() else FONT_REG
    if not path.exists():
        path = FONT_FALLBACK
    return ImageFont.truetype(str(path), size)


def ease(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        trial = word if not cur else f"{cur} {word}"
        if draw.textlength(trial, font=fnt) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines or [""]


@dataclass
class Click:
    x: float  # normalized 0.0 - 1.0
    y: float  # normalized 0.0 - 1.0
    label: str = ""
    at: float = 0.50  # fraction of scene duration where click triggers


@dataclass
class Scene:
    kind: str  # title | chapter | shot | diagram
    duration: float
    title: str
    subtitle: str = ""
    image: Path | None = None
    motion: str = "zoom_in"  # zoom_in | zoom_out | pan_down | hold
    step: str = ""
    caption: str = ""
    voice: str = ""
    clicks: list[Click] = field(default_factory=list)
    voice_file: Path | None = None
    audio_duration: float = 0.0


def storyboard() -> list[Scene]:
    s = SHOTS
    d = DIAGRAMS
    return [
        Scene(
            "title",
            5.2,
            "MandiLens",
            "How to compare mandi prices, keep more of the sale, and act with grounded AI.",
            voice="Welcome to MandiLens, the open-source market intelligence platform helping farmers and traders compare mandis, deduct real transport costs, and make smarter crop sales.",
        ),
        Scene(
            "chapter",
            3.0,
            "How it is built",
            "Open-source AI market intelligence for farmers and traders.",
            step="01",
            voice="Let's begin with the system design and how MandiLens works under the hood.",
        ),
        Scene(
            "diagram",
            6.5,
            "System architecture",
            "Client → API → deterministic engine + grounded copilot → MongoDB, with AGMARKNET ingestion.",
            d / "architecture.png",
            "zoom_in",
            "01 · Architecture",
            "Five tiers: UI, API gateway, exact money maths, data ingestion, and storage.",
            voice="The architecture spans four core layers: a responsive Next.js frontend, a secure API layer, a deterministic arithmetic engine with a grounded AI copilot, and persistent MongoDB storage connected to AGMARKNET feeds.",
        ),
        Scene(
            "diagram",
            6.5,
            "How you use it",
            "Pick a crop → add costs → rank mandis by net proceeds → ask Copilot, list, or alert.",
            d / "flow.png",
            "zoom_in",
            "01 · Workflow",
            "Net proceeds are always Gross minus expenses. The AI never overwrites the arithmetic.",
            voice="The user flow is straightforward: select your commodity, enter quantity and transport expenses, let the engine calculate net take-home earnings, and connect with buyers.",
        ),
        Scene(
            "chapter",
            3.0,
            "Start on the landing page",
            "Enter a commodity, quantity and unit — then compare markets.",
            step="02",
            voice="Now let's step onto the public landing page.",
        ),
        Scene(
            "shot",
            5.8,
            "Landing",
            "Find the market that puts more money in your pocket.",
            s / "01_landing_hero.png",
            "zoom_in",
            "02 · Home",
            "Type crop and quantity, then click Compare markets — or Ask the AI Copilot.",
            voice="The homepage features a live mandi price ticker and a direct workbench shortcut. You can enter your crop and quantity, compare markets, or ask the AI copilot.",
        ),
        Scene(
            "shot",
            6.5,
            "Why this exists",
            "Published prices hide the cost of reaching them.",
            s / "02_landing_full.png",
            "pan_down",
            "02 · Home",
            "Scroll the landing page for the problem, the maths, and the provenance promise.",
            voice="Scrolling down reveals the core problem: published headline prices hide transport and loading expenses. MandiLens reveals what farmers actually keep in their pockets.",
        ),
        Scene(
            "chapter",
            3.0,
            "Explore commodities & markets",
            "Browse the catalogue before you run a comparison.",
            step="03",
            voice="Next, let's browse the directory of tracked crops and APMC mandis.",
        ),
        Scene(
            "shot",
            5.5,
            "Commodities directory",
            "Open Commodities in the top nav to pick a crop.",
            s / "07_commodities_directory.png",
            "zoom_in",
            "03 · Commodities",
            "Search or scroll the directory, then open a crop such as Maize.",
            voice="The commodities directory lists all actively monitored crops, including maize, wheat, paddy, potato, and mustard, with current modal price ranges.",
        ),
        Scene(
            "shot",
            5.8,
            "Commodity detail — Maize",
            "See sourced prices, units, and freshness for one crop.",
            s / "08_commodity_detail_maize.png",
            "zoom_out",
            "03 · Commodities",
            "Use this page to confirm which mandis actually report that crop.",
            voice="Opening a crop like Maize displays thirty-day price movement charts, modal prices, and all mandis currently reporting prices.",
        ),
        Scene(
            "shot",
            5.5,
            "Markets directory",
            "Open Markets to browse APMCs by name and district.",
            s / "09_markets_directory.png",
            "zoom_in",
            "03 · Markets",
            "Pick a mandi you can actually reach — e.g. Samastipur APMC.",
            voice="The markets directory helps farmers find nearby APMC mandis filtered by district and state, showing report freshness and active trading status.",
        ),
        Scene(
            "shot",
            5.8,
            "Market detail — Samastipur",
            "Inspect that mandi’s reported commodities and dates.",
            s / "10_market_detail_samastipur.png",
            "zoom_out",
            "03 · Markets",
            "Every quote keeps its source and source-reported date.",
            voice="Each market page shows reported commodities, arrival volumes, modal prices, and the exact date the data was recorded.",
        ),
        Scene(
            "chapter",
            3.0,
            "Run a comparison",
            "The flagship tool: rank mandis by what you actually keep.",
            step="04",
            voice="Now let's examine MandiLens's flagship feature: the Compare Workbench.",
        ),
        Scene(
            "shot",
            6.2,
            "Compare workbench — set the deal",
            "Commodity, quantity, unit, and real vs demo data.",
            s / "03_compare_workbench_form.png",
            "zoom_in",
            "04 · Compare",
            "Fill the form, add freight and fees if known, then click Estimate.",
            voice="Farmers select a crop, enter their harvest quantity, and input custom freight, loading, and market cess fees to model real transport costs.",
            clicks=[Click(0.20, 0.52, "Estimate", at=0.55)],
        ),
        Scene(
            "shot",
            6.8,
            "Ranked net proceeds",
            "Begusarai APMC wins on net — not on the headline quote.",
            s / "04_compare_calculated_results.png",
            "zoom_in",
            "04 · Compare",
            "Read Best estimated net proceeds, then scan Ranking by net proceeds.",
            voice="With one click, the engine ranks markets by net proceeds. Here, Begusarai APMC wins on net earnings, beating out other mandis with lower transit friction.",
        ),
        Scene(
            "shot",
            5.8,
            "Methodology — the proof",
            "Open the calculation so every rupee is inspectable.",
            s / "15_methodology_calculation_proof.png",
            "zoom_out",
            "04 · Proof",
            "Gross = qty × modal price. Net = gross − transport, labour, cess, commission.",
            voice="Our methodology page provides full mathematical transparency. Every rupee is calculated using exact decimal arithmetic with zero rounding error.",
        ),
        Scene(
            "shot",
            5.8,
            "Data integrity",
            "Demo data is labelled. Real and demo are never mixed silently.",
            s / "16_data_integrity_provenance.png",
            "zoom_in",
            "04 · Provenance",
            "Check source, fetched-at, and DEMO badges before you trust a number.",
            voice="MandiLens guarantees data integrity. Official reported prices and demo records are strictly segregated and never silently mixed.",
        ),
        Scene(
            "chapter",
            3.0,
            "Ask the grounded Copilot",
            "Plain-language questions. Tool-traced answers. No invented prices.",
            step="05",
            voice="When you have complex questions, the MandiLens AI Copilot is ready to assist.",
        ),
        Scene(
            "shot",
            5.8,
            "AI Copilot",
            "Open AI Copilot from the top nav.",
            s / "05_ai_copilot_overview.png",
            "zoom_in",
            "05 · Copilot",
            "Ask plain language questions about prices and net earnings.",
            voice="The Copilot accepts plain-language prompts and executes validated database tools to fetch real market prices rather than guessing.",
            clicks=[Click(0.48, 0.38, "Compare Prompt", at=0.50)],
        ),
        Scene(
            "shot",
            6.8,
            "Grounded response",
            "Figures come from database tools and the same comparison engine.",
            s / "06_ai_copilot_grounded_response.png",
            "zoom_out",
            "05 · Copilot",
            "Read the provenance banner, missing-cost warnings, and the tool trace.",
            voice="Every response includes exact figures, a breakdown of missing cost assumptions, and an expandable data tool trace for full auditability.",
        ),
        Scene(
            "chapter",
            3.0,
            "Trade on the marketplace",
            "Post buy and sell offers and talk to counterparties.",
            step="06",
            voice="MandiLens also connects farmers directly to buyers through a peer-to-peer marketplace.",
        ),
        Scene(
            "shot",
            5.6,
            "Marketplace listings",
            "Open Marketplace to see live buy and sell offers.",
            s / "11_marketplace_listings.png",
            "zoom_in",
            "06 · Marketplace",
            "Filter by crop, then open a listing or start an inquiry.",
            voice="The marketplace displays active buy and sell listings with transparent crop grades, quantities, locations, and price expectations.",
        ),
        Scene(
            "shot",
            5.6,
            "Create a listing",
            "Post what you want to sell or buy.",
            s / "12_marketplace_create_listing.png",
            "zoom_out",
            "06 · Marketplace",
            "Set crop, quantity, price, and contact — then publish the offer.",
            voice="Growers can post a new harvest listing in seconds, specifying commodity grade, available volume, and preferred delivery terms.",
        ),
        Scene(
            "shot",
            4.6,
            "Sign in",
            "Accounts unlock dashboard, alerts, and inquiries.",
            s / "13_auth_login.png",
            "hold",
            "06 · Account",
            "Use Sign in if you already have a MandiLens account.",
            voice="Users can sign in securely using demo accounts or their registered email to access personalized alerts and tools.",
        ),
        Scene(
            "shot",
            4.6,
            "Register",
            "Create a farmer, trader, or buyer profile.",
            s / "14_auth_register.png",
            "hold",
            "06 · Account",
            "Click Get started → Register to create your profile.",
            voice="New users can quickly register as a farmer, trader, or buyer to join the platform.",
        ),
        Scene(
            "chapter",
            3.0,
            "Your farmer workspace",
            "After login: dashboard, watchlists, alerts, chat, saved work.",
            step="07",
            voice="Logging in unlocks a comprehensive personal workspace.",
        ),
        Scene(
            "shot",
            5.8,
            "Farmer dashboard",
            "See listings, inquiries, alerts, and shortcuts in one place.",
            s / "17_farmer_dashboard.png",
            "zoom_in",
            "07 · Dashboard",
            "Use Quick actions to run a comparison, ask Copilot, or post a listing.",
            voice="The farmer dashboard brings together active listings, price alerts, message threads, and quick comparison shortcuts in one unified view.",
        ),
        Scene(
            "shot",
            5.2,
            "Watchlists",
            "Pin crops and mandis you care about.",
            s / "18_farmer_watchlists.png",
            "zoom_out",
            "07 · Watchlists",
            "Add a watchlist so returning to those prices is one click.",
            voice="Custom watchlists allow farmers to follow key crops and mandis to track daily price fluctuations at a glance.",
        ),
        Scene(
            "shot",
            5.5,
            "Price alerts",
            "Get notified when a threshold is crossed.",
            s / "19_farmer_price_alerts.png",
            "zoom_in",
            "07 · Alerts",
            "Set crop, market, and a price level — MandiLens watches new reports.",
            voice="Farmers can configure price threshold alerts to be notified the moment a mandi hits their target selling rate.",
        ),
        Scene(
            "shot",
            5.8,
            "Inquiries & chat",
            "Negotiate a listing without leaving the app.",
            s / "20_farmer_inquiries_chat.png",
            "zoom_out",
            "07 · Inquiries",
            "Open Inquiries, pick a thread, and message the counterparty.",
            voice="The integrated chat interface enables buyers and sellers to negotiate deals and finalize terms without leaving the application.",
        ),
        Scene(
            "shot",
            5.0,
            "Notifications",
            "Alerts, replies, and system events land here.",
            s / "21_farmer_notifications.png",
            "hold",
            "07 · Notifications",
            "Check the bell when a price alert or inquiry reply arrives.",
            voice="The notification center provides real-time alerts whenever a target price is reached or a buyer sends an inquiry.",
        ),
        Scene(
            "shot",
            5.5,
            "Saved comparisons",
            "Bookmark a harvest decision and reopen it later.",
            s / "22_farmer_saved_comparisons.png",
            "zoom_in",
            "07 · Saved",
            "From Compare results, save the run — it appears on this tab.",
            voice="Farmers can save their market comparisons to re-run and evaluate changing prices throughout the harvest season.",
        ),
        Scene(
            "chapter",
            3.0,
            "Admin console",
            "For operators: sources, imports, moderation, audit.",
            step="08",
            voice="For administrators and market authorities, MandiLens provides robust back-office tools.",
        ),
        Scene(
            "shot",
            5.5,
            "Admin overview",
            "Health of data, users, and marketplace at a glance.",
            s / "23_admin_overview.png",
            "zoom_in",
            "08 · Admin",
            "Sign in as an administrator to open the console.",
            voice="The admin overview monitors platform health, ingestion statistics, total registered users, and active listings.",
        ),
        Scene(
            "shot",
            5.5,
            "Data sources",
            "AGMARKNET and other adapters live here.",
            s / "24_admin_data_sources.png",
            "zoom_out",
            "08 · Sources",
            "Enable a source and run ingestion when you have an API key.",
            voice="The data sources panel manages connections to official data providers like AGMARKNET and controls background synchronization.",
        ),
        Scene(
            "shot",
            5.8,
            "CSV / JSON imports",
            "Two-phase import: dry-run validation, then commit.",
            s / "25_admin_csv_imports.png",
            "zoom_in",
            "08 · Imports",
            "Upload a file, map columns, review errors, then commit.",
            voice="A two-phase import pipeline validates bulk CSV and JSON files with dry-run error checking before committing records to the database.",
        ),
        Scene(
            "shot",
            5.4,
            "Moderation",
            "Review marketplace listings before they mislead traders.",
            s / "26_admin_moderation.png",
            "hold",
            "08 · Moderation",
            "Approve, reject, or take down listings that break the rules.",
            voice="The moderation queue allows administrators to inspect, approve, or reject marketplace posts to keep trade honest and verified.",
        ),
        Scene(
            "shot",
            5.2,
            "Users",
            "Manage farmer, trader, and admin accounts.",
            s / "27_admin_users.png",
            "zoom_in",
            "08 · Users",
            "Search users and adjust roles from this table.",
            voice="User management gives operators granular control over accounts, user roles, and access permissions.",
        ),
        Scene(
            "shot",
            5.5,
            "Audit log",
            "Tamper-evident trail of who did what, and when.",
            s / "28_admin_audit_log.png",
            "zoom_out",
            "08 · Audit",
            "Use this when you need to explain a data or moderation change.",
            voice="An immutable audit log captures every system update, price ingestion, and administrative decision for complete accountability.",
        ),
        Scene(
            "title",
            5.5,
            "Start comparing",
            "pnpm seed:demo · pnpm dev · open localhost:3000 — MIT licensed, open models welcome.",
            voice="MandiLens is fully open source under the MIT license. Check it out on GitHub and start comparing markets today!",
        ),
    ]


def load_cover_bitmap(path: Path, extra: float = 1.14) -> Image.Image:
    im = Image.open(path).convert("RGB")
    target_w, target_h = int(W * extra), int(H * extra)
    scale = max(target_w / im.width, target_h / im.height)
    nw, nh = max(1, int(im.width * scale)), max(1, int(im.height * scale))
    return im.resize((nw, nh), Image.Resampling.LANCZOS)


def sample_motion(src: Image.Image, t: float, motion: str) -> Image.Image:
    e = ease(t)
    sw, sh = src.size
    if motion == "pan_down":
        max_y = max(0, sh - H)
        y = int(max_y * e)
        x = max(0, (sw - W) // 2)
        return src.crop((x, y, x + W, y + H))
    if motion == "hold":
        zoom = 1.04
    elif motion == "zoom_out":
        zoom = 1.12 - 0.08 * e
    else:
        zoom = 1.0 + 0.10 * e
    cw, ch = int(W * zoom), int(H * zoom)
    cw = min(cw, sw)
    ch = min(ch, sh)
    x = (sw - cw) // 2
    y = (sh - ch) // 2
    if motion == "zoom_in":
        x = int((sw - cw) * (0.42 + 0.16 * e))
        y = int((sh - ch) * (0.28 + 0.18 * e))
    elif motion == "zoom_out":
        x = int((sw - cw) * (0.58 - 0.16 * e))
        y = int((sh - ch) * (0.40 - 0.12 * e))
    x = max(0, min(x, sw - cw))
    y = max(0, min(y, sh - ch))
    crop = src.crop((x, y, x + cw, y + ch))
    if crop.size != (W, H):
        crop = crop.resize((W, H), Image.Resampling.BILINEAR)
    return crop


def rounded_rect(draw: ImageDraw.ImageDraw, box, fill, radius: int) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def draw_progress(draw: ImageDraw.ImageDraw, progress: float) -> None:
    draw.rectangle([0, 0, W, 6], fill=(20, 40, 28))
    draw.rectangle([0, 0, int(W * progress), 6], fill=FOREST)


def draw_click_indicator(draw: ImageDraw.ImageDraw, click: Click, local_t: float) -> None:
    dt = local_t - click.at
    # animate ripple for 0.15 normalized duration window
    if 0.0 <= dt <= 0.15:
        rt = dt / 0.15
        px = int(click.x * W)
        py = int(click.y * H)
        rad = int(8 + 36 * ease(rt))
        # Outer ring
        draw.ellipse([px - rad, py - rad, px + rad, py + rad], outline=(16, 185, 129), width=3)
        # Inner core dot
        draw.ellipse([px - 5, py - 5, px + 5, py + 5], fill=(16, 185, 129))


def render_title(scene: Scene, progress: float) -> Image.Image:
    img = Image.new("RGB", (W, H), NAVY)
    draw = ImageDraw.Draw(img)
    # soft grid
    for x in range(0, W, 48):
        draw.line([(x, 0), (x, H)], fill=(18, 32, 44), width=1)
    for y in range(0, H, 48):
        draw.line([(0, y), (W, y)], fill=(18, 32, 44), width=1)
    draw.ellipse([1180, -220, 2100, 700], fill=(16, 48, 36))
    draw.ellipse([-200, 640, 720, 1280], fill=(14, 36, 30))
    kicker = font(22, True)
    title_f = font(92, True)
    sub_f = font(32, False)
    draw.text((160, 280), "OPEN SOURCE  ·  OPEN DATA  ·  OPEN MODELS", font=kicker, fill=GOLD)
    draw.text((160, 360), scene.title, font=title_f, fill=WHITE)
    for i, line in enumerate(wrap(draw, scene.subtitle, sub_f, 1280)):
        draw.text((160, 500 + i * 48), line, font=sub_f, fill=(196, 214, 204))
    draw.rounded_rectangle([160, 720, 520, 786], radius=28, fill=FOREST)
    draw.text((214, 736), "How to use MandiLens", font=font(22, True), fill=WHITE)
    draw.text((160, 980), "Hacktoberfest 2026  ·  Side Hustle  ·  MIT", font=font(20), fill=MUTED)
    draw_progress(draw, progress)
    return img


def render_chapter(scene: Scene, progress: float) -> Image.Image:
    img = Image.new("RGB", (W, H), CREAM)
    draw = ImageDraw.Draw(img)
    for x in range(0, W, 40):
        draw.line([(x, 0), (x, H)], fill=(236, 232, 216), width=1)
    draw.rectangle([0, 0, 18, H], fill=FOREST)
    draw.rounded_rectangle([140, 300, 280, 380], radius=18, fill=FOREST)
    draw.text((168, 318), scene.step or "•", font=font(36, True), fill=WHITE)
    draw.text((310, 318), "WALKTHROUGH", font=font(22, True), fill=FOREST)
    draw.text((140, 420), scene.title, font=font(64, True), fill=INK)
    for i, line in enumerate(wrap(draw, scene.subtitle, font(30), 1400)):
        draw.text((140, 530 + i * 46), line, font=font(30), fill=INK_SOFT)
    draw_progress(draw, progress)
    return img


def fit_diagram(src: Image.Image) -> Image.Image:
    canvas = Image.new("RGB", (W, H), (8, 14, 24))
    margin = 36
    box_w, box_h = W - margin * 2, H - 168
    scale = min(box_w / src.width, box_h / src.height)
    nw, nh = int(src.width * scale), int(src.height * scale)
    fitted = src.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (W - nw) // 2
    y = 72 + (box_h - nh) // 2
    canvas.paste(fitted, (x, y))
    return canvas


_overlay_cache: dict[str, Image.Image] = {}


def caption_overlay(scene: Scene) -> Image.Image:
    key = f"{scene.title}|{scene.step}|{scene.caption}|{scene.subtitle}"
    if key in _overlay_cache:
        return _overlay_cache[key]
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    shade = Image.new("RGBA", (W, 320), (8, 16, 12, 0))
    sd = ImageDraw.Draw(shade)
    for y in range(320):
        a = int(210 * (y / 319) ** 1.35)
        sd.line([(0, y), (W, y)], fill=(8, 16, 12, a))
    overlay.alpha_composite(shade, (0, H - 320))
    card_y = H - 168
    rounded_rect(d, [48, card_y, W - 48, H - 28], (255, 255, 255, 235), 22)
    if scene.step:
        chip_w = int(d.textlength(scene.step, font=font(18, True)) + 28)
        rounded_rect(d, [72, card_y + 22, 72 + chip_w, card_y + 56], (*FOREST, 255), 12)
        d.text((86, card_y + 26), scene.step, font=font(18, True), fill=(*WHITE, 255))
        title_x = 72 + chip_w + 18
    else:
        title_x = 72
    d.text((title_x, card_y + 20), scene.title, font=font(28, True), fill=(*INK, 255))
    caption = scene.caption or scene.subtitle
    d.text((72, card_y + 72), caption, font=font(22), fill=(*INK_SOFT, 255))
    _overlay_cache[key] = overlay
    return overlay


def add_lower_third(base: Image.Image, scene: Scene, progress: float, local_t: float) -> Image.Image:
    img = Image.alpha_composite(base.convert("RGBA"), caption_overlay(scene)).convert("RGB")
    draw = ImageDraw.Draw(img)
    draw_progress(draw, progress)
    for click in scene.clicks:
        draw_click_indicator(draw, click, local_t)
    return img


_bitmap_cache: dict[str, Image.Image] = {}


def bitmap_for(scene: Scene) -> Image.Image:
    assert scene.image is not None
    key = str(scene.image) + ":" + scene.kind
    if key not in _bitmap_cache:
        if scene.kind == "diagram":
            raw = Image.open(scene.image).convert("RGB")
            _bitmap_cache[key] = fit_diagram(raw)
        elif scene.motion == "pan_down":
            im = Image.open(scene.image).convert("RGB")
            scale = W / im.width
            _bitmap_cache[key] = im.resize((W, int(im.height * scale)), Image.Resampling.LANCZOS)
        else:
            _bitmap_cache[key] = load_cover_bitmap(scene.image)
    return _bitmap_cache[key]


def render_scene_frame(scene: Scene, local_t: float, progress: float) -> Image.Image:
    if scene.kind == "title":
        return render_title(scene, progress)
    if scene.kind == "chapter":
        return render_chapter(scene, progress)
    src = bitmap_for(scene)
    if scene.kind == "diagram":
        frame = sample_motion(src, local_t, "hold" if scene.motion == "hold" else scene.motion)
        if scene.motion != "hold":
            frame = sample_motion(src, local_t, "hold")
        return add_lower_third(frame, scene, progress, local_t)
    frame = sample_motion(src, local_t, scene.motion)
    return add_lower_third(frame, scene, progress, local_t)


def blend(a: Image.Image, b: Image.Image, t: float) -> Image.Image:
    t = ease(t)
    arr = (np.asarray(a, dtype=np.float32) * (1 - t) + np.asarray(b, dtype=np.float32) * t).astype(
        np.uint8
    )
    return Image.fromarray(arr, "RGB")


def get_audio_duration(ffmpeg_exe: str, path: Path) -> float:
    try:
        res = subprocess.run(
            [ffmpeg_exe, "-i", str(path)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
        )
        m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", res.stderr)
        if m:
            h, m_, s = m.groups()
            return int(h) * 3600 + int(m_) * 60 + float(s)
    except Exception as err:
        print(f"Warning: could not probe audio duration for {path}: {err}", file=sys.stderr)
    return 0.0


async def synthesize_voice_clip(text: str, dest: Path) -> None:
    if dest.exists() and dest.stat().st_size > 500:
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        comm = edge_tts.Communicate(text, VOICE_NAME, rate=VOICE_RATE)
        await comm.save(str(dest))
    except Exception as err:
        print(f"  Fallback voice for '{text[:30]}...' ({err})")
        comm = edge_tts.Communicate(text, VOICE_FALLBACK, rate=VOICE_RATE)
        await comm.save(str(dest))


async def generate_all_audio(scenes: list[Scene], ffmpeg_exe: str) -> None:
    VOICE_DIR.mkdir(parents=True, exist_ok=True)
    print("Synthesizing neural voiceover for scenes...")
    for idx, scene in enumerate(scenes):
        if not scene.voice:
            continue
        # Use content hash in filename for caching
        v_hash = hashlib.md5(f"{VOICE_NAME}:{scene.voice}".encode("utf-8")).hexdigest()[:10]
        out_clip = VOICE_DIR / f"scene_{idx:02d}_{v_hash}.mp3"
        await synthesize_voice_clip(scene.voice, out_clip)
        scene.voice_file = out_clip
        scene.audio_duration = get_audio_duration(ffmpeg_exe, out_clip)
        # Adapt scene duration to fit narration comfortably with 0.8s breathing room
        if scene.audio_duration > 0:
            target_dur = round(scene.audio_duration + 0.85, 2)
            if target_dur > scene.duration:
                scene.duration = target_dur
    print(f"  [OK] Voiceover ready for {sum(1 for s in scenes if s.voice)} scenes.")


def assemble_audio_track(scenes: list[Scene], ffmpeg_exe: str) -> Path:
    """Pad each scene's audio to match its visual duration, then concatenate into master narration."""
    print("Assembling master narration audio track...")
    padded_files: list[Path] = []
    delta = FADE / FPS

    for idx, scene in enumerate(scenes):
        is_last = idx == len(scenes) - 1
        scene_len = round(scene.duration if is_last else (scene.duration - delta), 3)
        padded_file = VOICE_DIR / f"padded_{idx:02d}.m4a"

        if scene.voice_file and scene.voice_file.exists():
            # Add 300ms lead-in delay and pad with silence to exact scene length
            cmd = [
                ffmpeg_exe,
                "-y",
                "-i",
                str(scene.voice_file),
                "-af",
                "adelay=300|300,apad",
                "-t",
                str(scene_len),
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                str(padded_file),
            ]
        else:
            # Generate pure stereo silence
            cmd = [
                ffmpeg_exe,
                "-y",
                "-f",
                "lavfi",
                "-i",
                "anullsrc=r=24000:cl=stereo",
                "-t",
                str(scene_len),
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                str(padded_file),
            ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        padded_files.append(padded_file)

    # Concat demuxer list
    concat_list = OUT_DIR / "_concat_audio.txt"
    with open(concat_list, "w", encoding="utf-8") as f:
        for pf in padded_files:
            # Format path with forward slashes for ffmpeg
            f.write(f"file '{pf.as_posix()}'\n")

    concat_cmd = [
        ffmpeg_exe,
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(concat_list),
        "-c",
        "copy",
        str(AUDIO_TMP),
    ]
    subprocess.run(concat_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    concat_list.unlink(missing_ok=True)
    print(f"  [OK] Master narration audio created: {AUDIO_TMP}")
    return AUDIO_TMP


def total_duration(scenes: list[Scene]) -> float:
    if not scenes:
        return 0.0
    raw = sum(s.duration for s in scenes)
    return raw - (len(scenes) - 1) * (FADE / FPS)


def build() -> None:
    scenes = storyboard()
    missing = [sc.image for sc in scenes if sc.image and not sc.image.exists()]
    if missing:
        raise SystemExit(f"Missing assets:\n" + "\n".join(str(p) for p in missing))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

    # Step 1: Synthesize neural voiceover and adapt scene timings
    asyncio.run(generate_all_audio(scenes, ffmpeg))

    # Step 2: Build master narration audio track
    assemble_audio_track(scenes, ffmpeg)

    # Step 3: Render silent video stream with Ken Burns motion & transitions
    cmd = [
        ffmpeg,
        "-y",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{W}x{H}",
        "-r",
        str(FPS),
        "-i",
        "-",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(VIDEO_TMP),
    ]
    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    assert proc.stdin is not None

    dur = total_duration(scenes)
    print(f"\nRendering {len(scenes)} scenes · {dur:.1f}s ({dur/60:.1f} mins) · {W}x{H}@{FPS}fps")
    print(f"FFmpeg: {ffmpeg}")

    written = 0
    global_frames_est = int(dur * FPS)

    def write(img: Image.Image) -> None:
        nonlocal written
        proc.stdin.write(np.asarray(img.convert("RGB"), dtype=np.uint8).tobytes())
        written += 1
        if written % 48 == 0:
            pct = min(99.0, 100.0 * written / max(1, global_frames_est))
            print(f"  {written:5d} frames  ~{pct:5.1f}%", flush=True)

    prev_tail: list[Image.Image] | None = None
    elapsed = 0.0

    for i, scene in enumerate(scenes):
        n = max(FADE * 2 + 1, int(round(scene.duration * FPS)))
        if scene.image:
            bitmap_for(scene)

        first_frames: list[Image.Image] = []
        last_frames: list[Image.Image] = []
        is_last = i == len(scenes) - 1

        for f in range(n):
            local_t = f / max(1, n - 1)
            prog = min(1.0, (elapsed + f / FPS) / max(dur, 0.001))
            frame = render_scene_frame(scene, local_t, prog)
            if f < FADE:
                first_frames.append(frame)
                if prev_tail is None:
                    write(frame)
                elif f == FADE - 1:
                    count = min(FADE, len(prev_tail), len(first_frames))
                    for k in range(count):
                        write(blend(prev_tail[k], first_frames[k], (k + 1) / count))
            elif f >= n - FADE:
                last_frames.append(frame)
                if is_last:
                    write(frame)
            else:
                write(frame)

        prev_tail = last_frames
        elapsed += scene.duration - (FADE / FPS if not is_last else 0)
        print(f"  scene {i + 1:02d}/{len(scenes)}  {scene.title} ({scene.duration:.1f}s)", flush=True)

    proc.stdin.close()
    stderr = proc.stderr.read().decode("utf-8", errors="replace") if proc.stderr else ""
    code = proc.wait()
    if code != 0:
        print(stderr[-4000:], file=sys.stderr)
        raise SystemExit(f"ffmpeg failed with {code}")

    print(f"Video stream complete. Wrote {VIDEO_TMP} ({written} frames)")

    # Step 4: Multiplex video and narration audio into the final output
    print(f"Muxing video and audio into {OUT_PATH}...")
    mux_cmd = [
        ffmpeg,
        "-y",
        "-i",
        str(VIDEO_TMP),
        "-i",
        str(AUDIO_TMP),
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        str(OUT_PATH),
    ]
    subprocess.run(mux_cmd, check=True)

    # Clean temporary raw video and narration files
    VIDEO_TMP.unlink(missing_ok=True)
    AUDIO_TMP.unlink(missing_ok=True)

    size_mb = OUT_PATH.stat().st_size / (1024 * 1024)
    print(f"\n=======================================================")
    print(f"[OK] SUCCESSFULLY GENERATED FINAL DEMO VIDEO:")
    print(f"  File: {OUT_PATH}")
    print(f"  Size: {size_mb:.2f} MB")
    print(f"  Duration: {dur:.1f}s ({dur/60:.2f} mins)")
    print(f"  Specs: 1920x1080 @ 24fps · H.264 / AAC 192kbps stereo")
    print(f"=======================================================\n")


if __name__ == "__main__":
    build()
