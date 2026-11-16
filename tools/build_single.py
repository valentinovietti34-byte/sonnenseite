"""Bundle the app into one self-contained file: dist/sonnenseite.html.

Styles, scripts, data and the icon are inlined, so the file can be opened straight from disk or sent to someone.
(The installable version with offline start is the folder itself: index.html plus manifest and service worker.)
"""
import base64, os, re
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
read = lambda p: open(os.path.join(ROOT, p), encoding="utf-8").read()
html = read("index.html")
html = re.sub(r'<link rel="stylesheet" href="((?:vendor|css)/[^"]+)">', lambda m: "<style>\n" + read(m.group(1)) + "\n</style>", html)
html = re.sub(r'<script src="([^"]+)"></script>', lambda m: "<script>\n" + read(m.group(1)).replace("</script", "<\\/script") + "\n</script>", html)
def font_css():
    out = []
    for b in re.findall(r"@font-face \{.*?\}", read("fonts/fonts.css"), re.S):
        fn = re.search(r"url\(([^)]+)\)", b).group(1)
        if "latin-ext" in fn:
            continue
        data = base64.b64encode(open(os.path.join(ROOT, "fonts", fn), "rb").read()).decode()
        out.append(b.replace("url(" + fn + ")", "url(data:font/woff2;base64," + data + ")"))
    return "\n".join(out)


html = html.replace('<link rel="stylesheet" href="fonts/fonts.css">', "<style>\n" + font_css() + "\n</style>")
icon = base64.b64encode(read("icons/icon.svg").encode()).decode()
html = html.replace('<link rel="manifest" href="manifest.webmanifest">\n', "")
html = html.replace('<link rel="icon" href="icons/icon.svg" type="image/svg+xml">', f'<link rel="icon" href="data:image/svg+xml;base64,{icon}">')
png = base64.b64encode(open(os.path.join(ROOT, "icons/icon-180.png"), "rb").read()).decode()
html = html.replace('<link rel="apple-touch-icon" href="icons/icon-180.png">', f'<link rel="apple-touch-icon" href="data:image/png;base64,{png}">')
assert 'src="js/' not in html and 'href="css/' not in html
os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
out = os.path.join(ROOT, "dist", "sonnenseite.html")
open(out, "w", encoding="utf-8").write(html)
print("wrote", out, f"{os.path.getsize(out) / 1024:.0f} KB")
