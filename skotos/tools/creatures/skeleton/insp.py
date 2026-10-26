import bpy, sys, collections
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=sys.argv[-1])
arm = [o for o in bpy.data.objects if o.type=='ARMATURE'][0]
print('ARM', arm.name, arm.matrix_world)
used = collections.Counter()
for o in bpy.data.objects:
    if o.type != 'MESH': continue
    me = o.data
    print('MESH', o.name, len(me.vertices), len(me.polygons), 'smooth', sum(p.use_smooth for p in me.polygons), 'uv', [u.name for u in me.uv_layers], 'mods', [m.type for m in o.modifiers], 'parent', o.parent and o.parent.name)
    gn = {g.index: g.name for g in o.vertex_groups}
    for v in me.vertices:
        for g in v.groups:
            if g.weight > 0.001: used[gn[g.group]] += 1
print('USED', len(used))
for k, v in sorted(used.items()): print('  ', k, v)
mw = arm.matrix_world
for b in arm.data.bones:
    if b.name in used or b.name.startswith(('PIV_HIPS','PELVIS','HEAD','JAW')):
        print('BONE', b.name, 'parent', b.parent and b.parent.name, 'head', tuple(round(x,3) for x in mw @ b.head_local), 'tail', tuple(round(x,3) for x in mw @ b.tail_local))
