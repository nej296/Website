import os
import requests as http_requests
from flask import Flask, render_template, request, jsonify, Response

TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')

app = Flask(__name__, template_folder=TEMPLATE_DIR)


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/tool')
def tool():
    return render_template('tool.html')


@app.route('/neur327')
def neur327():
    return render_template('neur327.html')


@app.route('/hodgkin-huxley')
def hodgkin_huxley():
    return render_template('hodgkin-huxley.html')


@app.route('/api/gemini', methods=['POST'])
def gemini_proxy():
    api_key = os.environ.get('GEMINI_API_KEY', '').strip()
    if not api_key:
        return jsonify({'error': 'Gemini API key not configured on server'}), 500

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
                    'message', f'Gemini API returned HTTP {gemini_resp.status_code}'
                )
            except Exception:
                msg = f'Gemini API returned HTTP {gemini_resp.status_code}'
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
