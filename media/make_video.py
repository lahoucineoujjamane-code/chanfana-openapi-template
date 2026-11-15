import os, sys, math, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

D = os.path.dirname(os.path.abspath(__file__))
VOICE = sys.argv[1] if len(sys.argv) > 1 else "siwis"
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(D, "video.mp4")
W, H, FPS = 1080, 1920, 30
FB = "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf"
FXB = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
FR = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf" if os.path.exists("/usr/share/fonts/opentype/inter/Inter-SemiBold.otf") else FB

# (era, people, inventions, colors, narration)
SEG = [
    ("", "Les peuples\nqui ont inventé\nle monde", [], ((20, 12, 40), (120, 40, 90)),
     "Tout ce que tu utilises aujourd'hui… l'écriture, les chiffres, les médicaments… "
     "quelqu'un, quelque part, l'a inventé. Voici les peuples qui ont changé l'humanité."),
    ("vers 3500 av. J.-C.", "Les Sumériens", ["L'écriture", "La roue", "Les premières lois"], ((40, 25, 10), (160, 100, 40)),
     "Tout commence en Mésopotamie. Les Sumériens inventent l'écriture, la roue, "
     "et les premières lois écrites. Sans eux, pas d'histoire."),
    ("vers 3000 av. J.-C.", "Les Égyptiens", ["Le papyrus", "Le calendrier de 365 jours", "Les premiers traités de médecine"], ((10, 30, 50), (200, 150, 50)),
     "Les Égyptiens créent le papyrus, un calendrier de trois cent soixante-cinq jours, "
     "et parmi les plus anciens traités de médecine du monde."),
    ("dès le IIe siècle", "Les Chinois", ["Le papier", "L'imprimerie", "La boussole", "La variolisation"], ((60, 5, 10), (200, 40, 30)),
     "La Chine offre au monde le papier, l'imprimerie, la boussole… "
     "et protège déjà les gens contre la variole, des siècles avant les vaccins modernes."),
    ("vers le Ve siècle", "Les Indiens", ["Le zéro", "Les chiffres modernes", "La chirurgie de Sushruta"], ((50, 20, 0), (230, 120, 20)),
     "En Inde, les mathématiciens inventent le zéro et les chiffres que tu utilises chaque jour. "
     "Et le médecin Sushruta pratique déjà la chirurgie réparatrice."),
    ("Ve siècle av. J.-C.", "Les Grecs", ["La démocratie", "La médecine d'Hippocrate", "La philosophie"], ((10, 25, 60), (60, 120, 200)),
     "Les Grecs inventent la démocratie, et Hippocrate fait de la médecine une science, "
     "avec un serment que les médecins prêtent encore aujourd'hui."),
    ("VIIIe – XIIIe siècle", "Le monde arabo-musulman", ["L'algèbre", "Les hôpitaux publics", "L'optique", "Le Canon d'Ibn Sina"], ((5, 40, 35), (30, 160, 120)),
     "Pendant l'âge d'or arabo-musulman, Al-Khwarizmi fonde l'algèbre, Ibn al-Haytham révolutionne l'optique, "
     "Ibn Sina écrit le grand livre de la médecine, et des hôpitaux soignent tout le monde, gratuitement."),
    ("XVe – XIXe siècle", "Les Européens", ["L'imprimerie de Gutenberg", "Le vaccin de Jenner", "Pasteur", "La Croix-Rouge"], ((25, 20, 50), (110, 90, 200)),
     "En Europe, Gutenberg diffuse le savoir, Jenner crée le premier vaccin, Pasteur sauve des millions de vies, "
     "et Henry Dunant fonde la Croix-Rouge pour soigner tous les blessés de guerre."),
    ("XXe – XXIe siècle", "Le monde entier", ["La pénicilline", "Internet", "Les vaccins à ARN"], ((5, 15, 40), (20, 160, 220)),
     "Puis le génie devient mondial. La pénicilline, Internet, les vaccins à ARN… "
     "Aujourd'hui, les grandes inventions naissent de chercheurs de tous les pays, ensemble."),
    ("", "Le génie\nn'a pas de\nnationalité", [], ((20, 12, 40), (200, 60, 110)),
     "Le génie n'a pas de nationalité. Chaque peuple a posé sa pierre. "
     "Et toi, quelle invention a changé ta vie ? Dis-le moi en commentaire."),
]

# ---------- TTS ----------
from piper import PiperVoice, SynthesisConfig
md = os.path.join(D, "models", f"vits-piper-fr_FR-{VOICE}-medium")
pv = PiperVoice.load(f"{md}/fr_FR-{VOICE}-medium.onnx")
sr = pv.config.sample_rate
syn = SynthesisConfig(length_scale=1.05, noise_scale=0.667, noise_w_scale=0.8)
clips = []
for s in SEG:
    x = np.concatenate([np.asarray(c.audio_float_array, np.float32) for c in pv.synthesize(s[4], syn_config=syn)])
    x = x / (np.abs(x).max() + 1e-6) * 0.9
    clips.append(x)
GAP_START, GAP = 0.35, 0.55
audio, starts, durs = [np.zeros(int(GAP_START * sr), np.float32)], [], []
t = GAP_START
for c in clips:
    starts.append(t); durs.append(len(c) / sr)
    audio += [c, np.zeros(int(GAP * sr), np.float32)]
    t += len(c) / sr + GAP
voice = np.concatenate(audio)
total = len(voice) / sr + 0.6
n = int(total * sr)
voice = np.pad(voice, (0, n - len(voice)))

# ---------- ambient music pad ----------
tt = np.arange(n) / sr
chords = [[110, 164.81, 220, 261.63], [87.31, 130.81, 174.61, 220], [130.81, 196, 261.63, 329.63], [98, 146.83, 196, 246.94]]
music = np.zeros(n, np.float32)
clen = 4.0
for i in range(int(total / clen) + 1):
    c = chords[i % 4]; a0 = int(i * clen * sr); a1 = min(n, int((i + 1.25) * clen * sr))
    if a0 >= n: break
    seg_t = tt[a0:a1] - i * clen
    env = np.clip(seg_t / 1.2, 0, 1) * np.clip((clen * 1.25 - seg_t) / 1.2, 0, 1)
    for f in c:
        music[a0:a1] += (np.sin(2 * np.pi * f * tt[a0:a1]) + 0.3 * np.sin(2 * np.pi * 2 * f * tt[a0:a1] + 0.5)) * env
music += 0.4 * np.sin(2 * np.pi * 55 * tt) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.25 * tt))
music = music / np.abs(music).max() * 0.07
music *= np.clip(tt / 2, 0, 1) * np.clip((total - tt) / 2, 0, 1)
mix = np.clip(voice + music, -1, 1)
wav = os.path.join(D, f"audio_{VOICE}.wav")
with wave.open(wav, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())

# ---------- visuals ----------
def font(p, s): return ImageFont.truetype(p, s)

def gradient(c1, c2, seed):
    y = np.linspace(0, 1, H)[:, None, None]; x = np.linspace(0, 1, W)[None, :, None]
    g = np.array(c1)[None, None] * (1 - y) + np.array(c2)[None, None] * y
    g = g * (0.85 + 0.15 * np.cos((x - 0.5) * 3))
    img = Image.fromarray(np.clip(g, 0, 255).astype(np.uint8))
    rng = np.random.default_rng(seed)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for _ in range(14):
        r = rng.integers(80, 380); cx, cy = rng.integers(-100, W + 100), rng.integers(0, H)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, int(rng.integers(8, 22))))
    for _ in range(120):
        cx, cy = rng.integers(0, W), rng.integers(0, H); r = rng.integers(1, 4)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, int(rng.integers(40, 140))))
    ov = ov.filter(ImageFilter.GaussianBlur(6))
    return Image.alpha_composite(img.convert("RGBA"), ov)

def center_text(d, y, text, f, fill, spacing=10):
    bb = d.multiline_textbbox((0, 0), text, font=f, align="center", spacing=spacing)
    d.multiline_text(((W - (bb[2] - bb[0])) / 2, y), text, font=f, fill=fill, align="center", spacing=spacing)
    return bb[3] - bb[1]

def wrap(d, text, f, maxw):
    words, lines, cur = text.split(), [], ""
    for wd in words:
        t2 = (cur + " " + wd).strip()
        if d.textlength(t2, font=f) <= maxw: cur = t2
        else: lines.append(cur); cur = wd
    lines.append(cur); return lines

def layers(i, s):
    era, people, inv, cols, _ = s
    bg = gradient(cols[0], cols[1], i)
    title = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(title)
    items = []
    if inv:
        center_text(d, 300, era.upper(), font(FR, 46), (255, 255, 255, 200))
        d.rectangle([W / 2 - 60, 380, W / 2 + 60, 386], fill=(255, 210, 90, 255))
        f = font(FXB, 104 if len(people) < 16 else 82)
        lines = wrap(d, people, f, W - 120)
        center_text(d, 420, "\n".join(lines), f, (255, 255, 255, 255))
        y0 = 420 + len(lines) * 120 + 60
        for k, it in enumerate(inv):
            L = Image.new("RGBA", (W, H), (0, 0, 0, 0)); dl = ImageDraw.Draw(L)
            fy = y0 + k * 130
            dl.rounded_rectangle([110, fy, W - 110, fy + 104], radius=52, fill=(0, 0, 0, 90), outline=(255, 255, 255, 70), width=2)
            dl.ellipse([150, fy + 40, 174, fy + 64], fill=(255, 210, 90, 255))
            ff = font(FB, 46 if len(it) < 26 else 38)
            dl.text((200, fy + 52), it, font=ff, fill=(255, 255, 255, 255), anchor="lm")
            items.append(L)
    else:
        center_text(d, 520, people, font(FXB, 118), (255, 255, 255, 255), spacing=18)
    return bg, title, items

def caption_chunks(text):
    w = text.split(); out, cur = [], []
    for x in w:
        cur.append(x)
        if len(" ".join(cur)) > 26 or x[-1] in ".?!,…":
            out.append(" ".join(cur)); cur = []
    if cur: out.append(" ".join(cur))
    return out

fcap = font(FXB, 62)
prepared = [layers(i, s) for i, s in enumerate(SEG)]
caps = []
for i, s in enumerate(SEG):
    ch = caption_chunks(s[4]); tot = sum(len(c) + 4 for c in ch); t0 = starts[i]
    for c in ch:
        dt = durs[i] * (len(c) + 4) / tot; caps.append((t0, t0 + dt, c)); t0 += dt

seg_bounds = [(starts[i] - (GAP_START if i == 0 else GAP / 2), (starts[i + 1] - GAP / 2) if i + 1 < len(SEG) else total) for i in range(len(SEG))]
nframes = int(total * FPS)
silent = os.path.join(D, f"silent_{VOICE}.mp4")
ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                       "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", silent], stdin=subprocess.PIPE)
ease = lambda x: 1 - (1 - min(max(x, 0), 1)) ** 3
for fi in range(nframes):
    t = fi / FPS
    si = next(k for k, b in enumerate(seg_bounds) if t < b[1] or k == len(SEG) - 1)
    b0, b1 = seg_bounds[si]; lt = t - b0
    bg, title, items = prepared[si]
    z = 1.0 + 0.08 * (lt / max(b1 - b0, 1))
    cw, ch_ = int(W / z), int(H / z)
    frame = bg.crop(((W - cw) // 2, (H - ch_) // 2, (W - cw) // 2 + cw, (H - ch_) // 2 + ch_)).resize((W, H), Image.BILINEAR)
    a = ease(lt / 0.6)
    tl = title.copy(); tl.putalpha(tl.getchannel("A").point(lambda v: int(v * a)))
    frame.alpha_composite(tl, (0, int((1 - a) * 60)))
    for k, L in enumerate(items):
        ak = ease((lt - 0.8 - k * 0.9 * (b1 - b0 - 1.5) / max(len(items), 1) / 1.6) / 0.5)
        if ak <= 0: continue
        L2 = L.copy(); L2.putalpha(L2.getchannel("A").point(lambda v: int(v * ak)))
        frame.alpha_composite(L2, (int((1 - ak) * -120), 0))
    cap = next((c for c in caps if c[0] <= t < c[1]), None)
    if cap:
        d = ImageDraw.Draw(frame)
        lines = wrap(d, cap[2], fcap, W - 160); y = 1500
        for ln in lines:
            d.text((W / 2, y), ln, font=fcap, fill=(255, 230, 90) if False else (255, 255, 255), anchor="mm", stroke_width=6, stroke_fill=(0, 0, 0))
            y += 80
    # fade in/out at segment edges
    fade = min(1, lt / 0.25, (b1 - t) / 0.25) if si not in (0,) or lt > 0.25 else min(1, lt / 0.25)
    if si == len(SEG) - 1: fade = min(fade, max(0, (total - t) / 0.8))
    arr = np.asarray(frame.convert("RGB"), dtype=np.float32) * max(fade, 0)
    ff.stdin.write(arr.astype(np.uint8).tobytes())
ff.stdin.close(); ff.wait()
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", silent, "-i", wav, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", OUT], check=True)
os.remove(silent)
print("done", OUT, round(total, 1), "s")
