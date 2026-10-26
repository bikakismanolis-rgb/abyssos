import bpy, sys
out = sys.argv[-1]
bpy.ops.wm.open_mainfile(filepath=sys.argv[-2])
bpy.ops.object.select_all(action='DESELECT')
for n in ('Armature', 'Skeleton'): bpy.data.objects[n].select_set(True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_yup=True, export_animations=False, export_skins=True, export_materials='EXPORT')
