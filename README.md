# Trafalgar Park

A party-game show for TikTok LIVE. Two browser pages share one Python server:

| Page | Who sees it | What it is |
|---|---|---|
| `index.html` | **the audience** (capture this window in TikTok LIVE Studio) | The *display*. It only ever receives what the audience may see. |
| `admin.html` | **only you** (never capture it) | The *host* page. It owns the game, shows every answer and has all the controls. |

Nobody plays from chat yet, but all input goes through one command router (`App.cmd(name, arg)` in `js/engine.js`),
so a future chat / viewer integration can simply call it.

## Run it

1. Install Python 3 (standard library only – nothing else to install).
2. In this folder run:

   ```
   python serve.py
   ```

   It prints both addresses (default `http://localhost:8000`). Another port: `python serve.py 8123`.
3. Open **`http://localhost:8000/index.html`** in one browser window → add that window to TikTok LIVE Studio as a *Window Capture*.
4. Open **`http://localhost:8000/admin.html`** in a *separate* window (another monitor / browser profile is ideal).
   The admin top bar shows **● Display connected** when the two pages are talking.
5. Click once inside the display window so the browser allows sound ("Click here once to enable sound" chip).

Both pages must be the same browser and the same address (they talk through `BroadcastChannel`, with a `localStorage` fallback).
The admin page contains a small live preview of what the audience sees.

## Controls

On-screen buttons on the display (Correct / Skip / Incorrect, Start …) and on the admin do the same thing – use either.

| Key | Action |
|---|---|
| Space | Start / pause |
| C | Correct |
| S | Skip |
| X | Incorrect / Taboo |
| N | Next |
| H | Hide / show the on-screen host buttons on the display |
| M | Mute (remembered) |
| F | Fullscreen |
| Esc | Back (in a running game press twice to leave) |
| W | Spin the wheel (Number Hunt) |
| O | Bottle Blind: show / hide the order to the audience |
| 1–6, B K R G Y W, Enter | Bottle Blind swaps (position / colour mode), Enter confirms; Esc clears |
| A–D then 1–4 | Number Hunt: call a cell (e.g. D then 2; column C is also the C key) |
| ? | Shortcut help |

* **Adapt to screen** (toolbar on the display – move the mouse to reveal it – or the admin top bar): by default the display is a fixed 16:9 stage; this makes it fit any window shape, including portrait. Remembered.
* Mute, adapt and hide-buttons are shared by both pages and remembered.
* Progress is **autosaved**; if the admin page is reloaded you are offered "Resume game".

## Modes: Normal or Team Tournament

After "Let's play" (or the Hub) you first choose a **mode**:

* **Normal** – the 9-game hub, one game at a time (as before).
* **Team Tournament** – 2 teams of 4. On admin enter the team names, the 8 player names, pick **4 games** (any of Bottle Blind, Higher or Lower, Finish the Proverb, Speed Maths, Picture Game; the same game may be picked twice) and choose the **format**:
  * **Quick (default, 4 matches in total)** – player 1 of each team plays game 1, player 2 plays game 2, player 3 game 3, player 4 game 4. Win your match = your team wins that game. 2–2 after four games → pick a decider game, played by a random pair.
  * **Big (16 matches)** – for when there are prizes. Each game is **4 head-to-heads**: player 1 of A v player 1 of B, 2 v 2, 3 v 3, 4 v 4, each played with the normal engine of that game. The team that wins **more of the 4 matches wins the game**.
  * **2–2 in a game** → one sudden-death match between a random pair decides it.
  * The team that wins more games wins the tournament (confetti + result screen). **2–2 after four games** → you pick a decider game.
  * The display shows an overview card per game with every pairing and result; press *Start match* (Space) for each match, *Continue* when it ends. Esc (twice) or the Hub button steps back one level (match → overview → mode choice). Autosave/resume works inside a tournament.
  * Number Hunt, Taboo, 30 Seconds and Imposter are not part of the tournament – play them in Normal mode.

## The games

30 Seconds · Taboo (4-team tournament, Normal / Hard) · Imposter (3–8 players) · Picture Game · Bottle Blind · Higher or Lower · Finish the Proverb · Speed Maths · Number Hunt (9 cards, 3×3 hub).
(Trivia is still in the code, hidden; `App.cmd('open','trivia')` in the admin console opens it.)

* **Finish the Proverb** has two levels chosen at setup: **Easy** (default, 100 very well-known sayings and verses) and **All** (257, with the harder / international ones). **Incorrect shows the correct ending on screen**; press Skip / Next for a new one. It also includes 90+ well-known **Christian scriptures** (e.g. "For God so loved the world, …"), never from the Book of Proverbs. The display chip says only "📖 Scripture"; the reference (book, chapter, verse) is on admin. Wording follows the KJV (a few NIV); the host judges, so close wording counts.
* **Duel games** (Picture, Higher or Lower, Proverb): 60 s clock each, the active player's clock runs; Correct passes the turn to the other player on a new item, Skip = new item, Incorrect = buzzer; first clock to 0 loses.
* **Imposter**: the secret roles are shown **only on the admin page** (pass that screen around). The stream shows who is peeking, the timer, and the result.
* **Speed Maths**: easy mental maths – tallies (two sets of 1–12 marks, total ≤ 20) and Roman numerals I–XX (add, subtract, or convert one numeral). Players go one after the other (60 s, different sums). Wrong answer = −1 s; every 5 correct in a row = +2 bonus. A skip or a wrong answer resets the streak. Ties → 30 s sudden death.
* **Taboo Knockout**: type in as many names as you like (one per line or comma-separated). They are shuffled at random into teams of 2 (an odd person joins a team). Every team owns **one box** in the draw. Each round all boxes are shuffled and paired; a pair is a Taboo match between the two box owners (one 90 s round each – more points wins, a tie is a sudden-death round). **The winner takes the loser's box** (a team with two boxes is drawn twice as often) and the boxes are shuffled again, until one team owns them all. A team with no box left is out. *Re-draw this pair* and the score fix-ups are on the host panel.
* **Number Hunt**: a 4×4 grid (columns A–D, rows 1–4) hides 1–16 face-down. After the **Spin the Wheel** picks who starts (key **W**), each player hunts 1, 2, 3 … in order by calling cells ("D2"). The host taps the cell on admin (or type **D** then **2**); it flips for 1 second then back. Wrong cell = progress back to 0 and the turn passes; first to 16 in a row wins. The shuffle exists only in memory (cryptographic random), is never shown – not even to the host – and autosave keeps it scrambled. *Undo last tap* and ±1 progress adjust are on admin.
* **Spin the Wheel** is a reusable component (`TP.wheel` in `js/engine.js`; renderer block `wheel` in `js/render.js`): `w=TP.wheel.spin(2)`, show `TP.wheel.block(w,names)`, call `TP.wheel.tick(w)` from your game's `tick()`. The result uses `crypto.getRandomValues`; mute applies.
* **Bottle Blind**: each round (per player, and per tiebreaker) goes **hidden → show → hide → play**. The display starts with "Get ready" and 6 blank slots (the order is not even sent to it); admin presses *Show order to audience* (**O**), then *Hide order* (**O**) – only then are placing, swaps and Check unlocked. You always see the order on admin (own eye toggle). Click bottles into the slots as the player calls them, press **Check** (display shows only "N of 6 in the correct place"). Slots are never cleared between attempts: use the **swap bar** – *by position* (keys 1–6) or *by colour* (B K R G Y W) – pick two, press **Swap** / Enter. Swaps are not attempts; the old count stays on the display, greyed, until the next Check. *Undo swap* and *Undo last check* are separate.

## Adding your own pictures (Picture Game)

The app never downloads pictures – you supply them.

1. Inside `assets/pictures/` there is one folder per category. Make a new folder to make a new category
   (the four starter folders are **Landmarks, Animals, Food, Nature**; empty categories are greyed out in admin and skipped by *Mixed*).
2. Put images in the folder. **The file name is the answer**: `Eiffel Tower.jpg`, `Table Mountain.png`, `African Elephant.webp` …
   (underscores become spaces, a trailing ` (2)` is ignored, so `Eiffel Tower (2).jpg` is also "Eiffel Tower").
   Supported: jpg, jpeg, png, webp, gif, avif, bmp, svg.
3. Run the scanner:

   ```
   python tools/build_manifest.py
   ```

   It writes `assets/pictures/manifest.json` (`category → [{file, answer}]`).
4. In admin press **Re-scan picture folders** (or reload admin). The category appears in the Picture Game picker.

The display receives the picture as an in-memory image only – the file name (the answer) never reaches the display page.
**Delete the folder `assets/pictures/PLACEHOLDER - delete this folder`** (a small blue test image included only to test the pipeline) and run the scanner again.

## Other tools and folders

```
serve.py                 the server (files only)
index.html, admin.html   display / host pages
css/                     light theme (burgundy · navy · sky blue · gold)
js/core.js               shared: settings, message bus, sound, confetti, shortcuts
js/render.js, display.js display renderer (no data, no answers)
js/engine.js, admin.js   admin engine, autosave, host panel
js/games/                one file per game (duel.js = shared duel engine)
js/gen/                  generated artwork: maths images, tally marks, Roman numerals, bottles
data/                    ALL game content, one file per game (answers!) – only admin.html loads these
assets/flags/            195 flags (offline) + CREDITS.txt
assets/pictures/         your pictures + manifest.json
tools/build_manifest.py  scan picture folders
tools/fetch_flags.py     (re)download the flags once from flagcdn.com
tests/check_content.js   content quality checks:     node tests/check_content.js
tests/e2e.js             end-to-end tests (run in the admin page console, see header of the file)
```

## Content notes

* Current-affairs items were checked by web search on **16 October 2026** and are marked with `verified` in the data files
  (e.g. Spain won the FIFA World Cup 2026, Andy Burnham became UK Prime Minister on 20 July 2026, Navi Pillay won the 2026 Nobel Peace Prize).
  Items that could not be confirmed were left out. Update `data/*.js` if the world changes.
* Higher/Lower figures: see the source notes at the top of `data/higherlower.js`. Ages are computed on the day you play from dates of birth.
* Decks never repeat an item until the whole pool has been used; duplicate items in a data file are removed automatically.

## LAN mode: laptop + iPad (no internet, no phones pairing)

The simplest way to play with one laptop and one iPad (or a phone / second monitor) on the same Wi-Fi:

1. On the laptop **double-click `start-lan.bat`** (or run `python serve.py --lan`). A page opens with a QR code and the addresses. If Windows asks about the firewall, allow Python on **Private networks**.
2. Laptop: click **Open the HOST** (`http://localhost:8000/admin.html?lan=1`) – keep this window to yourself, it shows the answers.
3. iPad: scan the QR code with the camera (or type the address, e.g. `http://192.168.1.20:8000/index.html?lan=1`) – this is the **screen**. Tap it once so it can play sound.
4. Play as normal. The laptop sends the iPad only what the audience may see; button presses on the iPad go back to the laptop.

No Wi-Fi at the venue? On Windows turn on **Settings > Network > Mobile hotspot** and join it from the iPad - nothing needs internet. On the iPad set **Auto-Lock > Never**; **Share > Add to Home Screen** gives a full-screen view.
The laptop can also capture the iPad-style screen: just keep using `index.html` on the laptop for TikTok LIVE as before.

## Playing outdoors on phones / iPads (no PC, minimal data)

Two phones (or iPads) are enough: the **host** phone has the answers and the controls, the **screen** phone shows the game to everybody. Both can be iPhones.

**One-time setup, at home on Wi-Fi (about 4-6 MB, then it works with no internet at all):**
1. Put the game online as a static site – the easiest is **GitHub Pages**: push this folder to a GitHub repository, then *Settings ▸ Pages ▸ Deploy from a branch ▸ main / (root)*. The address is `https://YOUR-USERNAME.github.io/trafalgar-park/start.html`.
   *Note: free GitHub Pages needs a **public** repository, so the questions/answers in `data/` (and any pictures you add) are readable by anyone who finds the link. Netlify / Cloudflare Pages / Vercel can publish a private repository for free if you prefer.*
2. On **each** phone open that address in **Safari**, wait for **"✅ Ready for offline use"** on the start page, then **Share ▸ Add to Home Screen** and open the game from the new icon.

**At the event:**
1. Host phone: turn on **Personal Hotspot**. Screen phone: join that Wi-Fi. (Traffic between the two phones stays on that little network – it uses no mobile data. Bluetooth is not possible from a web page on iPhone.)
2. Set **Settings ▸ Display & Brightness ▸ Auto-Lock ▸ Never** on both (the game also asks the phone to stay awake) and turn the brightness up.
3. Host phone: open the game, tap **🎛 The HOST**, then **📲 Connect a screen** – a QR code appears (allow the camera when asked).
4. Screen phone: open the game, tap **📺 The SCREEN** and scan that code (or paste it). It then shows its own reply code.
5. Host phone: tap **Step 2 ▶ Scan the screen's reply** and scan the reply. Done – "✅ Connected".

If the link ever drops, the screen shows **📲 Reconnect to host**; repeat steps 3-5.
Two buttons at the bottom of the host phone switch between **🎛 Host** (controls + answers) and **📺 Screen** (a live copy of what the audience sees).
The screen phone never receives an answer – only what the audience may see.

**Just one phone?** Tap **🙋 ONE phone only** (Taboo, 30 Seconds, or anything): the *Host* tab holds the setup and controls, the *Screen* tab is the game board. For Taboo with two phones you can simply use this on one phone and pass it around.

**After you change any file** run `python tools/build_sw.py` before pushing, so the phones refresh their offline copy. (The phones pick up new versions automatically when they have internet.)

Technical notes: the two phones talk over a WebRTC data channel set up from the QR codes (no server, no STUN, local network only; `js/pair.js`). QR codes use `vendor/qrcode.js` (MIT) and `vendor/jsQR.js` (Apache-2.0). Offline support is a service worker (`sw.js` + `precache.json`).

## Setting up on another PC

You need three things on the new PC: **Python 3**, a browser (Chrome or Edge), and this folder. Nothing else – no internet is needed while playing (the flags are included).

1. **Install Python** from <https://www.python.org/downloads/> – tick **"Add python.exe to PATH"** in the installer. Check with `python --version` in a new Command Prompt.
2. **Get the project** – either:
   * **With GitHub (recommended):** install Git from <https://git-scm.com/download/win>, then
     ```
     git clone https://github.com/YOUR-USERNAME/trafalgar-park.git
     cd trafalgar-park
     ```
   * **Without GitHub:** copy the whole `trafalgar-park` folder (about 3 MB) by USB stick / cloud drive / zip, and unzip it anywhere.
3. **Start it:** open a Command Prompt in the folder and run `python serve.py` (leave that window open).
4. Open `http://localhost:8000/index.html` (the display – capture this in TikTok LIVE Studio) and, in a separate window, `http://localhost:8000/admin.html` (host only). Click once in the display window to allow sound.

Things that do **not** travel with the folder: the browser's autosave / remembered names (they live in each browser), and your own pictures if you did not commit them – copy `assets/pictures/` too and run `python tools/build_manifest.py`.

### Updating the other PC later
On the main PC: `git add -A`, `git commit -m "message"`, `git push`. On the other PC: `git pull`.
