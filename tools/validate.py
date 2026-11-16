import json, re, sys, collections, io

p = r"C:\Users\User\DoubaoWork\chats\2026-11-16\new-chat-2\中醫考題練習\data.js"
src = open(p, encoding="utf-8").read()

# 抽出 TCM_QUESTIONS 陣列
start = src.index("window.TCM_QUESTIONS = [")
end = src.rindex("];")
body = src[start + len("window.TCM_QUESTIONS = ["):end]
body = re.sub(r"/\*.*?\*/", "", body, flags=re.S)
arr = json.loads("[" + body.strip().rstrip(",") + "]")

print("總題數:", len(arr))
ids = [q["id"] for q in arr]
dup = [k for k, v in collections.Counter(ids).items() if v > 1]
print("重複ID:", dup or "無")

bad = []
for q in arr:
    n = len(q["opts"])
    if n != 4:
        bad.append((q["id"], "選項數=%d" % n))
    if q["ans"] not in "ABCD"[:n]:
        bad.append((q["id"], "答案超出範圍:" + q["ans"]))
    if not q.get("exp"):
        bad.append((q["id"], "缺解析"))
    keys = set(q.keys())
    need = {"id","sub","ch","type","diff","stem","opts","ans","exp","tags"}
    if need - keys:
        bad.append((q["id"], "缺欄位:" + ",".join(sorted(need - keys))))
print("異常:", bad or "無")

c = collections.Counter(q["ch"] for q in arr)
for ch, n in c.items():
    print("  %s: %d" % (ch, n))
print("題型:", collections.Counter(q["type"] for q in arr))
print("難度:", sorted(collections.Counter(q["diff"] for q in arr).items()))
