# Bakes every action of the Kelgar goblin (IK constraints evaluated) to armature-space matrices of the deform bones,
# measures the mesh in a few poses and dumps the packed textures.
import bpy, json, os
D=os.path.dirname(os.path.abspath(__file__)) if '__file__' in dir() else '.'
D=os.environ['GD']
sc=bpy.context.scene
arm=bpy.data.objects['Armature']
DEF=[b.name for b in arm.data.bones if b.use_deform]
flat=lambda m:[m[r][c] for c in range(4) for r in range(4)]  # column-major like three.js
out={'def':DEF,'parents':{b.name:(b.parent.name if b.parent else None) for b in arm.data.bones},'rest':{b.name:flat(b.matrix_local) for b in arm.data.bones},'actions':{},'fps':sc.render.fps}
print('rotmodes', set(pb.rotation_mode for pb in arm.pose.bones))
meshes=[o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
def bbox():
    dg=bpy.context.evaluated_depsgraph_get(); mn=[1e9]*3; mx=[-1e9]*3
    for o in meshes:
        e=o.evaluated_get(dg); me=e.to_mesh()
        for v in me.vertices:
            w=e.matrix_world@v.co
            for i in range(3): mn[i]=min(mn[i],w[i]); mx[i]=max(mx[i],w[i])
        e.to_mesh_clear()
    return [round(x,3) for x in mn],[round(x,3) for x in mx]
ad=arm.animation_data
ad.action=None
for pb in arm.pose.bones: pb.matrix_basis.identity()
sc.frame_set(0); print('BBOX rest', bbox())
for act in bpy.data.actions:
    ad.action=act
    f0,f1=int(act.frame_range[0]),int(act.frame_range[1])
    if act.name=='Idle': f1=min(f1,240)
    frames=[]
    for f in range(f0,f1+1):
        sc.frame_set(f)
        frames.append({n:flat(arm.pose.bones[n].matrix) for n in DEF})
        if f==f0 or f==(f0+f1)//2: print('BBOX',act.name,f,bbox())
    out['actions'][act.name]=frames
    print('baked',act.name,len(frames))
json.dump(out,open(os.path.join(D,'bake.json'),'w'))
for im in bpy.data.images:
    if im.packed_file:
        p=os.path.join(D,'tex',os.path.basename(im.filepath.replace('\\','/')))
        open(p,'wb').write(im.packed_file.data); print('saved',p)
