import bpy, os
out = os.path.abspath('tex')
for im in bpy.data.images:
    if im.size[0] == 0: continue
    print('IMG', im.name, im.size[:], im.packed_file is not None, im.colorspace_settings.name, im.alpha_mode, im.depth)
    im2 = im.copy(); im2.filepath_raw = os.path.join(out, im.name.replace(' ', '_').replace('.png','') + '.png'); im2.file_format = 'PNG'
    im2.save()
