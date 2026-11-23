"""Post-render check (music-beat-sync §5): measure the BGM inside the rendered video and compare
each designed cut/accent frame against the nearest measured beat. Also measures the output audio
offset by cross-correlating the render's audio against the source excerpt.
Usage: python analysis/postcheck.py out/promo.mp4"""
import json, subprocess, sys, os, tempfile
import numpy as np, librosa

video = sys.argv[1]
import re
FPS, T, T0, START = 30, 0.4918, 7.9356, 96
OFFSET = float(re.search(r'OUTPUT_AUDIO_OFFSET_SEC = ([\d.]+)', open('src/timeline.ts').read()).group(1))
tmp = os.path.join(tempfile.gettempdir(), 'promo-render-audio.wav')
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', video, '-vn', '-ac', '1', '-ar', '44100', tmp], check=True)
y, sr = librosa.load(tmp, sr=44100, mono=True)

# 1. output offset: cross-correlate with the source excerpt (first 8 s, before SFX density)
src, _ = librosa.load('public/audio/house-vibez.mp3', sr=44100, mono=True, offset=T0 + START * T, duration=8)
seg = y[: len(src)]
n = 1 << int(np.ceil(np.log2(len(seg) + len(src))))
xc = np.fft.irfft(np.fft.rfft(seg, n) * np.conj(np.fft.rfft(src, n)), n)
lag = int(np.argmax(np.r_[xc[-2000:], xc[:2000]])) - 2000
offset_s = lag / sr

# 2. beats measured in the render
_, beats = librosa.beat.beat_track(y=librosa.effects.hpss(y)[1], sr=sr, tightness=400, units='time')
anchors = {'s2 line starts b106': 106, 's3 drop / grab b112': 112, 'road hop b116': 116, 'road hop b120': 120,
           'Destroy tap b124': 124, 'freeze b126': 126, 'resume b131': 131, 'landing b132 (impact 1)': 132,
           'scrub b136': 136, 'clip b137': 137, 'clip b138': 138, 'clip b139': 139, 'push b140': 140,
           'box b144': 144, 'controller b146': 146, 'photo b148': 148, 'stamp b152 (impact 2)': 152, 'URL b154': 154}
rows = []
for name, b in anchors.items():
    design_f = round(((b - START) * T + OFFSET) * FPS)
    t_design = design_f / FPS
    near = beats[np.argmin(np.abs(beats - t_design))] if len(beats) else np.nan
    err_f = (near - t_design) * FPS
    rows.append(dict(anchor=name, design_frame=design_f, measured_beat_s=round(float(near), 4), error_frames=round(float(err_f), 2),
                     quantization_ms=round((((b - START) * T + OFFSET) * FPS - design_f) / FPS * 1000, 1)))
ok = all(abs(r['error_frames']) <= 3 for r in rows)
out = dict(video=video, output_audio_offset_s=round(offset_s, 4), output_audio_offset_frames=round(offset_s * FPS, 2),
           pass_le_3f=ok, mean_abs_error_frames=round(float(np.mean([abs(r['error_frames']) for r in rows])), 2), rows=rows)
json.dump(out, open('analysis/postcheck.json', 'w'), indent=1)
print(f"offset {offset_s*1000:.1f} ms ({offset_s*FPS:.2f} f)  pass<=3f: {ok}  mean |err| {out['mean_abs_error_frames']} f")
for r in rows: print(f"  {r['anchor']:<26} f{r['design_frame']:<4} err {r['error_frames']:+.2f} f  (quant {r['quantization_ms']:+.1f} ms)")
