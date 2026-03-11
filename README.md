# Nicholas Johnson — Personal Website

Personal portfolio website for Nicholas Johnson, a Neuroscience student at George Mason University with a concentration in Computational Neuroscience.

**Live site:** [nicholas-johnson-website.vercel.app](https://nicholas-johnson-website.vercel.app)

## Overview

A single-page portfolio featuring an interactive 3D neuron animation (action potential propagation rendered on HTML5 Canvas), project cards, and contact information. The site also includes a Scientific Article Tool that uses Claude to produce structured 15-section breakdowns of research papers.

## Structure

```
├── index.html        # Main portfolio page (hero, projects, contact)
├── tool.html         # Scientific Article Tool (Claude-powered paper analysis)
├── vercel.json       # Vercel deployment configuration
└── README.md
```

### `index.html`

- **Hero section** — Name, university, degree, and a short bio on the left; interactive 3D neuron animation on the right. The neuron is fully rendered in JavaScript on a `<canvas>` element with perspective projection, depth sorting, and action potential cycling.
- **Projects** — Card grid linking to project pages. New cards can be added by copying the `<article>` template.
- **Contact** — Email links, GitHub card, and LinkedIn card.

### `tool.html`

- **Scientific Article Tool** — Paste text or upload a PDF of any research paper. The tool sends the content to Anthropic's Claude API and returns a structured 15-section analysis (TL;DR, methods, results, limitations, verdict, etc.).
- **Bring-your-own-key model** — Users provide their own Anthropic API key. The key is read once, the input is immediately cleared, and the key is never persisted to storage of any kind.
- **Streaming** — Responses stream in real time from the Claude API with a live cursor display.

## Deployment

The site is deployed as a static project on [Vercel](https://vercel.com). No server-side code or environment variables are required.

```bash
npm i -g vercel
vercel --prod
```

## Technologies

- HTML5 Canvas (3D neuron animation with perspective projection)
- Vanilla JavaScript (no frameworks)
- CSS custom properties design system
- PDF.js (client-side PDF text extraction)
- Anthropic Claude API (streamed via browser fetch)
- Vercel (static hosting)
