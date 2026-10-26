import bpy, json
arm=bpy.data.objects['Armature']
print('arm matrix', [list(r) for r in arm.matrix_world])
for b in arm.data.bones:
    print(f"{b.name:14s} par={b.parent.name if b.parent else None!s:12s} def={b.use_deform} head={tuple(round(x,3) for x in b.head_local)} tail={tuple(round(x,3) for x in b.tail_local)} roll? conn={b.use_connect}")
# vertex groups with weights
used=set()
for o in bpy.data.objects:
    if o.type!='MESH': continue
    gi={g.index:g.name for g in o.vertex_groups}
    for v in o.data.vertices:
        for g in v.groups:
            if g.weight>0.001: used.add(gi[g.group])
    print(o.name, 'parent',o.parent.name if o.parent else None, 'parent_type', o.parent_type, 'matrix', [round(x,3) for x in o.matrix_world.translation], o.matrix_world.to_scale(), 'mods',[(m.type, getattr(m,'object',None) and m.object.name) for m in o.modifiers])
print('USED', sorted(used))
# constraints
pb=arm.pose.bones
for p in pb:
    if p.constraints: print('CON', p.name, [(c.type, getattr(c,'subtarget',None), getattr(c,'pole_subtarget',None), getattr(c,'chain_count',None)) for c in p.constraints])
for a in bpy.data.actions:
    bones=set(fc.data_path.split('"')[1] for fc in a.fcurves if '"' in fc.data_path)
    paths=set(fc.data_path.split('.')[-1] for fc in a.fcurves)
    print('ACT', a.name, a.frame_range[:], len(a.fcurves), paths, sorted(bones)[:80])
print('fps', bpy.context.scene.render.fps, bpy.context.scene.render.fps_base)
for m in bpy.data.materials: print('MAT', m.name, m.diffuse_color[:], m.use_nodes)
for i in bpy.data.images: print('IMG', i.name, i.size[:], i.filepath, i.packed_file is not None)
