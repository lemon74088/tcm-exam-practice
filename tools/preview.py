import os, shutil
src = r"C:\Users\User\DoubaoWork\chats\2026-11-16\new-chat-2\中醫考題練習"
tmp = r"C:\Users\User\AppData\Local\Temp\tcmpreview6"
os.makedirs(tmp, exist_ok=True)
shutil.copy(os.path.join(src, "data.js"), os.path.join(tmp, "data.js"))
ddst = os.path.join(tmp, "data")
if os.path.isdir(ddst):
    shutil.rmtree(ddst)
shutil.copytree(os.path.join(src, "data"), ddst)

html = open(os.path.join(src, "index.html"), encoding="utf-8").read()

WAIT = "const wait = ms => new Promise(r => setTimeout(r, ms));\n"


def page(tag, sid, extra=""):
    js = WAIT + """
window.addEventListener('load', async () => {
  const el = document.querySelector('[data-sid="%s"]');
  if (el) el.click();
  await wait(400);
  document.querySelector('[data-limit="0"]').click();
  document.querySelector('#btnStart').click();
  await wait(500);
  %s
  await wait(500);
});
""" % (sid, extra)
    out = html.replace("</body>", "<script>" + js + "</script>\n</body>")
    open(os.path.join(tmp, tag + ".html"), "w", encoding="utf-8").write(out)


# 切到針灸學，答一題看解析
page("zj", "acupuncture", """
  const o = document.querySelectorAll('.opt');
  if (o.length) o[0].click();
""")
# 切到中藥學，只顯示設定頁章節籌碼
page("zy_setup", "materia")
# 切到婦科學開練
page("fk", "gynecology", """
  const o = document.querySelectorAll('.opt');
  if (o.length) o[0].click();
""")
print("ok")
