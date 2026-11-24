// E2E test ของ API กับ Firebase Emulator + next dev (ดู README หัวข้อ "ทดสอบแบบ end-to-end")
// ตำแหน่งกลางโรงเรียนที่ใช้ทดสอบ: ตั้ง E2E_CENTER="lat,lng" ถ้าแก้ geofence แล้ว
const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const AUTH = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";
const FS = "http://127.0.0.1:8080/v1/projects/demo-runsphere/databases/(default)/documents";
let failures = 0;
const ok = (cond, msg, extra) => { console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`, cond ? "" : JSON.stringify(extra ?? "")); if (!cond) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function signUp(email) {
  const r = await fetch(`${AUTH}/accounts:signUp?key=demo-key`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: "password123", returnSecureToken: true }) });
  const j = await r.json(); return { token: j.idToken, uid: j.localId };
}
async function call(token, path, method = "GET", body) {
  const r = await fetch(BASE + path, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
}
// geo helpers
const R = 6371008.8, rad = (d) => d * Math.PI / 180;
const hav = (a, b) => { const s = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s)); };
const move = (a, b, m) => { const d = hav(a, b); if (d <= m) return { ...b }; const f = m / d; return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f }; };
const reading = (p, acc = 8) => ({ lat: p.lat, lng: p.lng, accuracy: acc, timestamp: Date.now() });

const [cLat, cLng] = (process.env.E2E_CENTER ?? "16.47455,102.8259").split(",").map(Number);
const center = { lat: cLat, lng: cLng };
const outside = { lat: cLat + 0.02, lng: cLng };

const a = await signUp(`a${Date.now()}@example.com`);
const b = await signUp(`b${Date.now()}@example.com`);

ok((await call(null, "/api/me")).status === 401, "no token → 401");
ok((await call("garbage", "/api/me")).status === 401, "bad token → 401");
let r = await call(a.token, "/api/me");
ok(r.status === 404 && r.body.error.code === "profile_missing", "me before profile → profile_missing", r);
r = await call(a.token, "/api/profile", "POST", { nickname: "   " });
ok(r.status === 400 && r.body.error.code === "invalid_nickname", "empty nickname rejected", r);
r = await call(a.token, "/api/profile", "POST", { nickname: "ต้นกล้า", uid: b.uid });
ok(r.status === 201, "profile created (uid in body ignored)", r);
r = await call(b.token, "/api/me");
ok(r.status === 404, "user B still has no profile (client uid not trusted)", r);
await call(b.token, "/api/profile", "POST", { nickname: "Mew" });

r = await call(a.token, "/api/me");
ok(r.status === 200 && r.body.profile.coins === 20 && r.body.pet.level === 1 && r.body.activeMission === null, "starting coins + pet", r.body);

r = await call(a.token, "/api/missions/start", "POST", reading(outside));
ok(r.status === 403 && r.body.error.code === "outside_geofence", "start outside geofence rejected", r);
r = await call(a.token, "/api/missions/start", "POST", reading(center, 80));
ok(r.status === 422 && r.body.error.code === "poor_accuracy", "start with poor accuracy rejected", r);
r = await call(a.token, "/api/missions/start", "POST", reading(center, 1500));
ok(r.status === 422 && r.body.error.code === "approximate_location", "approximate location detected", r);
r = await call(a.token, "/api/missions/start", "POST", { ...reading(center), timestamp: Date.now() - 10 * 60_000 });
ok(r.status === 400 && r.body.error.code === "invalid_timestamp", "stale timestamp rejected", r);
r = await call(a.token, "/api/missions/start", "POST", { lat: "x" });
ok(r.status === 400, "malformed body rejected", r);

r = await call(a.token, "/api/missions/start", "POST", reading(center));
ok(r.status === 200 && r.body.mission && !r.body.resumed, "mission started", r);
const mission = r.body.mission;
const d0 = hav(center, mission.target);
ok(d0 >= 50, `spot ≥ 50 m away (${Math.round(d0)} m, ${mission.spotName}, reward ${mission.coinsReward})`);
r = await call(a.token, "/api/missions/start", "POST", reading(center));
ok(r.body.resumed === true && r.body.mission.id === mission.id, "only one active mission (resumed)", r);

// teleport straight to the target
await sleep(2100);
r = await call(a.token, "/api/missions/check", "POST", reading(mission.target));
ok(r.body.outcome === "too_fast", "teleport detected", r.body);
r = await call(a.token, "/api/missions/check", "POST", reading(mission.target));
ok(r.body.outcome === "rate_limited", "rate limited when checking too fast", r.body);

// replayed timestamp
await sleep(2100);
const fixed = reading(center);
r = await call(a.token, "/api/missions/check", "POST", fixed);
ok(r.body.outcome === "not_arrived", "valid check far away → not_arrived", r.body);
await sleep(2100);
r = await call(a.token, "/api/missions/check", "POST", fixed);
ok(r.body.outcome === "invalid_timestamp", "replayed reading rejected", r.body);

// walk at ~4 m/s to the target, check every 2.2 s
let pos = { ...center };
let outcome = null, reward = null, poorSeen = false;
for (let i = 0; i < 120; i++) {
  await sleep(2200);
  pos = move(pos, mission.target, 4 * 2.2);
  const acc = (i === 2) ? 55 : 8; // one poor-accuracy reading on the way
  r = await call(a.token, "/api/missions/check", "POST", reading(pos, acc));
  if (r.body.outcome === "poor_accuracy") poorSeen = true;
  if (!["not_arrived", "counting", "poor_accuracy"].includes(r.body.outcome)) { outcome = r.body.outcome; reward = r.body.reward; break; }
}
ok(poorSeen, "poor accuracy reading not counted");
ok(outcome === "arrived" && reward?.coins === mission.coinsReward, "arrived after walking + consecutive confirmations", { outcome, reward });

r = await call(a.token, "/api/me");
ok(r.body.profile.coins === 20 + mission.coinsReward, "coins awarded server-side", r.body.profile);
ok(r.body.today.spots === 1 && r.body.profile.totals.spots === 1, "daily stats updated", r.body.today);
ok(r.body.pet.xp > 0 && r.body.activeMission === null, "pet rewarded, mission cleared", r.body.pet);

// cooldown + no repeat spot
r = await call(a.token, "/api/missions/start", "POST", reading(pos));
ok(r.status === 429 && r.body.error.code === "cooldown", "cooldown after mission", r.body);
await sleep(5200);
r = await call(a.token, "/api/missions/start", "POST", reading(pos));
ok(r.status === 200 && r.body.mission.spotId !== mission.spotId, "next spot differs from previous", r.body);
r = await call(a.token, "/api/missions/cancel", "POST");
ok(r.body.cancelled === true, "mission cancelled", r.body);

// stats + history
r = await call(a.token, "/api/stats");
ok(r.status === 200 && r.body.recent.length === 2 && r.body.days.length === 28, "stats endpoint", r.body.recent);

// leaderboard
r = await call(a.token, "/api/leaderboard");
ok(r.status === 200 && r.body.top.length === 1 && r.body.top[0].nickname === "ต้นกล้า" && r.body.top[0].spots === 1 && r.body.top[0].isMe, "leaderboard shows A with 1 spot", r.body);
ok(r.body.me.rank === 1 && r.body.totalPlayers === 1, "A is rank 1", r.body.me);
ok(!JSON.stringify(r.body).includes(a.uid), "leaderboard does not leak uids");
r = await call(b.token, "/api/leaderboard");
ok(r.body.top.length === 1 && r.body.top[0].isMe === false && r.body.me.rank === null, "B sees A, B (0 spots) not ranked", r.body);
r = await call(a.token, "/api/profile", "POST", { nickname: "f u c k" });
ok(r.status === 400 && r.body.error.code === "nickname_blocked", "rude nickname blocked", r.body);
r = await call(a.token, "/api/profile", "POST", { nickname: "กล้าเดินเก่ง" });
r = await call(b.token, "/api/leaderboard");
ok(r.body.top[0]?.nickname === "กล้าเดินเก่ง", "nickname change updates leaderboard", r.body.top);
r = await call(a.token, "/api/leaderboard/visibility", "POST", { visible: false });
ok(r.status === 200 && r.body.visible === false, "A hides from leaderboard", r.body);
r = await call(b.token, "/api/leaderboard");
ok(r.body.top.length === 0 && r.body.totalPlayers === 0, "hidden player removed immediately", r.body);
r = await call(a.token, "/api/leaderboard");
ok(r.body.me.visible === false && r.body.me.spots === 1, "A still sees own weekly total while hidden", r.body.me);
r = await call(a.token, "/api/leaderboard/visibility", "POST", { visible: "yes" });
ok(r.status === 400, "visibility requires boolean", r);
r = await call(a.token, "/api/leaderboard/visibility", "POST", { visible: true });
r = await call(b.token, "/api/leaderboard");
ok(r.body.top.length === 1 && r.body.top[0].spots === 1, "A back on leaderboard with weekly total", r.body);
ok(await fetch(`${FS}/leaderboard/x/entries/y`, { headers: { authorization: `Bearer ${b.token}` } }).then((x) => x.status) === 403, "rules: leaderboard not readable directly");

// feed
r = await call(a.token, "/api/pet/feed", "POST", { foodId: "nope" });
ok(r.status === 400, "unknown food rejected", r);
r = await call(a.token, "/api/pet/feed", "POST", { foodId: "banana" });
ok(r.status === 200 && r.body.coins === 20 + mission.coinsReward - 3, "feed costs coins", r.body);
r = await call(b.token, "/api/pet/feed", "POST", { foodId: "mango" });
r = await call(b.token, "/api/pet/feed", "POST", { foodId: "mango" });
ok(r.status === 402 && r.body.error.code === "not_enough_coins", "not enough coins", r.body);

// Firestore rules (client REST with ID token)
const fsGet = (tok, path) => fetch(`${FS}/${path}`, { headers: { authorization: `Bearer ${tok}` } }).then((x) => x.status);
ok(await fsGet(a.token, `users/${a.uid}`) === 200, "rules: can read own user doc");
ok(await fsGet(a.token, `users/${a.uid}/pets/main`) === 200, "rules: can read own pet");
ok(await fsGet(a.token, `users/${b.uid}`) === 403, "rules: cannot read other user");
const patch = await fetch(`${FS}/users/${a.uid}?updateMask.fieldPaths=coins`, { method: "PATCH", headers: { authorization: `Bearer ${a.token}`, "content-type": "application/json" }, body: JSON.stringify({ fields: { coins: { integerValue: "99999" } } }) });
ok(patch.status === 403, "rules: cannot write own coins", patch.status);
const petPatch = await fetch(`${FS}/users/${a.uid}/pets/main?updateMask.fieldPaths=level`, { method: "PATCH", headers: { authorization: `Bearer ${a.token}`, "content-type": "application/json" }, body: JSON.stringify({ fields: { level: { integerValue: "50" } } }) });
ok(petPatch.status === 403, "rules: cannot write pet stats", petPatch.status);
ok(await fsGet(a.token, `config/geofence`) === 403, "rules: other collections closed");

// delete account
r = await call(a.token, "/api/account", "DELETE");
ok(r.status === 200, "account deleted", r);
r = await call(a.token, "/api/me");
ok(r.status === 401, "token unusable after deletion", r);
const left = await fetch(`${FS}/users/${a.uid}/missions`, { headers: { authorization: "Bearer owner" } }).then((x) => x.json());
ok(!left.documents || left.documents.length === 0, "user data removed", left);
r = await call(b.token, "/api/leaderboard");
ok(r.body.top.length === 0, "deleted account removed from leaderboard", r.body);

console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
process.exit(failures ? 1 : 0);
