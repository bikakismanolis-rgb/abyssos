import bpy, os
W = os.environ['W']
o = bpy.data.objects['Exec_mesh']; arm = bpy.data.objects['Rig']
print('mesh mw', [list(r) for r in o.matrix_world]); print('arm mw', [list(r) for r in arm.matrix_world])
print('parent', o.parent, o.parent_type, o.parent_bone)
names = {g.index: g.name for g in o.vertex_groups}
tot = {}
cnt = {}
for v in o.data.vertices:
    for g in v.groups:
        if g.weight > 0: tot[names[g.group]] = tot.get(names[g.group], 0) + g.weight; cnt[names[g.group]] = cnt.get(names[g.group], 0) + 1
for n in sorted(tot, key=lambda k: -tot[k]): print('VG', n, round(tot[n], 1), cnt[n], 'deform' if n in arm.data.bones and arm.data.bones[n].use_deform else 'nodeform/missing')
print('deform bones without weights', [b.name for b in arm.data.bones if b.use_deform and b.name not in tot])
for pb in arm.pose.bones:
    if pb.constraints: print('CONS', pb.name, [(c.type, getattr(c, 'subtarget', '')) for c in pb.constraints])
for im in bpy.data.images:
    print('IMG', im.name, im.size[:], im.packed_file is not None, im.filepath)
    if im.packed_file is not None:
        im.filepath_raw = os.path.join(W, 'tex', 'src_' + im.name); im.save()
print('modifiers', [(m.type, m.name) for m in o.modifiers])
print('dims', o.dimensions[:], 'verts', len(o.data.vertices))
import mathutils
zs = [ (o.matrix_world @ v.co).z for v in o.data.vertices ]; print('z range', min(zs), max(zs))
for b in arm.data.bones:
    if b.name in ('Body','pelvis','spine.01','thigh.L','tarsal.L','toe.L','hand.L','head','neck'): print('BONE', b.name, b.head_local[:], b.tail_local[:], b.parent.name if b.parent else None)
