from PIL import Image
import os
D='/tmp/claude-0/-home-user-abyssos/e4e75481-4d08-5796-9dcc-333c3ebca4db/scratchpad/research/opengameart/dl/giant-spider'
names=['Spider-body-tex.tga','Spider-body-brown-tex.png','Spider-body-green-tex.png','Spider-body-nm.png','Spider-body-spec.tga','Spider-body-glo.png','Spider-leg-tex.tga','Spider-leg-brown-tex.png','Spider-leg-redback-tex.png','Spider-leg-nm.png','Spider-leg-spec.tga','Spider-leg-glo.tga']
ims=[]
for n in names:
  im=Image.open(os.path.join(D,n)); print(n, im.size, im.mode)
  ims.append(im.convert('RGB').resize((256,256)))
W=Image.new('RGB',(256*6,512))
for i,im in enumerate(ims): W.paste(im,((i%6)*256,(i//6)*256))
W.save('tex/all.png')
