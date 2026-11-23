"""Beat grid + drum hit analysis for the promo BGM (method: video-shotcraft music-beat-sync.md)."""
import json, sys
import numpy as np, librosa
from scipy.signal import butter, sosfilt

path = sys.argv[1]
y, sr = librosa.load(path, sr=None, mono=True)
dur = len(y) / sr
y_h, y_p = librosa.effects.hpss(y)

tempo, beats = librosa.beat.beat_track(y=y_p, sr=sr, tightness=400, units="time")
i = np.arange(len(beats))
(T, t0), *_ = np.linalg.lstsq(np.vstack([i, np.ones_like(i)]).T, beats, rcond=None)
res = beats - (t0 + i * T)

def band_env(sig, lo, hi):
    sos = butter(4, [lo, hi], btype="band", fs=sr, output="sos")
    env = librosa.onset.onset_strength(y=sosfilt(sos, sig), sr=sr)
    return env, librosa.times_like(env, sr=sr)

kick_env, times = band_env(y_p, 40, 160)
snare_env, _ = band_env(y_p, 150, 500)
snare_hi, _ = band_env(y_p, 1000, 3000)
hat_env, _ = band_env(y_p, 6000, 14000)
on_all = librosa.onset.onset_detect(y=y_p, sr=sr, units="time", backtrack=False)

def grid_score(T_, t0_):
    n = int((dur - t0_) / T_)
    g = t0_ + np.arange(n) * T_
    d = np.array([np.min(np.abs(on_all - t)) for t in g])
    match = float(np.mean(d < 0.035))
    m = d < 0.035
    mean_ms = float(np.mean(d[m]) * 1000) if m.any() else 999
    slope = float(np.polyfit(g[m], (np.array([on_all[np.argmin(np.abs(on_all - t))] for t in g[m]]) - g[m]), 1)[0] * (g[-1] - g[0]) * 1000) if m.sum() > 2 else 999
    kick_on = float(np.mean([kick_env[np.argmin(np.abs(times - t))] for t in g]))
    kick_off = float(np.mean([kick_env[np.argmin(np.abs(times - (t + T_ / 2)))] for t in g]))
    return dict(T=T_, bpm=60 / T_, t0=t0_, match=match, mean_abs_ms=mean_ms, drift_ms=slope, kick_on_vs_half=kick_on / max(kick_off, 1e-6))

cands = {"0.5x": grid_score(T * 2, t0), "1x": grid_score(T, t0), "2x": grid_score(T / 2, t0)}
win = max(cands, key=lambda k: (cands[k]["match"] >= 0.9, cands[k]["kick_on_vs_half"] if k != "2x" else 0, cands[k]["match"]))
W = cands[win]
T_w, t0_w = W["T"], W["t0"]
# make beat 0 the first strong kick at/after t0
nb = int((dur - t0_w) / T_w)
grid = t0_w + np.arange(nb) * T_w

def near(env, t):
    j = np.argmin(np.abs(times - t)); return float(env[max(0, j - 2):j + 3].max())
hits = []
for n, t in enumerate(grid):
    k = near(kick_env, t); s = min(near(snare_env, t), near(snare_hi, t)); h = near(hat_env, t)
    hits.append(dict(n=n, t=round(float(t), 4), kick=round(k, 3), snare=round(s, 3), hat=round(h, 3)))
rms = librosa.feature.rms(y=y, hop_length=sr // 4)[0]
rms_t = librosa.times_like(rms, sr=sr, hop_length=sr // 4)
per_bar = []
for b in range(0, nb, 4):
    a, z = grid[b], grid[min(b + 4, nb - 1)] if b + 4 < nb else dur
    sel = (rms_t >= a) & (rms_t < z)
    kk = np.mean([h["kick"] for h in hits[b:b + 4]])
    per_bar.append(dict(beat=b, t=round(float(a), 3), rms=round(float(rms[sel].mean()) if sel.any() else 0, 4), kick=round(float(kk), 2)))
top_kicks = sorted(hits, key=lambda h: -h["kick"])[:12]
out = dict(file=path, duration=round(dur, 3), bpm=round(W["bpm"], 3), t0=round(t0_w, 4), T=round(T_w, 5),
           fit_residual_ms=round(float(np.abs(res).max() * 1000), 1), beats=[round(float(t), 4) for t in grid],
           hits=hits, bars=per_bar, top_kicks=[dict(n=h["n"], t=h["t"], kick=h["kick"]) for h in top_kicks])
json.dump(out, open("analysis/beat_data.json", "w"), indent=1)
json.dump(dict(candidates=cands, winner=win, reason="highest kick on-beat ratio among grids with match>=90%; 2x excluded when kick alternates"), open("analysis/grid_drift.json", "w"), indent=1)
print(f"dur={dur:.2f}s  beat_track tempo={float(np.atleast_1d(tempo)[0]):.2f}  fit residual max={np.abs(res).max()*1000:.1f}ms")
for k, v in cands.items(): print(k, {a: (round(b, 3) if isinstance(b, float) else b) for a, b in v.items()})
print("WINNER", win, f"bpm={W['bpm']:.3f} t0={t0_w:.4f} T={T_w:.5f}")
print("bars (beat, t, rms, kick):")
for b in per_bar: print(f"  b{b['beat']:>3} {b['t']:6.2f}s rms={b['rms']:.4f} kick={b['kick']:.2f}")
print("top kicks:", [(h['n'], round(h['t'], 2), round(h['kick'], 2)) for h in top_kicks])
