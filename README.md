# Nicholas Johnson — Personal Website

Personal portfolio website for Nicholas Johnson, a Neuroscience student at George Mason University with a concentration in Computational Neuroscience.

**Live site:** [nicholas-johnson-website.vercel.app](https://nicholas-johnson-website.vercel.app) | **Tool:** [nicholas-johnson-website.vercel.app/tool](https://nicholas-johnson-website.vercel.app/tool) | **NEUR 327:** [nicholas-johnson-website.vercel.app/neur327](https://nicholas-johnson-website.vercel.app/neur327) | **HH Simulator:** [nicholas-johnson-website.vercel.app/hodgkin-huxley](https://nicholas-johnson-website.vercel.app/hodgkin-huxley)

---

## Source Code

### [`api/index.py`](api/index.py) — Python (Flask Backend)
The entire backend. Serves all pages and proxies the Gemini API for free AI analysis.

### [`api/templates/index.html`](api/templates/index.html) — HTML / CSS / JavaScript (Portfolio Page)
The main portfolio page with hero section, interactive 3D neuron animation rendered on HTML5 Canvas, project cards, and contact information.

### [`api/templates/tool.html`](api/templates/tool.html) — HTML / CSS / JavaScript (Scientific Article Tool)
AI-powered research paper analysis tool. Supports three providers (Gemini, Claude, ChatGPT), streams responses in real time, and renders formatted output with markdown.

### [`api/templates/neur327.html`](api/templates/neur327.html) — HTML / CSS / JavaScript (NEUR 327 Presentation)
Interactive 20-slide presentation on BiPOLES (Bidirectional Pair of Opsins for Light-induced Excitation and Silencing) for Cellular Neuroscience (NEUR 327). Features keyboard/click navigation, editable content fields, and optional Firebase real-time team sync.

### [`api/templates/hodgkin-huxley.html`](api/templates/hodgkin-huxley.html) — HTML / CSS / JavaScript (Hodgkin-Huxley Simulator)
Interactive Hodgkin-Huxley neuron simulator. Full 1952 equations, RK4 integration, current clamp and voltage clamp modes, Nernst-computed reversal potentials, adjustable conductances and ion concentrations.

### [`requirements.txt`](requirements.txt) — Python Dependencies
### [`vercel.json`](vercel.json) — Deployment Configuration

---

## Overview

A Flask-powered portfolio featuring an interactive 3D neuron animation (action potential propagation rendered on HTML5 Canvas), project cards, contact information, and a Scientific Article Tool that uses AI to produce structured 15-section breakdowns of research papers.

## Flask Routes (`api/index.py`)

| Route | Method | Description |
|-------|--------|-------------|
| `/` | GET | Serves the portfolio home page |
| `/tool` | GET | Serves the Scientific Article Tool |
| `/neur327` | GET | Serves the NEUR 327 BiPOLES presentation |
| `/hodgkin-huxley` | GET | Serves the Hodgkin-Huxley neuron simulator |
| `/api/gemini` | POST | Proxies requests to Google's Gemini API with SSE streaming |

The Gemini proxy keeps the API key secure on the server — frontend users never see or need it.

## Portfolio Page — `index.html`

- **Hero section** — Name, university, degree, and bio on the left; interactive 3D neuron animation on the right. The neuron is rendered in JavaScript on a `<canvas>` element with perspective projection, depth sorting, click-and-drag rotation, and action potential cycling.
- **Projects** — Card grid linking to project pages.
- **Contact** — Email, GitHub, and LinkedIn links.

## NEUR 327 Presentation — `neur327.html`

- **BiPOLES** — 20-slide interactive presentation on Bidirectional Pair of Opsins for Light-induced Excitation and Silencing.
- **Keyboard navigation** — Arrow keys and click to advance/retreat slides.
- **Editable fields** — Content-editable sections for collaborative group work.
- **Firebase sync** — Optional real-time team editing via Firebase Realtime Database.

## Hodgkin-Huxley Simulator — `hodgkin-huxley.html`

- **Full HH model** — Membrane potential and ionic currents from the 1952 Hodgkin-Huxley equations.
- **RK4 integration** — 4th-order Runge-Kutta with 0.01 ms time step.
- **Current clamp** — Single pulse, pulse train, or step current injection.
- **Voltage clamp** — Command voltage steps with clamp current display.
- **Nernst potentials** — E_Na and E_K computed from user-adjustable ion concentrations.
- **Adjustable conductances** — g_Na, g_K, g_L, C_m with real-time updates.

## Scientific Article Tool — `tool.html`

- **Multi-provider AI analysis** — Paste text or upload a PDF of any research paper. Choose from three AI providers:
  - **Gemini 2.5 Flash (Free)** — Default option, no API key needed. 1M token context window handles full-length papers. API key stored server-side.
  - **Claude (Bring Your Own Key)** — Anthropic's API, called directly from the browser. Key is ephemeral.
  - **ChatGPT (Bring Your Own Key)** — OpenAI's API, called directly from the browser. Key is ephemeral.
- **15-section structured output** — TL;DR, problem, background, hypothesis, study design, methods, data, results, statistics, key figures, author interpretation, limitations, implications, future directions, and verdict.
- **Real-time streaming** with live cursor and **markdown rendering** (bold, italic, bullet points, numbered lists).

## Deployment

Hosted on [Vercel](https://vercel.com) using the Python serverless runtime.

| Environment Variable | Description |
|----------------------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key for the free-tier analysis proxy |

```bash
npm i -g vercel
vercel --prod
```

## Technologies

| Technology | Role |
|------------|------|
| Python / Flask | Backend server and API proxy |
| HTML5 Canvas | 3D neuron animation with perspective projection |
| Vanilla JavaScript | All frontend logic — no frameworks |
| CSS Custom Properties | Design system with dark theme |
| PDF.js | Client-side PDF text extraction |
| Google Gemini API | Free-tier AI analysis (server-proxied) |
| Anthropic Claude API | Bring-your-own-key analysis (client-side) |
| OpenAI ChatGPT API | Bring-your-own-key analysis (client-side) |
| Vercel | Python serverless hosting |
