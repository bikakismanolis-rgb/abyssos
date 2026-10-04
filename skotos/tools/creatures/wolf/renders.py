# writes the final review sheets of ../out/wolf.glb into renders/
import json, subprocess
M = '../out/wolf.glb'
def sheet(out, frames, cols=4, cell=(300, 260), ref=False, refX=-1.3):
    cfg = {'model': M, 'out': 'renders/' + out, 'cell': list(cell), 'cols': cols, 'frames': frames, 'ref': ref, 'refX': refX}
    r = subprocess.run(['node', 'sheet.mjs', json.dumps(cfg)], capture_output=True, text=True)
    print(out, r.stdout[:80].replace('\n', ' '), r.stderr[:200])
def seq(clip, times, view, dist, center=(0, 0.55, 0.12), sec=True, **kw):
    return [{'clip': clip, ('sec' if sec else 't'): t, 'view': view, 'dist': dist, 'center': list(center), **kw} for t in times]
sheet('walk_side.png', seq('walk', [i / 8 for i in range(8)], 'side', 3.8, sec=False))
sheet('walk_34.png', seq('walk', [0, 0.25, 0.5, 0.75], '34', 4.0, sec=False))
sheet('run_side.png', seq('run', [i / 8 for i in range(8)], 'side', 3.8, sec=False))
sheet('run_34.png', seq('run', [0, 0.25, 0.5, 0.75], '34', 4.2, sec=False))
sheet('idle_34.png', seq('idle', [0, 1.0, 1.3, 2.0, 3.0, 3.6], '34', 4.0), cols=3)
sheet('attack_side.png', seq('attack', [0, 0.2, 0.3, 0.36, 0.42, 0.55, 0.7, 0.9], 'side', 3.8))
sheet('attack2_34.png', seq('attack2', [0, 0.2, 0.3, 0.36, 0.5, 0.7], '34', 4.0), cols=3)
sheet('pounce_side.png', seq('pounce', [0, 0.12, 0.2, 0.28, 0.36, 0.44, 0.52, 0.62, 0.75, 0.9, 1.05, 1.25], 'side', 4.4, center=(0, 0.6, 0.15)))
sheet('howl_34.png', seq('howl', [0, 0.5, 1.0, 1.8, 2.6, 3.2], '34', 4.0, center=(0, 0.7, 0.12)), cols=3)
sheet('hit_34.png', seq('hit', [0, 0.05, 0.1, 0.2, 0.35, 0.55], '34', 4.0), cols=3)
sheet('die_34.png', seq('die', [0, 0.15, 0.4, 0.6, 0.8, 1.0, 1.3, 2.0], '34', 4.2, center=(0, 0.4, 0.1)))
sheet('closeups.png', [
  {'clip': 'idle', 'sec': 0, 'view': '34', 'zoom': 'head', 'dist': 1.3, 'label': 'idle face'},
  {'clip': 'attack', 'sec': 0.36, 'view': 'side', 'zoom': 'head', 'dist': 1.8, 'label': 'attack jaw open'},
  {'clip': 'howl', 'sec': 1.8, 'view': '34', 'zoom': 'head', 'dist': 1.6, 'label': 'howl'},
  {'clip': 'die', 't': 1, 'view': 'front', 'zoom': 'head', 'dist': 1.6, 'label': 'dead'}], cell=(300, 300))
G = {'view': 'game', 'center': [-0.4, 0.6, 0], 'fov': 16}
sheet('game_view.png', [
  {'clip': 'idle', 't': 0.1, **G, 'label': 'idle (game cam, 1.8 m warden)'}, {'clip': 'walk', 't': 0.3, **G, 'rot': 0.6, 'label': 'walk'},
  {'clip': 'run', 't': 0.4, **G, 'rot': 1.57, 'label': 'run, side-on'}, {'clip': 'attack', 'sec': 0.36, **G, 'rot': 0.4, 'label': 'attack 0.36 s'},
  {'clip': 'pounce', 'sec': 0.3, **G, 'rot': 1.2, 'label': 'pounce 0.3 s'}, {'clip': 'howl', 'sec': 1.8, **G, 'rot': -0.8, 'label': 'howl'},
  {'clip': 'hit', 'sec': 0.08, **G, 'rot': -0.4, 'label': 'hit'}, {'clip': 'die', 't': 1, **G, 'label': 'die end'}], cols=4, cell=(360, 360), ref=True)
