import json
import os
from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            self._json_error(500, "Server misconfigured: missing ANTHROPIC_API_KEY")
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length else {}
        except (json.JSONDecodeError, ValueError):
            self._json_error(400, "Invalid JSON body")
            return

        paper_text = (body.get("text") or "").strip()
        if len(paper_text) < 100:
            self._json_error(400, "Paper text too short (minimum 100 characters)")
            return

        if len(paper_text) > 280000:
            paper_text = paper_text[:280000] + "\n\n[… content truncated for context window …]"

        prompt = _build_prompt(paper_text)

        import urllib.request

        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=json.dumps({
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 8192,
                "messages": [{"role": "user", "content": prompt}],
            }).encode(),
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read())
        except urllib.error.HTTPError as e:
            err_body = e.read().decode()
            try:
                msg = json.loads(err_body).get("error", {}).get("message", err_body)
            except Exception:
                msg = err_body
            self._json_error(e.code, msg)
            return
        except Exception as e:
            self._json_error(502, str(e))
            return

        text_content = ""
        for block in result.get("content", []):
            if block.get("type") == "text":
                text_content += block["text"]

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"text": text_content}).encode())

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _json_error(self, code, message):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode())


def _build_prompt(paper_text):
    return f"""You are an expert scientific literature analyst. Carefully read the research paper below and provide a thorough, detailed structured analysis with all 15 sections below.

Use EXACTLY these section headers (bold, on their own line) in this order:

**TL;DR**
Summarize the entire paper in 2–3 plain-language sentences accessible to any reader. What was studied, how, and what was found?

**The Problem**
What specific knowledge gap, unsolved question, or real-world need drove this research? Why did it need to be studied?

**Background & Context**
What prior work, foundational concepts, or theoretical framework does the reader need to understand this study? What is the field's current state of knowledge?

**Hypothesis / Research Question**
State the specific claim being tested, the research question posed, or the central prediction of the study.

**Study Design**
Describe the overall experimental or computational approach: observational, interventional, in-vitro, in-vivo, computational, clinical? Why was this design chosen over alternatives?

**Methods**
Detailed breakdown of the specific tools, models, protocols, software, datasets, or procedures used. Include organism/subject details, sample sizes, conditions, and key technical parameters.

**Data & Materials**
What was measured, collected, or used as input? Describe stimuli, recordings, biological samples, datasets, or any other raw material the analysis relied on.

**Results**
Present the raw findings objectively without interpretation. What were the actual numbers, observations, or outputs? Include key statistics, effect sizes, or quantitative outcomes where reported.

**Statistical Analysis**
How was significance determined? What statistical tests were used, what confidence levels or p-values were reported, and were multiple-comparison corrections applied?

**Key Figures Explained**
Describe what the most important graphs, images, diagrams, or tables show and why they matter to the paper's central argument.

**Author Interpretation**
How do the authors explain what their results mean? What conclusions do they draw and what mechanisms or models do they propose?

**Limitations**
What weaknesses, confounds, caveats, or unexplored questions do the authors acknowledge? What are apparent limitations not mentioned by the authors?

**Implications**
What does this finding mean for the broader field, clinical practice, or real-world application? How does it change or reinforce our current understanding?

**Future Directions**
What questions does this study open up? What do the authors suggest as next steps, and what obvious follow-up experiments or studies are needed?

**Verdict**
An honest, critical assessment of the paper. How strong is the evidence? How novel and significant is the contribution? How credible are the methods and conclusions? Identify any red flags or concerns. Give your overall judgment of the paper's quality and impact.

---

Paper content:

{paper_text}"""
