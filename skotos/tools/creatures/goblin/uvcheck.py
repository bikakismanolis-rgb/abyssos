import bpy
for o in bpy.data.objects:
    if o.type!='MESH': continue
    for uv in o.data.uv_layers:
        us=[d.uv for d in uv.data]
        if us: print(o.name, uv.name, 'u', round(min(u.x for u in us),3), round(max(u.x for u in us),3), 'v', round(min(u.y for u in us),3), round(max(u.y for u in us),3), 'active_render', uv.active_render)
