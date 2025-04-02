"use strict";(self.webpackChunkprezenti_pledge=self.webpackChunkprezenti_pledge||[]).push([[2250],{2250:(e,a,t)=>{t.d(a,{offchainLookup:()=>u,offchainLookupSignature:()=>l});var r=t(8354),s=t(8040);class n extends s.B{constructor(e){let{callbackSelector:a,cause:t,data:r,extraData:n,sender:o,urls:c}=e;super(t.shortMessage||"An error occurred while fetching for an offchain result.",{cause:t,metaMessages:[...t.metaMessages||[],t.metaMessages?.length?"":[],"Offchain Gateway Call:",c&&["  Gateway URL(s):",...c.map((e=>`    ${(0,s.W)(e)}`))],`  Sender: ${o}`,`  Data: ${r}`,`  Callback selector: ${a}`,`  Extra data: ${n}`].flat()}),Object.defineProperty(this,"name",{enumerable:!0,configurable:!0,writable:!0,value:"OffchainLookupError"})}}class o extends s.B{constructor(e){let{result:a,url:t}=e;super("Offchain gateway response is malformed. Response data must be a hex value.",{metaMessages:[`Gateway URL: ${(0,s.W)(t)}`,`Response: ${(0,r.s)(a)}`]}),Object.defineProperty(this,"name",{enumerable:!0,configurable:!0,writable:!0,value:"OffchainLookupResponseMalformedError"})}}class c extends s.B{constructor(e){let{sender:a,to:t}=e;super("Reverted sender address does not match target contract address (`to`).",{metaMessages:[`Contract address: ${t}`,`OffchainLookup sender address: ${a}`]}),Object.defineProperty(this,"name",{enumerable:!0,configurable:!0,writable:!0,value:"OffchainLookupSenderMismatchError"})}}const l="0x556f1830",d={name:"OffchainLookup",type:"error",inputs:[{name:"sender",type:"address"},{name:"urls",type:"string[]"},{name:"callData",type:"bytes"},{name:"callbackFunction",type:"bytes4"},{name:"extraData",type:"bytes"}]};async function u(e,a){let{blockNumber:t,blockTag:o,data:l,to:u}=a;const{args:f}=(0,r.d)({data:l,abi:[d]}),[p,h,b,w,m]=f,{ccipRead:y}=e,g=y&&"function"===typeof y?.request?y.request:i;try{if(!function(e,a){if(!(0,s.m)(e,{strict:!1}))throw new s.n({address:e});if(!(0,s.m)(a,{strict:!1}))throw new s.n({address:a});return e.toLowerCase()===a.toLowerCase()}(u,p))throw new c({sender:p,to:u});const a=await g({data:b,sender:p,urls:h}),{data:n}=await(0,r.c)(e,{blockNumber:t,blockTag:o,data:(0,s.J)([w,(0,r.e)([{type:"bytes"},{type:"bytes"}],[a,m])]),to:u});return n}catch(k){throw new n({callbackSelector:w,cause:k,data:l,extraData:m,sender:p,urls:h})}}async function i(e){let{data:a,sender:t,urls:n}=e,c=new Error("An unknown error occurred.");for(let d=0;d<n.length;d++){const e=n[d],u=e.includes("{data}")?"GET":"POST",i="POST"===u?{data:a,sender:t}:void 0;try{const n=await fetch(e.replace("{sender}",t).replace("{data}",a),{body:JSON.stringify(i),method:u});let l;if(l=n.headers.get("Content-Type")?.startsWith("application/json")?(await n.json()).data:await n.text(),!n.ok){c=new r.H({body:i,details:l?.error?(0,r.s)(l.error):n.statusText,headers:n.headers,status:n.status,url:e});continue}if(!(0,s.i)(l)){c=new o({result:l,url:e});continue}return l}catch(l){c=new r.H({body:i,details:l.message,url:e})}}throw c}}}]);
//# sourceMappingURL=2250.45718993.chunk.js.map