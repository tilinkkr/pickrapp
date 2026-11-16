import json
import subprocess
from PIL import Image

node_script = """
const { toQR } = require('toqr');
const url = 'exp://c-tilinkkr-wuj91u-mwji5xgt11rme81x.on.expo.app';
console.log(JSON.stringify(Array.from(toQR(url))));
"""

out = subprocess.check_output(['node', '-e', node_script]).decode('utf-8')
data = json.loads(out)
size = int(len(data)**0.5)

scale = 14
pad = 4
img_size = (size + pad * 2) * scale

img = Image.new('RGB', (img_size, img_size), 'white')
pixels = img.load()

for y in range(size):
    for x in range(size):
        if data[y * size + x]:
            for dy in range(scale):
                for dx in range(scale):
                    pixels[(x + pad) * scale + dx, (y + pad) * scale + dy] = (0, 0, 0)

img.save('assets/images/expo-qr.png')
print(f"Saved assets/images/expo-qr.png ({img_size}x{img_size})")
