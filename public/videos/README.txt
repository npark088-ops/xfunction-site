Hero background video album — used by components/DroneBackground.tsx.

Files here (exact names matter):
  city-1.webm / city-1.mp4  ...  city-4.webm / city-4.mp4
  CREDITS.txt               source, creator, license and download date per clip

The hero plays city-1, then city-2, city-3, city-4, then loops, crossfading
between clips. webm (VP9) is tried first, mp4 (H.264) is the fallback. A clip
whose files are missing is skipped; if city-1 is missing there is no video at
all (just the still photo with a slow pan/zoom).

To swap or add clips: keep the numbered names, or edit DEFAULT_CLIPS at the top
of components/DroneBackground.tsx. Recommended per clip: 8-12 seconds,
1920x1080 or smaller, 24-30 fps, no audio, about 2-4 MB (only city-1 loads
up front; the rest preload while the previous one plays). Update CREDITS.txt
when you change a clip.

The site never shows video on screens narrower than 640px, for visitors who
prefer reduced motion, or on Save-Data connections; they get the still photo.
