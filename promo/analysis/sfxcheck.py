"""SFX audibility + timing check: music = with-music render minus SFX-only render."""
import subprocess, os, tempfile, re, json
import numpy as np, soundfile as sf
def wav(v):
    p = os.path.join(tempfile.gettempdir(), os.path.basename(v) + '.wav')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', v, '-vn', '-ac', '1', '-ar', '48000', p], check=True)
    return sf.read(p)[0]
a, b = wav('out/promo.mp4'), wav('out/promo-nobgm.mp4')
n = min(len(a), len(b)); a, b = a[:n], b[:n]; music = a - b
sr, FPS = 48000, 30
# cue action frames as rendered (from the source table)
src = open('src/sfx.ts', encoding='utf-8').read()
import ast
rows = []
def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
for note in re.findall(r"note: '([^']+)'", src):
    rows.append(note)
cues = json.load(open('out/cues.json'))
out = []
for c in cues:
    t = c['at'] / FPS
    i0, i1 = int((t - 0.08) * sr), int((t + 0.15) * sr)
    seg_s, seg_m = b[max(0, i0):i1], music[max(0, i0):i1]
    # SFX peak time near the action (10 ms energy windows)
    w = int(0.01 * sr); e = [np.sum(seg_s[k:k + w] ** 2) for k in range(0, len(seg_s) - w, w)]
    pk = (np.argmax(e) * w + max(0, i0)) / sr if e else t
    out.append(dict(note=c['note'], at=c['at'], sfx_minus_music_db=round(rms_db(seg_s) - rms_db(seg_m), 1), peak_err_frames=round((pk - t) * FPS, 2)))
for o in out: print(f"{o['note'][:44]:<45} f{o['at']:<4} SFX vs music {o['sfx_minus_music_db']:+5.1f} dB  peak err {o['peak_err_frames']:+.2f} f")
json.dump(out, open('analysis/sfxcheck.json', 'w'), indent=1)
