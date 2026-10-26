# Stage 1 (Blender 4.2): Executioner (thecubber, CC-BY 3.0) -> clean FK rig for Ashspawn
#  - constraints, IK/control bones, actions, lights removed; toe_target weights merged into the toes
#  - fingers curled into fists, baked into the mesh, pose applied as rest; finger bones merged into the hands
#  - bones renamed (no dots), hips pivot moved to the hip joints, Body root removed
#  - scaled (ASH_SCALE), soles on z=0; hand frames + grip frames written to rig.json (glTF coords)
import bpy, os, json, math
from mathutils import Matrix, Vector, Quaternion
E = os.environ
SCALE = float(E.get('ASH_SCALE', '1.1'))
CURL = json.loads(E.get('ASH_CURL', '{"01": 62, "02": 78, "03": 52, "t1": 12, "t2": 28, "t3": 40}'))
sc = bpy.context.scene
for o in list(bpy.data.objects):
    if o.type == 'LIGHT' or o.type == 'CAMERA': bpy.data.objects.remove(o, do_unlink=True)
for o in bpy.data.objects:
    if o.name not in sc.collection.objects:
        try: sc.collection.objects.link(o)
        except Exception: pass
def unhide(lc):
    lc.exclude = False; lc.hide_viewport = False
    for ch in lc.children: unhide(ch)
unhide(bpy.context.view_layer.layer_collection)
for o in bpy.data.objects: o.hide_set(False); o.hide_viewport = False
arm = bpy.data.objects['Rig']; me = bpy.data.objects['Exec_mesh']
for pb in arm.pose.bones:
    for c in list(pb.constraints): pb.constraints.remove(c)
    pb.matrix_basis.identity()
if arm.animation_data:
    arm.animation_data.action = None
    for t in list(arm.animation_data.nla_tracks): arm.animation_data.nla_tracks.remove(t)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
bpy.context.view_layer.update()

def merge_groups(o, mapping, keep):
    names = {g.index: g.name for g in o.vertex_groups}
    acc = []
    for v in o.data.vertices:
        w = {}
        for g in v.groups:
            n = names[g.group]; n = mapping.get(n, n)
            if n in keep and g.weight > 0: w[n] = w.get(n, 0) + g.weight
        acc.append(w)
    # vertices without any weight: copy the weights of the nearest weighted vertex
    from mathutils.kdtree import KDTree
    vs = o.data.vertices; good = [i for i, w in enumerate(acc) if sum(w.values()) > 0]
    kd = KDTree(len(good))
    for j, i in enumerate(good): kd.insert(vs[i].co, j)
    kd.balance()
    nfix = 0
    for i, w in enumerate(acc):
        if sum(w.values()) <= 0:
            co, j, dist = kd.find(vs[i].co); acc[i] = dict(acc[good[j]]); nfix += 1
            if nfix < 6: print('UNWEIGHTED', i, tuple(round(c, 3) for c in vs[i].co), '->', acc[i])
    print('FIXED UNWEIGHTED', nfix)
    for g in list(o.vertex_groups): o.vertex_groups.remove(g)
    groups = {}
    for i, w in enumerate(acc):
        t = sum(w.values())
        for n, x in w.items():
            if n not in groups: groups[n] = o.vertex_groups.new(name=n)
            groups[n].add([i], x / t, 'REPLACE')

FING = ['finger_pinky', 'finger_ring', 'finger_middle', 'finger_index', 'thumb']
DEFORM = ['pelvis', 'spine.01', 'spine.02', 'spine.03', 'neck', 'head']
for s in 'LR':
    DEFORM += [f'shoulder.{s}', f'upper_arm.{s}', f'forearm.{s}', f'hand.{s}', f'thigh.{s}', f'shin.{s}', f'tarsal.{s}', f'toe.{s}']
    DEFORM += [f'{f}.0{i}.{s}' for f in FING for i in (1, 2, 3)]
merge_groups(me, {'toe_target.L': 'toe.L', 'toe_target.R': 'toe.R'}, set(DEFORM))

# ---- curl the fingers (pose), bake into the mesh, apply as rest ----
def W(b): return arm.matrix_world @ arm.pose.bones[b].head
def WT(b): return arm.matrix_world @ arm.pose.bones[b].tail
def handframe(s):
    h = W(f'hand.{s}'); k = {f: W(f'{f}.01.{s}') for f in FING}
    kn = (k['finger_index'] + k['finger_middle'] + k['finger_ring'] + k['finger_pinky']) / 4
    d = (kn - h).normalized()
    across = (k['finger_index'] - k['finger_pinky']); across = (across - d * across.dot(d)).normalized()
    pn = d.cross(across).normalized()
    if (pn.x > 0) == (s == 'L'): pn = -pn       # palm faces the body
    return h, kn, d, across, pn
pre = {s: handframe(s) for s in 'LR'}
log = {}
for s in 'LR':
    h, kn, d, across, pn = pre[s]
    for f in FING:
        for i in (1, 2, 3):
            b = f'{f}.0{i}.{s}'; pb = arm.pose.bones[b]
            ang = math.radians(CURL[('t' + str(i)) if f == 'thumb' else ('0' + str(i))])
            if f == 'thumb': target = (pn * 0.7 - across * 0.5).normalized()
            else: target = pn
            best = None
            for sg in (1, -1):
                pb.rotation_mode = 'QUATERNION'
                pb.rotation_quaternion = Quaternion((1, 0, 0), sg * ang)
                bpy.context.view_layer.update()
                t1 = WT(b)
                pb.rotation_quaternion = Quaternion()
                bpy.context.view_layer.update()
                t0 = WT(b)
                sc_ = (t1 - t0).dot(target)
                if best is None or sc_ > best[0]: best = (sc_, sg)
            pb.rotation_quaternion = Quaternion((1, 0, 0), best[1] * ang)
            bpy.context.view_layer.update()
            log[b] = best[1]
print('CURL SIGNS', log)
bpy.context.view_layer.objects.active = me
for m in me.modifiers:
    if m.type == 'ARMATURE': m.object = arm
mods = [m for m in me.modifiers if m.type == 'ARMATURE']
bpy.ops.object.select_all(action='DESELECT'); me.select_set(True); bpy.context.view_layer.objects.active = me
bpy.ops.object.modifier_apply(modifier=mods[0].name)
bpy.context.view_layer.objects.active = arm; arm.select_set(True)
bpy.ops.object.mode_set(mode='POSE')
bpy.ops.pose.select_all(action='SELECT')
bpy.ops.pose.armature_apply(selected=False)
bpy.ops.object.mode_set(mode='OBJECT')

# ---- unparent, scale, ground ----
mw = me.matrix_world.copy(); me.parent = None; me.matrix_world = mw
for o in (arm, me): o.matrix_world = Matrix.Scale(SCALE, 4) @ o.matrix_world
bpy.ops.object.select_all(action='DESELECT')
for o in (arm, me): o.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
zmin = min(v.co.z for v in me.data.vertices)
for o in (arm, me): o.location.z -= zmin
bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
bpy.context.view_layer.update()

# ---- hand + grip frames (glTF coords: x, z, -y) ----
G = lambda v: [v.x, v.z, -v.y]
rig = {'scale': SCALE, 'zmin_was': zmin, 'hands': {}}
for s in 'LR':
    h, kn, d, across, pn = handframe(s)
    k2 = [W(f'{f}.02.{s}') for f in FING[:4]]; k3 = [W(f'{f}.03.{s}') for f in FING[:4]]
    tips = [WT(f'{f}.03.{s}') for f in FING[:4]]
    k1 = [W(f'{f}.01.{s}') for f in FING[:4]]
    ring = sum(k1 + k2 + k3 + tips, Vector()) / 16
    rig['hands'][s] = {'hand': G(h), 'knuckles': G(kn), 'dir': G(d), 'across': G(across), 'palm': G(pn), 'fist': G(ring),
                       'k1': [G(v) for v in k1], 'k2': [G(v) for v in k2], 'k3': [G(v) for v in k3], 'tips': [G(v) for v in tips],
                       'thumb': [G(W(f'thumb.0{i}.{s}')) for i in (1, 2, 3)] + [G(WT(f'thumb.03.{s}'))]}

# ---- merge fingers into hands, drop control bones, rename ----
mp = {}
for s in 'LR':
    for f in FING:
        for i in (1, 2, 3): mp[f'{f}.0{i}.{s}'] = f'hand.{s}'
REN = {'pelvis': 'hips', 'spine.01': 'spine', 'spine.02': 'spine2', 'spine.03': 'chest', 'neck': 'neck', 'head': 'head'}
for s in 'LR':
    REN.update({f'shoulder.{s}': f'shoulder_{s}', f'upper_arm.{s}': f'upperarm_{s}', f'forearm.{s}': f'forearm_{s}', f'hand.{s}': f'hand_{s}',
                f'thigh.{s}': f'thigh_{s}', f'shin.{s}': f'shin_{s}', f'tarsal.{s}': f'foot_{s}', f'toe.{s}': f'toe_{s}'})
merge_groups(me, mp, set(REN.keys()))
for g in me.vertex_groups: g.name = REN[g.name]
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
eb = arm.data.edit_bones
for b in list(eb):
    if b.name not in REN: eb.remove(b)
eb['pelvis'].parent = None
th = (eb['thigh.L'].head + eb['thigh.R'].head) / 2
eb['pelvis'].head = Vector((0, th.y, th.z)); eb['pelvis'].tail = Vector((0, th.y, th.z + 0.3)); eb['pelvis'].roll = 0
for b in eb: b.use_deform = True
for b in ('spine.01', 'thigh.L', 'thigh.R'): eb[b].use_connect = False
bpy.ops.object.mode_set(mode='OBJECT')
for o, n in REN.items(): arm.data.bones[o].name = n
arm.name = 'ashspawn_rig'
me.parent = arm
m = me.modifiers.new('Armature', 'ARMATURE'); m.object = arm
me.name = 'ashspawn'; me.data.name = 'ashspawn'
while me.data.color_attributes: me.data.color_attributes.remove(me.data.color_attributes[0])
uvs = me.data.uv_layers
for n in [l.name for l in uvs][1:]: uvs.remove(uvs.get(n))
rig['zmax'] = max(v.co.z for v in me.data.vertices)
rig['bones'] = [(b.name, b.parent.name if b.parent else None, G(b.head_local)) for b in arm.data.bones]
json.dump(rig, open(os.path.join(E['TD'], 'rig.json'), 'w'), indent=1)
print('ZMAX', rig['zmax'], 'BONES', len(arm.data.bones))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(E['TD'], 'clean.blend'))
# quick export (original material) for inspection
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(E['TD'], 'base_raw.glb'), export_format='GLB', export_animations=False, export_apply=False,
    export_lights=False, export_cameras=False, export_image_format='AUTO', export_yup=True, export_skins=True, export_def_bones=False,
    export_tangents=False, export_attributes=False)
print('DONE')
