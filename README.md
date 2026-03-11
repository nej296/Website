# Nicholas Johnson — Personal Website

Personal portfolio website for Nicholas Johnson, a Neuroscience student at George Mason University with a concentration in Computational Neuroscience.

**Live site:** [nicholas-johnson-website.vercel.app](https://nicholas-johnson-website.vercel.app)

## Overview

A Flask-powered portfolio featuring an interactive 3D neuron animation (action potential propagation rendered on HTML5 Canvas), project cards, contact information, and a Scientific Article Tool that uses AI to produce structured 15-section breakdowns of research papers.

## Structure

```
├── api/
│   ├── index.py              # Flask application — all routes and Gemini API proxy
│   └── templates/
│       ├── index.html         # Portfolio page (hero, projects, contact)
│       └── tool.html          # Scientific Article Tool
├── requirements.txt           # Python dependencies (Flask, requests)
├── vercel.json                # Vercel deployment configuration
└── README.md
```

## Flask Application (`api/index.py`)

The entire backend is a single Flask app with three routes:

| Route | Method | Description |
|-------|--------|-------------|
| `/` | GET | Serves the portfolio home page |
| `/tool` | GET | Serves the Scientific Article Tool |
| `/api/gemini` | POST | Proxies requests to Google's Gemini API with SSE streaming |

The Gemini proxy keeps the API key secure on the server — frontend users never see or need it.

## Pages

### Portfolio (`index.html`)

- **Hero section** — Name, university, degree, and bio on the left; interactive 3D neuron animation on the right. The neuron is rendered in JavaScript on a `<canvas>` element with perspective projection, depth sorting, click-and-drag rotation, and action potential cycling.
- **Projects** — Card grid linking to project pages. New cards can be added by copying the `<article>` template.
- **Contact** — Email links, GitHub card, and LinkedIn card.

### Scientific Article Tool (`tool.html`)

- **Multi-provider AI analysis** — Paste text or upload a PDF of any research paper. Choose from three AI providers:
  - **Gemini 2.5 Flash (Free)** — Default option, no API key needed. Powered by Google's Gemini with a 1M token context window for full-length papers. The API key is stored server-side.
  - **Claude (Bring Your Own Key)** — Uses Anthropic's Claude API directly from the browser. Key is used once and immediately discarded.
  - **ChatGPT (Bring Your Own Key)** — Uses OpenAI's API directly from the browser. Key is used once and immediately discarded.
- **15-section structured output** — TL;DR, problem, background, hypothesis, study design, methods, data, results, statistics, key figures, author interpretation, limitations, implications, future directions, and verdict.
- **Streaming** — Responses stream in real time with a live cursor display.
- **Markdown rendering** — Results render with proper formatting: bold, italic, bullet points, numbered lists.

## Deployment

The site is deployed on [Vercel](https://vercel.com) using the Python runtime (Flask).

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key for the free-tier analysis proxy |

### Deploy

```bash
npm i -g vercel
vercel --prod
```

## Technologies

- **Python / Flask** — Backend server and API proxy
- **HTML5 Canvas** — 3D neuron animation with perspective projection
- **Vanilla JavaScript** — No frameworks
- **CSS custom properties** — Design system with dark theme
- **PDF.js** — Client-side PDF text extraction
- **Google Gemini API** — Free-tier AI analysis (server-proxied)
- **Anthropic Claude API** — Bring-your-own-key analysis (client-side)
- **OpenAI ChatGPT API** — Bring-your-own-key analysis (client-side)
- **Vercel** — Python serverless hosting
