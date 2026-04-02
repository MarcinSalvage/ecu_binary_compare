"""
ECU Binary Compare - Flask Application
Main entry point with route configuration
"""

import sys
import os
from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
import io

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.comparison import compare_binary_files, compute_md5
from core.a2l_parser import parse_a2l_content, create_sample_a2l
from core.generator import generate_sample_binary, generate_modified_binary
from api.routes import api_bp

def create_app():
    """Application factory"""
    app = Flask(__name__)
    CORS(app)

    # Register API blueprint
    app.register_blueprint(api_bp, url_prefix='/api')

    # Serve the beautiful web interface
    @app.route('/')
    def index():
        return render_template('index.html')

    # Download demo files
    @app.route('/download-demo')
    def download_demo():
        import zipfile

        original = generate_sample_binary()
        modified = generate_modified_binary(original)
        sample_a2l = create_sample_a2l().encode()

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr('original.bin', original)
            zf.writestr('modified.bin', modified)
            zf.writestr('sample.a2l', sample_a2l)

        zip_buffer.seek(0)
        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name='ecu_demo_files.zip'
        )

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
