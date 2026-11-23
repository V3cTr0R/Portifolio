"""Bundle the portfolio and its locally served assets into a Sites Worker."""
import base64
import json
from pathlib import Path
root = Path(__file__).resolve().parent
src = root / 'src'
out = root / 'dist'
assets = {p.name: base64.b64encode(p.read_bytes()).decode('ascii')
          for p in sorted((src / 'assets').iterdir()) if p.is_file()}
worker = (src / 'server.js').read_text().replace('__HTML__', json.dumps((src / 'index.html').read_text())).replace('__ASSETS__', json.dumps(assets))
(out / 'server').mkdir(parents=True, exist_ok=True)
(out / 'server/index.js').write_text(worker)
hosting_config = root / '.openai/hosting.json'
if hosting_config.is_file():
    (out / '.openai').mkdir(exist_ok=True)
    (out / '.openai/hosting.json').write_bytes(hosting_config.read_bytes())
