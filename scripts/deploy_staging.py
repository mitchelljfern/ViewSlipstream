"""
Upload this repo to Netlify as a STAGING branch deploy (never production).

Usage: python3 scripts/deploy_staging.py "<proxy-path URL from the Netlify MCP deploy-site tool>"
See scripts/README.md. Pushing to the `staging` branch is the normal way to deploy.
"""
import os, sys, uuid, zipfile, ssl, urllib.request, urllib.error, tempfile

SITE_ID = "30688486-79a1-4b9f-bbf2-820f59e9f75d"
BRANCH = "staging"  # fixed on purpose: this script cannot deploy anything else
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = {"node_modules", ".git", ".next", "out", ".netlify"}

if len(sys.argv) != 2 or not sys.argv[1].startswith("https://"):
    sys.exit(__doc__)
proxy = sys.argv[1].rstrip("/")

fd, zp = tempfile.mkstemp(suffix=".zip"); os.close(fd)
with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for root, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP]
        for f in files:
            if f.endswith((".zip", ".tsbuildinfo")) or f == ".DS_Store" or f.startswith(".env"):
                continue
            p = os.path.join(root, f)
            z.write(p, os.path.relpath(p, ROOT))

b = "----NetlifyFormBoundary" + uuid.uuid4().hex
parts = [f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
         for k, v in (("branch", BRANCH), ("title", "staging branch deploy"))]
parts.append(f'--{b}\r\nContent-Disposition: form-data; name="zip"; filename="deploy.zip"\r\nContent-Type: application/zip\r\n\r\n'.encode()
             + open(zp, "rb").read() + b"\r\n")
parts.append(f"--{b}--\r\n".encode())
os.remove(zp)

req = urllib.request.Request(f"{proxy}/api/v1/sites/{SITE_ID}/builds?branch={BRANCH}", data=b"".join(parts), method="POST",
                             headers={"Content-Type": f"multipart/form-data; boundary={b}", "user-agent": "netlify-mcp"})
ca = os.environ.get("SSL_CERT_FILE")
ctx = ssl.create_default_context(cafile=ca) if ca else ssl.create_default_context()
try:
    with urllib.request.urlopen(req, context=ctx, timeout=300) as r:
        print(r.status, r.read().decode()[:600])
        print("Staging: https://staging--viewslipstream.netlify.app (ready in a minute or two)")
        print(f"Build log: https://app.netlify.com/projects/viewslipstream/deploys")
except urllib.error.HTTPError as e:
    sys.exit(f"Netlify said {e.code}: {e.read().decode()[:600]}")
