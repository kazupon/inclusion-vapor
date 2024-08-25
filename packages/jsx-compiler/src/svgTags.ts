// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `svg-tags`
// Author: Element.io (https://github.com/element-io)
// Repository url: https://github.com/element-io/svg-tags

import { makeMap } from '@vue-vapor/shared'

export const isSvgTags: ReturnType<typeof makeMap> = makeMap(
  'a,altGlyph,altGlyphDef,altGlyphItem,animate,animateColor,animateMotion,animateTransform,circle,clipPath,color-profile,cursor,defs,desc,ellipse,feBlend,feColorMatrix,feComponentTransfer,feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,feDistantLight,feFlood,feFuncA,feFuncB,feFuncG,feFuncR,feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset,fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,filter,font,font-face,font-face-format,font-face-name,font-face-src,font-face-uri,foreignObject,g,glyph,glyphRef,hkern,image,line,linearGradient,marker,mask,metadata,missing-glyph,mpath,path,pattern,polygon,polyline,radialGradient,rect,script,set,stop,style,svg,switch,symbol,text,textPath,title,tref,tspan,use,view,vkern'
)
