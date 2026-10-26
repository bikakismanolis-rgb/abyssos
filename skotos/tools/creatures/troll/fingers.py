# Stage 2 (Blender 4.2): adds a finger chain (fingers1 -> fingers2) and a thumb bone to each hand of clean.blend and
# splits the hand weights geometrically (bands along the hand axis; thumb = medial side near the wrist). Saves rig.blend.
import bpy, os
from mathutils import Vector
F = float(os.environ.get('TROLL_SCALE', '0.9')) / 0.9   # thresholds were measured at scale 0.9
K1, K2, TZ = 0.30 * F, 0.44 * F, 0.15 * F
arm = bpy.data.objects['Armature']; med = bpy.data.objects['med']
def ss(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
plan = {}
for s in 'LR':
    b = arm.data.bones['hand_' + s]; M = b.matrix_local; H = M.translation.copy(); R = M.to_3x3()
    X, Y, Z = R.col[0].copy(), R.col[1].copy(), R.col[2].copy()
    if Z.x * (-H.x) < 0: Z = -Z          # +Z = medial (thumb side)
    gi = med.vertex_groups['hand_' + s].index
    rows = []
    for v in med.data.vertices:
        wh = sum(g.weight for g in v.groups if g.group == gi)
        if wh <= 0: continue
        d = v.co - H; u, w = d.dot(Y), d.dot(Z)
        th = ss(TZ - 0.03 * F, TZ + 0.03 * F, w) * (1 - ss(0.33 * F, 0.38 * F, u)) * ss(0.03 * F, 0.13 * F, u)
        a = ss(K1 - 0.03 * F, K1 + 0.03 * F, u) * (1 - th); bb = ss(K2 - 0.025 * F, K2 + 0.025 * F, u)
        rows.append((v.index, wh, th, a, bb, u, w, v.co.copy()))
    def cen(sel):
        pts = [r[7] for r in rows if sel(r)]
        return sum(pts, Vector()) / len(pts), len(pts)
    c1, n1 = cen(lambda r: r[1] > 0.6 and r[2] < 0.1 and abs(r[5] - K1) < 0.03 * F)
    c2, n2 = cen(lambda r: r[1] > 0.6 and r[2] < 0.1 and abs(r[5] - K2) < 0.03 * F)
    c3, n3 = cen(lambda r: r[1] > 0.6 and r[2] < 0.1 and r[5] > K2 + 0.08 * F)
    t0, m0 = cen(lambda r: r[2] > 0.5 and r[5] < 0.17 * F)
    t1, m1 = cen(lambda r: r[2] > 0.5 and r[5] > 0.26 * F)
    print('HAND', s, 'n', len(rows), 'c1', n1, 'c2', n2, 'c3', n3, 't0', m0, 't1', m1)
    plan[s] = dict(rows=rows, c1=c1, c2=c2, c3=c3, t0=t0, t1=t1, Z=Z)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
eb = arm.data.edit_bones
for s, p in plan.items():
    hand = eb['hand_' + s]
    f1 = eb.new('fingers1_' + s); f1.head, f1.tail = p['c1'], p['c2']; f1.parent = hand; f1.align_roll(p['Z'])
    f2 = eb.new('fingers2_' + s); f2.head, f2.tail = p['c2'], p['c3']; f2.parent = f1; f2.use_connect = True; f2.align_roll(p['Z'])
    t = eb.new('thumb_' + s); t.head, t.tail = p['t0'], p['t1']; t.parent = hand; t.align_roll(p['Z'])
    for x in (f1, f2, t): x.use_deform = True
bpy.ops.object.mode_set(mode='OBJECT')
for s, p in plan.items():
    gh = med.vertex_groups['hand_' + s]
    g1 = med.vertex_groups.new(name='fingers1_' + s); g2 = med.vertex_groups.new(name='fingers2_' + s); gt = med.vertex_groups.new(name='thumb_' + s)
    for (i, wh, th, a, bb, u, w, co) in p['rows']:
        wt, w1, w2 = wh * th, wh * a * (1 - bb), wh * a * bb
        rest = wh - wt - w1 - w2
        gh.add([i], rest, 'REPLACE')
        for g, x in ((gt, wt), (g1, w1), (g2, w2)):
            if x > 1e-4: g.add([i], x, 'REPLACE')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(os.environ['TD'], 'rig.blend'))
print('SAVED')
