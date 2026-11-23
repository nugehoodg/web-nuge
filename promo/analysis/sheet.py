import sys, glob, os, re
from PIL import Image, ImageDraw
d = sys.argv[1]; out = sys.argv[2]
fs = sorted(glob.glob(os.path.join(d, 'f*.png')), key=lambda p: int(re.findall(r'\d+', os.path.basename(p))[0]))
cols, W, H = 5, 384, 216
rows = (len(fs) + cols - 1) // cols
o = Image.new('RGB', (cols * (W + 6), rows * (H + 24)), '#666'); dr = ImageDraw.Draw(o)
for i, p in enumerate(fs):
    im = Image.open(p).convert('RGB').resize((W, H)); x = (i % cols) * (W + 6); y = (i // cols) * (H + 24)
    o.paste(im, (x, y + 20)); dr.text((x + 4, y + 4), os.path.basename(p), fill='white')
o.save(out); print(len(fs))
