import bpy, collections
for name in ['Neck','Ear','Tooth','Eyes','Belt','Cloth']:
    o=bpy.data.objects[name]
    gi={g.index:g.name for g in o.vertex_groups}
    c=collections.Counter()
    for v in o.data.vertices:
        for g in v.groups:
            if g.weight>0.01: c[gi[g.group]]+=g.weight
    m=o.modifiers[0]
    print(name, dict(c.most_common(6)), 'mod', m.use_vertex_groups, m.use_bone_envelopes, m.use_deform_preserve_volume, 'nverts', len(o.data.vertices), 'nogroup', sum(1 for v in o.data.vertices if not v.groups))
arm=bpy.data.objects['Armature']
print([ (b.name, b.use_envelope_multiply) for b in arm.data.bones if b.name in ('neck','IK-Head','head')])
