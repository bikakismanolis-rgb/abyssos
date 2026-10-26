import bpy
dg=bpy.context.evaluated_depsgraph_get()
for o in bpy.data.objects:
    if o.type!='MESH': continue
    e=o.evaluated_get(dg); me=e.to_mesh()
    ws=[e.matrix_world@v.co for v in me.vertices]
    if ws: print(o.name, len(ws), [round(min(w[i] for w in ws),2) for i in range(3)], [round(max(w[i] for w in ws),2) for i in range(3)], 'uv', [u.name for u in o.data.uv_layers], 'mats', [m.name if m else None for m in o.data.materials])
    low=[w for w in ws if w.z< -0.5]
    print('  low verts', len(low))
    e.to_mesh_clear()
