// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `html-tags`
// Author: Sindre Sorhus (https://github.com/sindresorhus)
// Repository url: https://github.com/sindresorhus/html-tags

import { makeMap } from '@vue-vapor/shared'

export const isHtmlTags: ReturnType<typeof makeMap> = makeMap(
  'a,abbr,address,area,article,aside,audio,b,base,bdi,bdo,blockquote,body,br,button,canvas,caption,cite,code,col,colgroup,data,datalist,dd,del,details,dfn,dialog,div,dl,dt,em,embed,fieldset,figcaption,figure,footer,form,h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,i,iframe,img,input,ins,kbd,label,legend,li,link,main,map,mark,math,menu,menuitem,meta,meter,nav,noscript,object,ol,optgroup,option,output,p,param,picture,pre,progress,q,rb,rp,rt,rtc,ruby,s,samp,script,search,section,select,slot,small,source,span,strong,style,sub,summary,sup,svg,table,tbody,td,template,textarea,tfoot,th,thead,time,title,tr,track,u,ul,var,video,wbr'
)
