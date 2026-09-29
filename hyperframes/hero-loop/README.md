# Hero loop (HyperFrames)

Source of `public/video/hero-loop.*` — a 16 s seamless loop built from the
property photos (Ken Burns + crossfades, closing frame == opening frame).

Re-render (e.g. after the owner supplies better photos — replace `assets/*.jpg`,
keep 16:9, ideally ≥1600 px wide):

```bash
cd hyperframes/hero-loop
npx hyperframes check
npx hyperframes render --output renders/hero-master.mp4 --fps 30 --quality high
# web encodes
ffmpeg -i renders/hero-master.mp4 -an -c:v libx264 -pix_fmt yuv420p -preset slow -crf 26 -movflags +faststart ../../public/video/hero-loop.mp4
ffmpeg -i renders/hero-master.mp4 -an -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 ../../public/video/hero-loop.webm
ffmpeg -i renders/hero-master.mp4 -an -c:v libx264 -pix_fmt yuv420p -preset slow -crf 28 -movflags +faststart -vf scale=720:-2 ../../public/video/hero-loop-sm.mp4
ffmpeg -i ../../public/video/hero-loop.mp4 -frames:v 1 -q:v 3 ../../public/video/hero-poster.jpg
```
