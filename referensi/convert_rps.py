#!/usr/bin/env python3
"""
Convert DOCX RPS files to HTML.
Uses mammoth for DOCX→HTML + BeautifulSoup for cleanup.
"""

import mammoth
from bs4 import BeautifulSoup
import os
import sys

BASE = r"C:\Users\teguh\Works\myself\rps-maker\referensi\RPS GENAP 25-26 UNISINA"
OUT = os.path.join(BASE, "RPS HTML")

# (source_path, output_filename)
FILES = [
    (os.path.join(BASE, "FORMAT RPS.docx"), "format-rps.html"),
    (os.path.join(BASE, "RPS S1 Farmasi GENAP 25-26", "SMT 4",
     "RPS Farmakognosi Fitokimia 4A S1 Farmasi_2026.docx"),
     "rps-farmakognosi-fitokimia-s1.html"),
    (os.path.join(BASE, "RPS S1 Farmasi GENAP 25-26", "SMT 4",
     "RPS SPEKTROSKOPI S1 FARMASI 2026.docx"),
     "rps-spektroskopi-s1.html"),
    (os.path.join(BASE, "RPS S1 Farmasi GENAP 25-26", "SMT 4",
     "RPS  S1- FARMAKOTERAPI 1 GENAP 2025.docx"),
     "rps-farmakoterapi-s1.html"),
    (os.path.join(BASE, "RPS D3 Anafarma GENAP 25-26", "SMT 2",
     "RPS TEKNIK FISIKOKIMIA TA 2025.2026 GENAP.docx"),
     "rps-teknik-fisikokimia-d3.html"),
    (os.path.join(BASE, "RPS D3 Anafarma GENAP 25-26", "SMT 2",
     "RPS KIMAN II GENAP 2025 2026.docx"),
     "rps-kiman-ii-d3.html"),
    (os.path.join(BASE, "RPS S1 Farmasi GENAP 25-26", "SMT 4",
     "430_Farmakokinetik Dasar_2024-2025.docx"),
     "rps-farmakokinetik-s1.html"),
]

CSS = """\
<style>
@page {
  size: A4;
  margin: 2cm;
}
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: 'Times New Roman', 'Noto Serif', Georgia, serif;
  font-size: 12pt;
  line-height: 1.5;
  color: #000;
  background: #fff;
  padding: 2rem;
  max-width: 210mm;
  margin: 0 auto;
}
h1 {
  text-align: center;
  font-size: 16pt;
  font-weight: bold;
  text-transform: uppercase;
  margin: 0.5em 0;
}
h2 {
  text-align: center;
  font-size: 14pt;
  font-weight: bold;
  margin: 0.5em 0;
}
h3 {
  font-size: 12pt;
  font-weight: bold;
  margin: 0.5em 0;
}
p {
  margin: 0.3em 0;
  text-align: justify;
}
table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5em 0;
}
td, th {
  border: 1px solid #000;
  padding: 4px 6px;
  vertical-align: top;
  font-size: 11pt;
  line-height: 1.4;
}
th {
  background-color: #f2f2f2;
  font-weight: bold;
  text-align: center;
}
.header-table {
  margin-bottom: 1em;
}
.header-table td {
  border: none;
  padding: 2px 6px;
  font-size: 11pt;
}
.title-row td {
  border: none !important;
  text-align: center;
  font-weight: bold;
  font-size: 14pt;
  padding: 8px !important;
}
.info-table td {
  font-size: 11pt;
}
ul, ol {
  margin-left: 1.5em;
  margin-bottom: 0.5em;
}
li {
  margin-bottom: 0.2em;
}
strong, b {
  font-weight: bold;
}
em, i {
  font-style: italic;
}
.center {
  text-align: center;
}
.right {
  text-align: right;
}
img {
  max-width: 100%;
  height: auto;
}
/* Signature block */
.signature-table td {
  border: none !important;
  padding: 8px;
  vertical-align: top;
  width: 50%;
}
</style>
"""


def convert_file(src_path, out_name):
    """Convert one DOCX to HTML."""
    if not os.path.exists(src_path):
        print(f"  SKIP (not found): {src_path}")
        return False

    print(f"  Converting: {os.path.basename(src_path)}")

    with open(src_path, "rb") as f:
        result = mammoth.convert_to_html(f)
        html = result.value
        messages = result.messages

    if messages:
        for m in messages:
            print(f"    WARN: {m}")

    # Wrap in full HTML document
    soup = BeautifulSoup(html, "html.parser")

    doc = f"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{os.path.splitext(out_name)[0].replace('-', ' ').title()}</title>
  {CSS}
</head>
<body>
{soup.prettify()}
</body>
</html>"""

    out_path = os.path.join(OUT, out_name)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(doc)

    size_kb = os.path.getsize(out_path) / 1024
    print(f"  >> Saved: {out_name} ({size_kb:.1f} KB)")
    return True


def main():
    os.makedirs(OUT, exist_ok=True)
    print(f"Output: {OUT}\n")

    ok = 0
    fail = 0
    for src, name in FILES:
        if convert_file(src, name):
            ok += 1
        else:
            fail += 1
        print()

    print(f"Done: {ok} converted, {fail} skipped")


if __name__ == "__main__":
    main()
