# Stage 1 (Blender 4.2): Troll Mauler (piacenti, CC-BY 3.0) -> clean FK rig, metres, feet on the ground, saved as clean.blend
#  - constraints / IK control bones removed (their weights merged into the feet), Bone.004 merged into the hips
#  - bones renamed (no dots), hips pivot moved to the hip joints, low-poly duplicates / floor / lights removed
#  - loincloth re-weighted (hips + thighs), stale vertex groups dropped, vertex colours dropped
import bpy, os, sys
from mathutils import Matrix, Vector
D = os.path.dirname(os.path.abspath(__file__)) if '__file__' in dir() else os.getcwd()
SCALE = float(os.environ.get('TROLL_SCALE', '0.9'))
sc = bpy.context.scene
for o in bpy.data.objects:
    if o.name not in sc.collection.objects: sc.collection.objects.link(o)
def unhide(lc):
    lc.exclude = False; lc.hide_viewport = False
    for ch in lc.children: unhide(ch)
unhide(bpy.context.view_layer.layer_collection)
for o in bpy.data.objects: o.hide_set(False); o.hide_viewport = False; o.hide_render = False
arm = bpy.data.objects['Armature']
for pb in arm.pose.bones:
    for c in list(pb.constraints): pb.constraints.remove(c)
    pb.matrix_basis.identity()
if arm.animation_data:
    arm.animation_data.action = None
    for t in list(arm.animation_data.nla_tracks): arm.animation_data.nla_tracks.remove(t)
KEEP = {'Armature', 'med', 'cloth', 'eye med'}
for o in list(bpy.data.objects):
    if o.name not in KEEP: bpy.data.objects.remove(o, do_unlink=True)
bpy.context.view_layer.update()
med, cloth, eye = bpy.data.objects['med'], bpy.data.objects['cloth'], bpy.data.objects['eye med']
meshes = [med, cloth, eye]
REN = {'Bone': 'hips', 'Bone.001': 'spine', 'Bone.002': 'chest', 'Bone.003': 'head'}
for s in 'LR':
    REN.update({f'shoulder.{s}': f'shoulder_{s}', f'arm.{s}': f'upperarm_{s}', f'forearm.{s}': f'forearm_{s}', f'hand.{s}': f'hand_{s}',
                f'thigh.{s}': f'thigh_{s}', f'shin.{s}': f'shin_{s}', f'foot.{s}': f'foot_{s}', f'foot_tip.{s}': f'toe_{s}'})
MERGE = {'Bone.004': 'Bone'}
for s in 'LR':
    MERGE.update({f'foot_IK.{s}': f'foot.{s}', f'sole.{s}': f'foot_tip.{s}', f'sole_inverse.{s}': f'foot.{s}', f'roll_IK.{s}': f'foot.{s}', f'foot_main.{s}': f'foot.{s}'})
# 1) vertex weights: merge control-bone groups, drop everything that is not a kept bone
def merge_groups(o):
    me = o.data; names = {g.index: g.name for g in o.vertex_groups}
    acc = []
    for v in me.vertices:
        w = {}
        for g in v.groups:
            n = names[g.group]
            n = MERGE.get(n, n)
            if n in REN and g.weight > 0: w[REN[n]] = w.get(REN[n], 0) + g.weight
        acc.append(w)
    for g in list(o.vertex_groups): o.vertex_groups.remove(g)
    groups = {}
    for i, w in enumerate(acc):
        t = sum(w.values())
        for n, x in w.items():
            if n not in groups: groups[n] = o.vertex_groups.new(name=n)
            groups[n].add([i], x / t, 'REPLACE')
merge_groups(med); merge_groups(eye)
# loincloth: hips, lower rows follow the nearer thigh a little (top ring z~1.4, bottom 0.4-0.63 in the source file)
for g in list(cloth.vertex_groups): cloth.vertex_groups.remove(g)
gh = cloth.vertex_groups.new(name='hips'); gl = cloth.vertex_groups.new(name='thigh_L'); gr = cloth.vertex_groups.new(name='thigh_R')
for v in cloth.data.vertices:
    p = cloth.matrix_world @ v.co
    t = max(0.0, min(1.0, (1.40 - p.z) / 0.85))        # 0 at the waist band, 1 at the hem
    side = max(-1.0, min(1.0, p.x / 0.7))             # -1 right .. +1 left
    wl = 0.55 * t * max(0.0, side) ** 0.7; wr = 0.55 * t * max(0.0, -side) ** 0.7
    gh.add([v.index], 1 - wl - wr, 'REPLACE')
    if wl > 0.001: gl.add([v.index], wl, 'REPLACE')
    if wr > 0.001: gr.add([v.index], wr, 'REPLACE')
for o in meshes:
    while o.data.color_attributes: o.data.color_attributes.remove(o.data.color_attributes[0])
# 2) bones
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
eb = arm.data.edit_bones
for n in list(MERGE.keys()):
    if n in eb: eb.remove(eb[n])
for n in ['pole.L', 'pole.R']:
    if n in eb: eb.remove(eb[n])
eb['Bone.001'].use_connect = False
eb['Bone'].parent = None
# hips pivot at the hip joints (between the thigh heads), pointing up
th = (eb['thigh.L'].head + eb['thigh.R'].head) / 2
eb['Bone'].head = Vector((0, th.y, th.z)); eb['Bone'].tail = Vector((0, th.y, th.z + 0.35)); eb['Bone'].roll = 0
for b in eb: b.use_deform = True
bpy.ops.object.mode_set(mode='OBJECT')
for o, n in REN.items():
    if o in arm.data.bones: arm.data.bones[o].name = n
print('BONES', [(b.name, b.parent.name if b.parent else None) for b in arm.data.bones])
# 3) unparent meshes (keep world), scale about the origin, apply, put the soles on z=0
for o in meshes:
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
for o in [arm] + meshes: o.matrix_world = Matrix.Scale(SCALE, 4) @ o.matrix_world
bpy.ops.object.select_all(action='DESELECT')
for o in [arm] + meshes: o.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
zmin = min(v.co.z for v in med.data.vertices)
for o in [arm] + meshes: o.location.z -= zmin
bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
for o in meshes:
    o.parent = arm
    mods = [m for m in o.modifiers if m.type == 'ARMATURE']
    if not mods: mods = [o.modifiers.new('Armature', 'ARMATURE')]
    mods[0].object = arm
    for m in mods[1:]: o.modifiers.remove(m)
print('ZMAX', max(v.co.z for v in med.data.vertices), 'zmin was', zmin)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(os.environ['TD'], 'clean.blend'))
print('SAVED')
