# Stage 1: re-rig "Skeleton with rig" (Gord Goodwin, CC0) onto a clean UE-mannequin-style armature, pose it into the
# UAL T-pose, apply that as the bind pose, decimate, scale to 1.8 m with the soles on z=0, smart-UV unwrap.
# Saves base.blend (low mesh "Skeleton" + armature "Armature" + high-res bake source "HI").
# usage: blender -b --python build_base.py -- <skeleton-with-rig.glb> <out.blend>
import bpy, sys, math, bmesh
from mathutils import Vector, Matrix, Quaternion

SRC, OUT = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
for o in list(bpy.data.objects):
    if o.name == 'Icosphere': bpy.data.objects.remove(o)
old = bpy.data.objects['Manny_Armature']
parts = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('BONES_')]
OB = old.data.bones
H = lambda n: OB[n].head_local.copy()
T = lambda n: OB[n].tail_local.copy()

# ---------- old vertex group -> new bone ----------
def new_bone(g):
    if g == 'PELVIS' or g == 'VERTEBRAE_L5': return 'pelvis'
    if g in ('VERTEBRAE_L4', 'VERTEBRAE_L3'): return 'spine_01'
    if g in ('VERTEBRAE_L2', 'VERTEBRAE_L1', 'VERTEBRAE_T12', 'VERTEBRAE_T11', 'RIB_T11', 'RIB_T12'): return 'spine_02'
    if g.startswith('VERTEBRAE_T') or g.startswith('RIB_') or g == 'STERNUM': return 'spine_03'
    if g.startswith('VERTEBRAE_C1'): return 'Head'
    if g.startswith('VERTEBRAE_C'): return 'neck_01'
    if g == 'HEAD': return 'Head'
    if g == 'JAW': return 'jaw'
    side = g[-1].lower()
    base = g[:-2]
    m = {'CLAVICLE': 'clavicle', 'SCAPULA': 'clavicle', 'HUMERUS': 'upperarm', 'RADIUS': 'lowerarm', 'ULNA': 'lowerarm',
         'HAND': 'hand', 'PINKY_PALM': 'hand', 'THUMB_PALM': 'thumb_01', 'FING_THUMB_A': 'thumb_02', 'FING_THUMB_B': 'thumb_03',
         'FEMUR': 'thigh', 'TIBIA': 'calf', 'FOOT': 'foot'}
    if base in m: return m[base] + '_' + side
    if base.startswith('FING_'):
        fin = {'INDEX': 'index', 'MID': 'middle', 'RING': 'ring', 'PINKY': 'pinky'}[base.split('_')[1]]
        seg = {'A': '01', 'B': '02', 'C': '03'}[base.split('_')[2]]
        return f'{fin}_{seg}_{side}'
    if base.startswith('TOE_'): return 'ball_' + side
    raise Exception('unmapped group ' + g)

# jaw tip: centroid of the jaw vertices
jaw_c, jaw_n = Vector(), 0
for o in parts:
    gi = o.vertex_groups.get('JAW')
    if not gi: continue
    for v in o.data.vertices:
        for g in v.groups:
            if g.group == gi.index and g.weight > 0.5: jaw_c += o.matrix_world @ v.co; jaw_n += 1
jaw_c /= max(1, jaw_n)

# ---------- new armature (in the source's relaxed A-pose) ----------
def mid(a, b): return (a + b) * 0.5
J = {}
J['root'] = (Vector((0, 0, 1.807)), Vector((0, 0, 4.0)), None)   # at the soles (z = 0 after scaling), pointing up
hipC = mid(H('MCH_femur.L'), H('MCH_femur.R'))
J['pelvis'] = (Vector((0, hipC.y + 0.25, hipC.z + 0.1)), H('VERTEBRAE_L4'), 'root')
J['spine_01'] = (H('VERTEBRAE_L4'), H('VERTEBRAE_L2'), 'pelvis')
J['spine_02'] = (H('VERTEBRAE_L2'), H('VERTEBRAE_T10'), 'spine_01')
J['spine_03'] = (H('VERTEBRAE_T10'), H('VERTEBRAE_C7'), 'spine_02')
J['neck_01'] = (H('VERTEBRAE_C7'), H('HEAD'), 'spine_03')
J['Head'] = (H('HEAD'), Vector((0, H('HEAD').y, 39.3)), 'neck_01')
J['jaw'] = (H('JAW'), jaw_c, 'Head')
for S in 'LR':
    s = S.lower()
    J['clavicle_' + s] = (H('CLAVICLE.' + S), H('HUMERUS.' + S), 'spine_03')
    J['upperarm_' + s] = (H('HUMERUS.' + S), H('MCH_forearm.' + S), 'clavicle_' + s)
    J['lowerarm_' + s] = (H('MCH_forearm.' + S), H('HAND.' + S), 'upperarm_' + s)
    J['hand_' + s] = (H('HAND.' + S), H('FING_MID_A.' + S), 'lowerarm_' + s)
    for fin, src in (('index', 'INDEX'), ('middle', 'MID'), ('ring', 'RING'), ('pinky', 'PINKY')):
        a, b, c = (f'FING_{src}_{x}.{S}' for x in 'ABC')
        J[f'{fin}_01_{s}'] = (H(a), H(b), 'hand_' + s)
        J[f'{fin}_02_{s}'] = (H(b), H(c), f'{fin}_01_{s}')
        J[f'{fin}_03_{s}'] = (H(c), T(c), f'{fin}_02_{s}')
    J['thumb_01_' + s] = (H('THUMB_PALM.' + S), H('FING_THUMB_A.' + S), 'hand_' + s)
    J['thumb_02_' + s] = (H('FING_THUMB_A.' + S), H('FING_THUMB_B.' + S), 'thumb_01_' + s)
    J['thumb_03_' + s] = (H('FING_THUMB_B.' + S), T('FING_THUMB_B.' + S), 'thumb_02_' + s)
    J['thigh_' + s] = (H('MCH_femur.' + S), H('TIBIA.' + S), 'pelvis')
    J['calf_' + s] = (H('TIBIA.' + S), H('FOOT.' + S), 'thigh_' + s)
    ball = mid(H('TOE_MID_A.' + S), H('TOE_INDEX_A.' + S))
    J['foot_' + s] = (H('FOOT.' + S), ball, 'calf_' + s)
    tip = mid(T('TOE_MID_C.' + S), T('TOE_INDEX_C.' + S))
    J['ball_' + s] = (ball, tip, 'foot_' + s)

ad = bpy.data.armatures.new('Armature')
arm = bpy.data.objects.new('Armature', ad)
bpy.context.scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
for name, (h, t, p) in J.items():
    eb = ad.edit_bones.new(name)
    eb.head, eb.tail = h, t
    if (t - h).length < 1e-3: eb.tail = h + Vector((0, 0, 0.3))
    eb.roll = 0
for name, (h, t, p) in J.items():
    if p: ad.edit_bones[name].parent = ad.edit_bones[p]
bpy.ops.object.mode_set(mode='OBJECT')

# ---------- re-weight every part onto the new bones ----------
for o in parts:
    o.parent = None
    o.matrix_world = Matrix.Identity(4)
    names = {g.index: g.name for g in o.vertex_groups}
    acc = []
    for v in o.data.vertices:
        d = {}
        for g in v.groups:
            if g.weight <= 0: continue
            nb = new_bone(names[g.group]); d[nb] = d.get(nb, 0) + g.weight
        acc.append(d)
    for g in list(o.vertex_groups): o.vertex_groups.remove(g)
    groups = {}
    for i, d in enumerate(acc):
        tot = sum(d.values()) or 1
        for nb, w in d.items():
            if nb not in groups: groups[nb] = o.vertex_groups.new(name=nb)
            groups[nb].add([i], w / tot, 'REPLACE')
    for m in list(o.modifiers): o.modifiers.remove(m)
    mod = o.modifiers.new('Armature', 'ARMATURE'); mod.object = arm
bpy.data.objects.remove(old)
# the glTF import split vertices along normals/UVs: weld them so decimation sees connected surfaces
for o in parts:
    bm = bmesh.new(); bm.from_mesh(o.data)
    n0 = len(bm.verts)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bm.to_mesh(o.data); bm.free()
    print('WELD', o.name, n0, '->', len(o.data.vertices))

# high-res copies (smoothed) for the normal bake
his = []
for o in parts:
    c = o.copy(); c.data = o.data.copy(); c.name = 'HI_' + o.name
    bpy.context.scene.collection.objects.link(c)
    c.modifiers['Armature'].object = arm
    his.append(c)

# ---------- pose into the UAL T-pose ----------
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')
PB = arm.pose.bones
def upd(): bpy.context.view_layer.update()
def rotate_world(name, R):
    pb = PB[name]; M = pb.matrix.copy(); h = M.translation.copy()
    pb.matrix = Matrix.Translation(h) @ R.to_matrix().to_4x4() @ Matrix.Translation(-h) @ M
    upd()
def aim(name, child_head_fn, target):
    pb = PB[name]
    d = (child_head_fn() - pb.head).normalized()
    rotate_world(name, d.rotation_difference(target.normalized()))
foot_rest = {}
for s in 'lr':
    foot_rest[s] = PB['foot_' + s].matrix.to_3x3().copy()
for s, sg in (('l', 1), ('r', -1)):
    aim('upperarm_' + s, lambda: PB['lowerarm_' + s].head, Vector((sg, 0, 0)))
    aim('lowerarm_' + s, lambda: PB['hand_' + s].head, Vector((sg, 0, 0)))
    # hand: knuckle direction along the arm, index -> pinky pointing back (+Y in Blender = -Z glTF): palm down
    aim('hand_' + s, lambda: PB['middle_01_' + s].head, Vector((sg, 0, 0)))
    pb = PB['hand_' + s]
    d = Vector((sg, 0, 0))
    a = (PB['pinky_01_' + s].head - PB['index_01_' + s].head); a = (a - d * a.dot(d)).normalized()
    ang = a.angle(Vector((0, 1, 0)))
    if a.cross(Vector((0, 1, 0))).dot(d) < 0: ang = -ang
    rotate_world('hand_' + s, Quaternion(d, ang))
    aim('thigh_' + s, lambda: PB['calf_' + s].head, Vector((0, 0.0, -1)))
    aim('calf_' + s, lambda: PB['foot_' + s].head, Vector((0, 0.03, -1)))
    # foot: keep the sole as it was, but turn the toes in a little (source stands duck-footed)
    cur = PB['foot_' + s].matrix.to_3x3()
    R = foot_rest[s] @ cur.inverted()
    rotate_world('foot_' + s, R.to_quaternion())
    fd = (PB['ball_' + s].head - PB['foot_' + s].head); fd.z = 0; fd.normalize()
    want = Vector((sg * 0.10, -1, 0)).normalized()
    ang = fd.to_2d().angle_signed(want.to_2d())
    rotate_world('foot_' + s, Quaternion((0, 0, 1), -ang))
bpy.ops.object.mode_set(mode='OBJECT')

def apply_mod(o, name):
    bpy.context.view_layer.objects.active = o
    for x in bpy.context.view_layer.objects: x.select_set(x == o)
    bpy.ops.object.modifier_apply(modifier=name)
for o in parts + his: apply_mod(o, 'Armature')
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')
bpy.ops.pose.armature_apply(selected=False)
bpy.ops.object.mode_set(mode='OBJECT')

# ---------- smooth (subdivide once, as the source was meant to be seen), then decimate per part ----------
import os
TARGET = {'BONES_HEAD': 2300, 'BONES_SPINE': 1450, 'BONES_RIBCAGE': 1350, 'BONES_PELVIS': 900,
          'BONES_ARM.L': 850, 'BONES_ARM.R': 850, 'BONES_LEG.L': 560, 'BONES_LEG.R': 560}
SCALE = float(os.environ.get('TRIS_SCALE', '1'))
for o in parts + his:
    m = o.modifiers.new('Sub', 'SUBSURF'); m.levels = 1; m.render_levels = 1
    apply_mod(o, 'Sub')
for o in parts:
    n = sum(len(p.vertices) - 2 for p in o.data.polygons)
    m = o.modifiers.new('Dec', 'DECIMATE'); m.decimate_type = 'COLLAPSE'; m.ratio = TARGET[o.name] * SCALE / n
    m.use_collapse_triangulate = True
    if o.name in ('BONES_HEAD', 'BONES_SPINE', 'BONES_RIBCAGE', 'BONES_PELVIS'): m.use_symmetry = True; m.symmetry_axis = 'X'
    apply_mod(o, 'Dec')
    print('DEC', o.name, n, '->', sum(len(p.vertices) - 2 for p in o.data.polygons))

def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    objs[0].name = name; objs[0].data.name = name
    return objs[0]
lo = join(parts, 'Skeleton')
hi = join(his, 'HI')

# ---------- scale to 1.8 m, soles on the ground ----------
zs = [v.co.z for v in lo.data.vertices]
zmin, zmax = min(zs), max(zs)
k = 1.8 / (zmax - zmin)
print('HEIGHT units', zmax - zmin, 'scale', k)
M = Matrix.Scale(k, 4) @ Matrix.Translation((0, 0, -zmin))
for o in (arm, lo, hi):
    o.matrix_world = M @ o.matrix_world
bpy.ops.object.select_all(action='DESELECT')
for o in (arm, lo, hi): o.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
mod = lo.modifiers.new('Armature', 'ARMATURE'); mod.object = arm
lo.parent = arm
# thicken the bones slightly so the thin skeleton keeps a readable silhouette from the game camera
INFL = float(os.environ.get('INFLATE', '0.0018'))
if INFL:
    lo.data.update()
    for v in lo.data.vertices: v.co += v.normal * INFL
hi.modifiers.clear() if hasattr(hi.modifiers, 'clear') else None
for m in list(hi.modifiers): hi.modifiers.remove(m)
hi.vertex_groups.clear()

# ---------- no UVs: the bone colour is baked into vertex colours (stage 2) ----------
me = lo.data
while me.uv_layers: me.uv_layers.remove(me.uv_layers[0])
me.validate(verbose=True)
for p in me.polygons: p.use_smooth = True
print('LO tris', sum(len(p.vertices) - 2 for p in me.polygons), 'verts', len(me.vertices), 'HI tris', sum(len(p.vertices) - 2 for p in hi.data.polygons))
print('BONES', len(arm.data.bones))
bpy.ops.wm.save_as_mainfile(filepath=OUT)
