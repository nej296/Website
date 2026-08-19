import os
import requests as http_requests
from flask import Flask, render_template, request, jsonify, Response, redirect, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(BASE_DIR, 'templates')
STATIC_DIR = os.path.join(BASE_DIR, 'static')
PRIVATE_DIR = os.path.join(BASE_DIR, 'private')

app = Flask(__name__, template_folder=TEMPLATE_DIR)


@app.after_request
def avoid_stale_html_cache(response):
    """So updates to templates show up instead of a cached older deployment HTML."""
    if request.endpoint in (
        'home',
        'research',
        'project_demos',
        'contact',
        'tool',
        'neur327',
        'resume_pdf',
        'morphology_contributions_pdf',
    ):
        response.headers['Cache-Control'] = 'no-store, max-age=0, must-revalidate'
    return response


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/research')
@app.route('/research.html')
def research():
    return render_template('research.html')


@app.route('/project-demos')
@app.route('/project-demos.html')
@app.route('/projects')
@app.route('/demos')
def project_demos():
    return render_template('project_demos.html')


@app.route('/contact')
@app.route('/contact.html')
def contact():
    return render_template('contact.html')


@app.route('/about')
@app.route('/about.html')
def legacy_about():
    return redirect('/contact', code=301)


@app.route('/tool')
def tool():
    return render_template('tool.html')


@app.route('/neur327')
def neur327():
    return render_template('neur327.html')


@app.route('/Nicholas_Johnson_Resume.pdf')
@app.route('/resume-june-2026.pdf')
@app.route('/resume-may-2026.pdf')
@app.route('/Nicholas_Johnson_Computational_Neuroscience_Resume.pdf')
def resume_pdf():
    """Not under api/static so Vercel never serves a stale edge-only PDF for this file."""
    return send_from_directory(
        PRIVATE_DIR,
        'Nicholas_Johnson_Resume.pdf',
        mimetype='application/pdf',
        download_name='Nicholas Johnson Resume.pdf',
    )


@app.route('/Morphology_Contributions.pdf')
def morphology_contributions_pdf():
    """Serve Nicholas Johnson's NeuroMorpho.org contribution index."""
    return send_from_directory(
        PRIVATE_DIR,
        'Morphology_Contributions.pdf',
        mimetype='application/pdf',
        download_name='Nicholas Johnson - NeuroMorpho.org Contributions.pdf',
    )


@app.route('/api/gemini', methods=['POST'])
def gemini_proxy():
    api_key = os.environ.get('GEMINI_API_KEY', '').strip()
    if not api_key:
        return jsonify({'error': 'Analysis service not configured on server'}), 500

    data = request.get_json(silent=True) or {}
    prompt = data.get('prompt', '')
    if not prompt or not isinstance(prompt, str) or len(prompt) < 100:
        return jsonify({'error': 'Missing or invalid prompt'}), 400

    url = (
        'https://generativelanguage.googleapis.com/v1beta/models/'
        f'gemini-2.5-flash:streamGenerateContent?alt=sse&key={api_key}'
    )

    try:
        gemini_resp = http_requests.post(
            url,
            json={
                'contents': [{'parts': [{'text': prompt}]}],
                'generationConfig': {'maxOutputTokens': 8192},
            },
            stream=True,
            timeout=120,
        )

        if not gemini_resp.ok:
            try:
                err = gemini_resp.json()
                msg = err.get('error', {}).get(
                    'message', f'Analysis service returned HTTP {gemini_resp.status_code}'
                )
            except Exception:
                msg = f'Analysis service returned HTTP {gemini_resp.status_code}'
            return jsonify({'error': msg}), gemini_resp.status_code

        def stream():
            for chunk in gemini_resp.iter_content(chunk_size=None):
                if chunk:
                    yield chunk

        return Response(
            stream(),
            content_type='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        )

    except Exception as exc:
        return jsonify({'error': str(exc) or 'Internal server error'}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
