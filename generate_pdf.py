"""機能要件一覧をPDFに変換"""
from playwright.sync_api import sync_playwright
import os
from datetime import datetime

URL = "https://myudai-uns.github.io/watanabe-mockup/requirements.html"
TODAY = datetime.now().strftime("%Y-%m-%d")
OUTPUT_DIR = r"C:\Users\myuda\watanabe-mockup-all\pdf"
FILENAME = f"渡辺謄写堂_機能要件一覧_v1.1_{TODAY}.pdf"
OUTPUT = os.path.join(OUTPUT_DIR, FILENAME)

os.makedirs(OUTPUT_DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1100, "height": 1400})
    page.goto(URL, wait_until="networkidle")
    page.evaluate("localStorage.clear()")
    page.reload(wait_until="networkidle")

    # 画面表示用CSSをそのままPDFに使用
    page.emulate_media(media="screen")

    # アクションバー・モーダルだけは隠す。背景はPDF用に白に整える
    page.add_style_tag(content="""
      .action-bar, .modal-backdrop { display: none !important; }
      body { background: white !important; }
      .page { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
    """)

    page.wait_for_timeout(1500)

    page.pdf(
        path=OUTPUT,
        format="A4",
        print_background=True,
        prefer_css_page_size=False,
        margin={"top": "10mm", "bottom": "10mm", "left": "10mm", "right": "10mm"},
    )
    browser.close()

size_kb = os.path.getsize(OUTPUT) / 1024
print(f"Saved: {OUTPUT}")
print(f"Size: {size_kb:.1f} KB")
