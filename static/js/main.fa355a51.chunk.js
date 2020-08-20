(this["webpackJsonplight-dev-tools"]=this["webpackJsonplight-dev-tools"]||[]).push([[0],{131:function(e,n,t){e.exports=t(310)},310:function(e,n,t){"use strict";t.r(n);var a=t(0),o=t.n(a),l=t(26),r=t.n(l),i=t(5),c=t(28),u=t(11),m=t(15),p=t(86),s=t(4);function d(){var e=Object(i.a)(["\n  font-size: 18px;\n  font-weight: bold;\n  margin-bottom: 10px;\n"]);return d=function(){return e},e}function b(){var e=Object(i.a)(["\n  margin-bottom: 30px;\n"]);return b=function(){return e},e}var f=s.c.div(b()),g=s.c.h4(d());function x(e){return o.a.createElement(f,{className:"typo"},o.a.createElement(g,null,"Description"),e.children)}function v(){var e=Object(i.a)(["\n  border-radius: ",";\n  padding: 10px 20px;\n  cursor: pointer;\n  box-sizing: border-box;\n  background: #bcd8b7;\n  color: #fff;\n  text-transform: uppercase;\n  border: none;\n  outline: none;\n  ","\n  ","\n\n  &:hover {\n    ",";\n  }\n"]);return v=function(){return e},e}var h=s.c.button(v(),"7px",(function(e){return e.small?"font-size: 70%;":""}),(function(e){return e.transparent?"opacity: 0.6;":""}),(function(e){return e.transparent?"opacity: 1;":""}));function E(e){return o.a.createElement(h,e,e.children)}var y=t(126),_=t.n(y),j=t(56);function O(){var e=Object(i.a)(["\n  border-bottom: 1px dashed ",";\n  display: inline-block;\n  font-size: 90%;\n\n  &:hover {\n    color: ",";\n    border-bottom-color: ",";\n  }\n"]);return O=function(){return e},e}function C(){var e=Object(i.a)(["\n  width: 100%;\n  text-align: right;\n  margin-top: 5px;\n"]);return C=function(){return e},e}function w(){var e=Object(i.a)(["\n  position: absolute;\n  top: 2px;\n  right: 2px;\n"]);return w=function(){return e},e}function B(){var e=Object(i.a)(["\n  margin-bottom: 5px;\n  display: block;\n"]);return B=function(){return e},e}function k(){var e=Object(i.a)(["\n  display: block;\n  box-sizing: border-box;\n  width: 100%;\n  height: 100%;\n  min-height: ",";\n  border-radius: ",";\n  border: 2px solid ",";\n  padding: 10px;\n  resize: vertical;\n  outline: none;\n"]);return k=function(){return e},e}function N(){var e=Object(i.a)(["\n  position: relative;\n  height: 100%;\n  width: 100%;\n"]);return N=function(){return e},e}function F(){var e=Object(i.a)(["\n  box-sizing: border-box;\n  width: 100%;\n"]);return F=function(){return e},e}var z=s.c.div(F()),S=s.c.form(N()),D=s.c.textarea(k(),(function(e){return e.medium?"200px":e.small?"100px":e.smallest?"30px":"auto"}),"7px","#040F16"),H=s.c.label(B()),R=s.c.div(w()),A=s.c.div(C()),U=s.c.a(O(),"#01BAEF","#B80C09","#B80C09");function P(e){var n=Object(j.useToasts)().addToast;return o.a.createElement(z,null,e.label?o.a.createElement(H,null,e.label,":"):"",o.a.createElement(S,null,o.a.createElement(D,e),e.hasClipboardButton?o.a.createElement(R,null,o.a.createElement(E,{onClick:function(){var t=e.value?e.value:e.defaultValue;t&&(_()(t),n("Copied!",{appearance:"success",autoDismiss:!0,autoDismissTimeout:1e3}))},transparent:!0,small:!0},e.compactClipboardButton?"Copy":"Copy to clibpoard")):"",e.notHasResetButton||e.readOnly?"":o.a.createElement(A,null,o.a.createElement(U,{onClick:function(n){e.onChange&&e.onChange(Object.create({target:{value:""}})),n.preventDefault()},href:"#"},"Clear all field data"))))}function T(){var e=Object(a.useState)(""),n=Object(m.a)(e,2),t=n[0],l=n[1],r=Object(a.useState)(""),i=Object(m.a)(r,2),c=i[0],u=i[1],s=Object(a.useState)(!0),d=Object(m.a)(s,2),b=d[0],f=d[1];return o.a.createElement(o.a.Fragment,null,o.a.createElement(x,null,o.a.createElement("p",null,"Usage scenarios:"),o.a.createElement("ul",null,o.a.createElement("li",null,"Place plain text in first input and get base64 from second"),o.a.createElement("li",null,"Or place base64 encoded payload in second and get text in first"))),o.a.createElement(P,{label:"Plain text",onChange:function(e){var n=e.target.value;if(n!==t){var a=p.a.encode(n);l(n),u(a),f(!0)}},value:t,className:b?"":"errorfield",hasClipboardButton:!0,medium:!0}),o.a.createElement(P,{label:"Base64",onChange:function(e){var n=e.target.value;if(n!==c){u(n);try{l(p.a.decode(n)),f(!0)}catch(t){l("Cant decode to plain text, seems base64 payload is broken.\n\nWe got following error: [".concat(t,"]")),f(!1)}}},value:c,hasClipboardButton:!0,medium:!0}))}t(89);var V=t(82);function I(){var e=Object(i.a)(["\n  display: flex;\n  column-gap: 30px;\n\n  @media (max-width: 450px) {\n    flex-flow: column;\n    row-gap: 30px;\n    margin-bottom: 30px;\n  }\n"]);return I=function(){return e},e}function J(){var e=Object(i.a)(["\n  display: flex;\n  column-gap: 20px;\n  margin-bottom: 30px;\n\n  @media (max-width: 450px) {\n    flex-flow: column;\n    row-gap: 30px;\n    margin-bottom: 0;\n  }\n"]);return J=function(){return e},e}function G(){var e=Object(i.a)(["\n  @media (max-width: 450px) {\n    display: flex;\n    flex-flow: column-reverse;\n  }\n"]);return G=function(){return e},e}var K={height:"60px"},M=s.c.div(G()),W=s.c.div(J()),L=s.c.div(I());function Y(){var e=Object(a.useState)({}),n=Object(m.a)(e,2),t=n[0],l=n[1],r=function(e){l(e)};return o.a.createElement(o.a.Fragment,null,o.a.createElement(x,null,o.a.createElement("p",null,"Click on any emoji, it will appear in textarea. Then you can copy it in the clipboard.")),o.a.createElement(M,null,o.a.createElement(W,null,o.a.createElement(P,{label:"Hex",style:K,notHasResetButton:!0,hasClipboardButton:!0,compactClipboardButton:!0,readOnly:!0,value:t.hex}),o.a.createElement(P,{label:"RGBA",style:K,notHasResetButton:!0,hasClipboardButton:!0,compactClipboardButton:!0,readOnly:!0,value:t.rgb?"rgba(".concat(t.rgb.r,", ").concat(t.rgb.g,", ").concat(t.rgb.b,", ").concat(t.rgb.a,")"):""}),o.a.createElement(P,{label:"RGB",style:K,notHasResetButton:!0,hasClipboardButton:!0,compactClipboardButton:!0,readOnly:!0,value:t.rgb?"rgb(".concat(t.rgb.r,", ").concat(t.rgb.g,", ").concat(t.rgb.b,")"):""})),o.a.createElement(L,null,o.a.createElement(V.ChromePicker,{color:t?t.rgb:"",onChange:r}),o.a.createElement(V.SwatchesPicker,{color:t?t.rgb:"",onChange:r}))))}var q=t(129);function Q(){var e=Object(i.a)(["\n.emoji-special-textarea {\n  font-size: 40px;\n  height: 405px;\n\n  @media (max-width: 768px) {\n    height: 70px !important;\n  }\n}\n"]);return Q=function(){return e},e}function X(){var e=Object(i.a)(["\n  flex-grow: 1;\n"]);return X=function(){return e},e}function Z(){var e=Object(i.a)(["\n  display: flex;\n  column-gap: 30px;\n  row-gap: 30px;\n\n  @media (max-width: 768px) {\n    flex-direction: column-reverse;\n  }\n"]);return Z=function(){return e},e}var $=s.c.div(Z()),ee=s.c.div(X()),ne=Object(s.a)(Q());function te(){var e=Object(a.useState)(""),n=Object(m.a)(e,2),t=n[0],l=n[1];return o.a.createElement(o.a.Fragment,null,o.a.createElement(ne,null),o.a.createElement(x,null,o.a.createElement("p",null,"Click on any emoji, it will appear in textarea. Then you can copy it in the clipboard.")),o.a.createElement($,null,o.a.createElement(ee,null,o.a.createElement(q.a,{native:!0,onSelect:function(e){l(t+e.native)},title:"Pick emoji"})),o.a.createElement(ee,null,o.a.createElement(P,{label:"Result",value:t,onChange:function(e){l(e.target.value)},hasClipboardButton:!0,className:"emoji-special-textarea"}))))}var ae=t(83),oe=t.n(ae);function le(){var e=Object(i.a)(["\n  margin: 0 5px 0 0;\n  padding: 0;\n  display: block;\n"]);return le=function(){return e},e}function re(){var e=Object(i.a)(["\n  display: flex;\n  align-items: flex-start;\n"]);return re=function(){return e},e}function ie(){var e=Object(i.a)(["\n  margin-bottom: 25px;\n  display: flex;\n  column-gap: 20px;\n  row-gap: 10px;\n  flex-wrap: wrap;\n"]);return ie=function(){return e},e}var ce=s.c.div(ie()),ue=s.c.label(re()),me=s.c.input(le());function pe(e){return o.a.createElement(ce,null,e.titleValues.map((function(n,t){return o.a.createElement(ue,{key:t},o.a.createElement(me,Object.assign({type:"radio",name:e.groupKey,onChange:e.onChange?e.onChange:function(){},value:n},0===t?{defaultChecked:!0}:{})),o.a.createElement("div",null,n))})))}var se=["MD5","SHA1","SHA256","SHA512"];function de(){var e=Object(a.useState)(se[0]),n=Object(m.a)(e,2),t=n[0],l=n[1],r=Object(a.useState)(""),i=Object(m.a)(r,2),c=i[0],u=i[1],p=Object(a.useState)(""),s=Object(m.a)(p,2),d=s[0],b=s[1];return o.a.createElement(o.a.Fragment,null,o.a.createElement(x,null,o.a.createElement("p",null,"Select hash type, provide input and get the hex digest.")),o.a.createElement(pe,{titleValues:se,onChange:function(e){l(e.target.value),b((new oe.a[e.target.value]).hex(c))},groupKey:"hashfn"}),o.a.createElement(P,{label:"Input",onChange:function(e){var n=e.target.value;n!==c&&(u(n),b((new oe.a[t]).hex(n)))},value:c,small:!0}),o.a.createElement(P,{label:"Hash digest",defaultValue:d,hasClipboardButton:!0,smallest:!0,readOnly:!0}))}var be=t(128);function fe(){var e=Object(a.useState)(""),n=Object(m.a)(e,2),t=n[0],l=n[1],r=Object(a.useState)(""),i=Object(m.a)(r,2),c=i[0],u=i[1],p=Object(a.useState)(!0),s=Object(m.a)(p,2),d=s[0],b=s[1];return o.a.createElement(o.a.Fragment,null,o.a.createElement(x,null,o.a.createElement("p",null,"Just helper for url encoding & decoding.")),o.a.createElement(P,{label:"Url to encode",value:t,className:d?"":"errorfield",onChange:function(e){var n=e.target.value;n!==t&&(l(n),u(encodeURI(n)),b(!0))},hasClipboardButton:!0,small:!0}),o.a.createElement(P,{label:"Url to decode",value:c,onChange:function(e){var n=e.target.value;if(n!==c)try{u(n),l(decodeURI(n)),b(!0)}catch(t){l("Cant decode to plain text, seems base64 payload is broken.\n\nWe got following error: [".concat(t,"]")),b(!1)}},hasClipboardButton:!0,small:!0}))}function ge(){var e=Object(i.a)(["\nbody {\n  font-family: 'Varta', sans-serif;\n  background: ",";\n  color: #040F16;\n}\n\na {\n  color: ",";\n  text-decoration: none;\n  border-bottom: 1px solid ",";\n}\n\na:hover {\n  border-bottom-color: #056fe8;\n}\n\nh1 {\n  font-size: 24px;\n  color: #040F16;\n}\n\nh2 {\n  font-size: 22px;\n  margin-bottom: 20px;\n}\n\n.typo p + p {\n  margin-top: 20px;\n}\n\n.typo ul {\n  margin-top: 10px;\n}\n\n.typo ul li {\n  margin-left: 0;\n  padding-left: 20px;\n  list-style-type: none;\n  position: relative;\n}\n\n.typo ul li + li {\n  margin-top: 7px;\n}\n\n.typo ul li:before {\n  left: 0;\n  top: 0;\n  position: absolute;\n  display: inline-block;\n  content: '\\2014';\n}\n\n.errorfield {\n  border-color: ",";\n}\n\n.fontsmall {\n  font-size: 80%;\n}\n\n.mainlayout__wrap {\n  width: 100%;\n  max-width: 740px;\n  margin: 0 auto;\n  padding: 25px 20px;\n  box-sizing: border-box;\n}\n\n.mainlayout__menu {\n  background: #BDEBFB;\n}\n\n.mainlayout__footer {\n  color: ",";\n  border-top: 1px solid ",";\n  font-size: 90%;\n}\n\n.sitetitle {\n  display: inline-block;\n  border-bottom: none;\n}\n\n.sitetitle:hover {\n  opacity: 0.7;\n}\n\n.sitetitle__title {\n  font-size: 44px;\n}\n\n.topmenu {\n  display: flex;\n  column-gap: 30px;\n  row-gap: 20px;\n  flex-wrap: wrap;\n}\n\n.topmenu__item {\n  font-size: 120%;\n  display: block;\n  padding-bottom: 3px;\n}\n\n.topmenu__item_active,\n.topmenu__item:hover {\n  color: ",";\n  border-bottom-color: ",";\n}\n\n.emoji-mart-emoji {\n  outline: none;\n}\n"],["\nbody {\n  font-family: 'Varta', sans-serif;\n  background: ",";\n  color: #040F16;\n}\n\na {\n  color: ",";\n  text-decoration: none;\n  border-bottom: 1px solid ",";\n}\n\na:hover {\n  border-bottom-color: #056fe8;\n}\n\nh1 {\n  font-size: 24px;\n  color: #040F16;\n}\n\nh2 {\n  font-size: 22px;\n  margin-bottom: 20px;\n}\n\n.typo p + p {\n  margin-top: 20px;\n}\n\n.typo ul {\n  margin-top: 10px;\n}\n\n.typo ul li {\n  margin-left: 0;\n  padding-left: 20px;\n  list-style-type: none;\n  position: relative;\n}\n\n.typo ul li + li {\n  margin-top: 7px;\n}\n\n.typo ul li:before {\n  left: 0;\n  top: 0;\n  position: absolute;\n  display: inline-block;\n  content: '\\\\2014';\n}\n\n.errorfield {\n  border-color: ",";\n}\n\n.fontsmall {\n  font-size: 80%;\n}\n\n.mainlayout__wrap {\n  width: 100%;\n  max-width: 740px;\n  margin: 0 auto;\n  padding: 25px 20px;\n  box-sizing: border-box;\n}\n\n.mainlayout__menu {\n  background: #BDEBFB;\n}\n\n.mainlayout__footer {\n  color: ",";\n  border-top: 1px solid ",";\n  font-size: 90%;\n}\n\n.sitetitle {\n  display: inline-block;\n  border-bottom: none;\n}\n\n.sitetitle:hover {\n  opacity: 0.7;\n}\n\n.sitetitle__title {\n  font-size: 44px;\n}\n\n.topmenu {\n  display: flex;\n  column-gap: 30px;\n  row-gap: 20px;\n  flex-wrap: wrap;\n}\n\n.topmenu__item {\n  font-size: 120%;\n  display: block;\n  padding-bottom: 3px;\n}\n\n.topmenu__item_active,\n.topmenu__item:hover {\n  color: ",";\n  border-bottom-color: ",";\n}\n\n.emoji-mart-emoji {\n  outline: none;\n}\n"]);return ge=function(){return e},e}var xe=Object(s.a)(ge(),"#FBFBFF","#01BAEF","#01BAEF","#B80C09","#DDDEE2","#DDDEE2","#040F16","#040F16");var ve=function(){return o.a.createElement(o.a.Fragment,null,o.a.createElement(j.ToastProvider,null,o.a.createElement(c.a,null,o.a.createElement(be.a,null),o.a.createElement(xe,null),o.a.createElement("main",{className:"mainlayout"},o.a.createElement("header",{className:"mainlayout__topline"},o.a.createElement("div",{className:"mainlayout__wrap"},o.a.createElement(c.b,{to:"/",className:"sitetitle",activeClassName:""},o.a.createElement("h1",{className:"sitetitle__title"},o.a.createElement("span",{role:"img","aria-label":"Software engineer"},"\ud83e\uddd1\u200d\ud83d\udcbb"),"\xa0Light dev tools")))),o.a.createElement("div",{className:"mainlayout__menu"},o.a.createElement("nav",{className:"topmenu mainlayout__wrap"},o.a.createElement(c.b,{to:"/tool/base64/",className:"topmenu__item",activeClassName:"topmenu__item_active"},"Base 64"),o.a.createElement(c.b,{to:"/tool/hash/",className:"topmenu__item",activeClassName:"topmenu__item_active"},"Hash"),o.a.createElement(c.b,{to:"/tool/urlencode/",className:"topmenu__item",activeClassName:"topmenu__item_active"},"Url encode&decode"),o.a.createElement(c.b,{to:"/tool/emoji/",className:"topmenu__item",activeClassName:"topmenu__item_active"},"Emoji picker"),o.a.createElement(c.b,{to:"/tool/color/",className:"topmenu__item",activeClassName:"topmenu__item_active"},"Color picker"))),o.a.createElement("div",{className:"mainlayout__wrap mainlayout__content"},o.a.createElement(u.c,null,o.a.createElement(u.a,{path:"/tool/base64/"},o.a.createElement(T,null)),o.a.createElement(u.a,{path:"/tool/hash/"},o.a.createElement(de,null)),o.a.createElement(u.a,{path:"/tool/urlencode/"},o.a.createElement(fe,null)),o.a.createElement(u.a,{path:"/tool/emoji/"},o.a.createElement(te,null)),o.a.createElement(u.a,{path:"/tool/color/"},o.a.createElement(Y,null)),o.a.createElement(u.a,{path:"/"},o.a.createElement("div",{className:"typo"},o.a.createElement("h2",null,"Hello"),o.a.createElement("p",null,"Dear developer, this site contains bunch of useful and simple tools."),o.a.createElement("p",null,"Use them for the greater good!"))))),o.a.createElement("footer",{className:"mainlayout__wrap mainlayout__footer typo"},(new Date).getFullYear()," \xa9 fancy copyright and footer text.",o.a.createElement("br",null),"By big and strong corporation. Special thanks for mom. Also for cat.")))))};r.a.render(o.a.createElement(o.a.StrictMode,null,o.a.createElement(ve,null)),document.getElementById("root"))}},[[131,1,2]]]);
//# sourceMappingURL=main.fa355a51.chunk.js.map