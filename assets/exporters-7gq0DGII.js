import{d as e,o as t,s as n}from"./dateUtils-BEEc0nID.js";import{m as r,x as i}from"./index-bNTfNtZ6.js";import{r as a,s as o}from"./scheduleIndex-BqrnBf_w.js";import{a as s,i as c,r as l,t as u}from"./vendor-zip-ByT9Fgr4.js";var d=3840,f=2160,p=Math.round(d*.04);function m(e,t=30){return Math.max(0,Math.round(e/1e3*t))}function h(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&apos;`)}function g(e){if(!e)return``;let t=String(e).split(/[/\\]/);return t[t.length-1]||e}function _(e,t=``){let n=/\.([^.]+)$/.exec(e||``);return n?`.${n[1]}`:t}function v(e,t){return g(e||t).replace(/[\u0000-\u001f<>:"/\\|?*]+/g,`_`).replace(/\s+/g,` `).trim()||t}function y(e,t,n,r){let i=v(t,n),a=_(i,_(n)),o=a?i.slice(0,-a.length):i,s=`${e}/${i}`,c=2;for(;r.has(s.toLowerCase());)s=`${e}/${o}-${c}${a}`,c+=1;return r.add(s.toLowerCase()),s}function b(e){if(!e)return null;let t=String(e).replace(/\/+$/,``);return/^file:\/\/(localhost|\/)/.test(t)?encodeURI(t):null}function x(e,t){let n=b(t);return!n||!e?.packagePath?``:`${n}/${e.packagePath.split(`/`).map(encodeURIComponent).join(`/`)}`}function S(e,t){let n=URL.createObjectURL(e),r=document.createElement(`a`);r.href=n,r.download=t,r.rel=`noopener`,document.body.append(r),r.click(),r.remove(),URL.revokeObjectURL(n)}function C(e){return e?.adjustedTimestamp instanceof Date?n(e.adjustedTimestamp):e?.originalTimestamp instanceof Date?n(e.originalTimestamp):e?.timestamp instanceof Date?n(e.timestamp):Number.isFinite(e?.timeMs)?e.timeMs:null}function w(e){let t=e?.adjustedStartTime instanceof Date?n(e.adjustedStartTime):null,r=e?.adjustedEndTime instanceof Date?n(e.adjustedEndTime):Number.isFinite(t)&&Number.isFinite(e?.duration)?t+e.duration*1e3:null;return Number.isFinite(t)&&Number.isFinite(r)&&r>t?{startMs:t,endMs:r}:null}function T(e,t){let n=[],r=[];e.entries.forEach(e=>{n.push(e.startMs),r.push(e.endMs)}),t.forEach(e=>{let t=w(e);t&&(n.push(t.startMs),r.push(t.endMs))});let i=n.filter(Number.isFinite).sort((e,t)=>e-t)[0],a=r.filter(Number.isFinite).sort((e,t)=>t-e)[0];if(!Number.isFinite(i)||!Number.isFinite(a))throw Error(`No valid timeline range to export.`);return{timelineStartMs:i,timelineEndMs:Math.max(a,i+1e3)}}function E(e,t,n){let r=x(e,n),i=r?`\n              <pathurl>${h(r)}</pathurl>`:``;return t===`audio`?`<file id="${e.id}">
              <name>${h(e.name)}</name>${i}
              <rate>
                <timebase>30</timebase>
                <ntsc>FALSE</ntsc>
              </rate>
              <duration>${e.durationFrames}</duration>
              <media>
                <audio>
                  <samplecharacteristics>
                    <depth>16</depth>
                    <samplerate>48000</samplerate>
                  </samplecharacteristics>
                  <channelcount>2</channelcount>
                </audio>
              </media>
            </file>`:`<file id="${e.id}">
              <name>${h(e.name)}</name>${i}
              <rate>
                <timebase>30</timebase>
                <ntsc>FALSE</ntsc>
              </rate>
              <duration>${e.durationFrames}</duration>
              <media>
                <video>
                  <duration>${e.durationFrames}</duration>
                  <samplecharacteristics>
                    <rate>
                      <timebase>30</timebase>
                      <ntsc>FALSE</ntsc>
                    </rate>
                    <width>${e.width}</width>
                    <height>${e.height}</height>
                    <anamorphic>FALSE</anamorphic>
                    <pixelaspectratio>Square</pixelaspectratio>
                    <fielddominance>none</fielddominance>
                  </samplecharacteristics>
                </video>
              </media>
            </file>`}function D({layoutSize:e,slotIndex:t}){let n=Math.max(1,Math.min(e||1,6)),r=Math.min(Math.max(t||0,0),n-1),i=(d-p*2-48*(n-1))/n,a=f-p*2,o=p+r*(i+48);return{x:o,y:p,width:i,height:a,centerX:o+i/2,centerY:1080,columns:n,rows:1}}function O({imageWidth:e,imageHeight:t,layoutSize:n,slotIndex:r}){let i=D({layoutSize:n,slotIndex:r}),a=Number.isFinite(e)&&e>0?e:d,o=Number.isFinite(t)&&t>0?t:f,s=Math.min(i.width/a,i.height/o)*100,c=(i.centerX-d/2)/d,l=(f/2-i.centerY)/f;return{scale:Math.max(.01,Number(s.toFixed(4))),centerH:Number(c.toFixed(6)),centerV:Number(l.toFixed(6)),frame:i}}function k(e){return`<filter>
              <enabled>TRUE</enabled>
              <effect>
                <name>Basic Motion</name>
                <effectid>basic</effectid>
                <effectcategory>motion</effectcategory>
                <effecttype>motion</effecttype>
                <mediatype>video</mediatype>
                <parameter>
                  <parameterid>scale</parameterid>
                  <name>Scale</name>
                  <value>${e.scale}</value>
                </parameter>
                <parameter>
                  <parameterid>center</parameterid>
                  <name>Center</name>
                  <value>
                    <horiz>${e.centerH}</horiz>
                    <vert>${e.centerV}</vert>
                  </value>
                </parameter>
              </effect>
            </filter>`}function A({scheduleIndex:e,imageAssets:t,timelineStartMs:n}){let r=[];return e.segments.forEach((e,i)=>{let a=m(e.endMs-e.startMs);if(a<=0)return;let o=m(e.startMs-n),s=o+a,c=Math.max(1,Math.min(e.layoutSize||1,6));(Array.isArray(e.slots)?e.slots:[]).forEach((e,n)=>{if(!Number.isInteger(e))return;let l=t[e];l&&r.push({id:`image-${e}-${i}-${n}`,asset:l,start:o,end:s,inFrame:0,outFrame:a,durationFrames:a,trackIndex:n,layoutSize:c,motion:O({imageWidth:l.width,imageHeight:l.height,layoutSize:c,slotIndex:n})})})}),r}function j({audioAssets:e,audioTracks:t,timelineStartMs:n}){return t.map((t,r)=>{let i=w(t),a=e[r];if(!i||!a)return null;let o=m(i.startMs-n),s=m(i.endMs-i.startMs);return{id:`audio-${r}`,asset:a,start:o,end:o+s,inFrame:0,outFrame:s,durationFrames:s}}).filter(Boolean)}function M({sequenceName:e=`Diapaudio Premiere`,scheduleIndex:t,imageAssets:n,audioTracks:r=[],audioAssets:i=[],mediaBasePathUrl:a=null}){let{timelineStartMs:o,timelineEndMs:s}=T(t,r),c=Math.max(1,m(s-o)),l=A({scheduleIndex:t,imageAssets:n,timelineStartMs:o}),u=j({audioAssets:i,audioTracks:r,timelineStartMs:o}),p=new Map;l.forEach(e=>{p.has(e.trackIndex)||p.set(e.trackIndex,[]),p.get(e.trackIndex).push(e)});let g=`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="5">
  <sequence id="sequence-1">
    <name>${h(e)}</name>
    <duration>${c}</duration>
    <rate>
      <timebase>30</timebase>
      <ntsc>FALSE</ntsc>
    </rate>
    <timecode>
      <rate>
        <timebase>30</timebase>
        <ntsc>FALSE</ntsc>
      </rate>
      <string>00:00:00:00</string>
      <frame>0</frame>
      <displayformat>NDF</displayformat>
    </timecode>
    <media>
      <video>
        <format>
          <samplecharacteristics>
            <rate>
              <timebase>30</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <width>${d}</width>
            <height>${f}</height>
            <anamorphic>FALSE</anamorphic>
            <pixelaspectratio>Square</pixelaspectratio>
            <fielddominance>none</fielddominance>
          </samplecharacteristics>
        </format>`;return Array.from(p.keys()).sort((e,t)=>e-t).forEach(e=>{g+=`
        <track>`,p.get(e).forEach(e=>{g+=`
          <clipitem id="${e.id}">
            <name>${h(e.asset.name)}</name>
            <enabled>TRUE</enabled>
            <duration>${e.durationFrames}</duration>
            <rate>
              <timebase>30</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <start>${e.start}</start>
            <end>${e.end}</end>
            <in>${e.inFrame}</in>
            <out>${e.outFrame}</out>
            ${E(e.asset,`video`,a)}
            <sourcetrack>
              <mediatype>video</mediatype>
              <trackindex>1</trackindex>
            </sourcetrack>
            <stillframe>TRUE</stillframe>
            <alphatype>none</alphatype>
            ${k(e.motion)}
          </clipitem>`}),g+=`
        </track>`}),g+=`
      </video>
      <audio>
        <numOutputChannels>2</numOutputChannels>
        <format>
          <samplecharacteristics>
            <depth>16</depth>
            <samplerate>48000</samplerate>
          </samplecharacteristics>
        </format>`,u.forEach(e=>{g+=`
        <track>
          <clipitem id="${e.id}">
            <name>${h(e.asset.name)}</name>
            <enabled>TRUE</enabled>
            <duration>${e.durationFrames}</duration>
            <rate>
              <timebase>30</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <start>${e.start}</start>
            <end>${e.end}</end>
            <in>${e.inFrame}</in>
            <out>${e.outFrame}</out>
            ${E(e.asset,`audio`,a)}
            <sourcetrack>
              <mediatype>audio</mediatype>
              <trackindex>1</trackindex>
            </sourcetrack>
          </clipitem>
        </track>`}),g+=`
      </audio>
    </media>
  </sequence>
</xmeml>`,{xml:g,durationFrames:c,imageClips:l,audioClips:u,timelineStartMs:o,timelineEndMs:s}}async function N(e,t){let n=await fetch(e);if(!n.ok)throw Error(`Failed to read ${t}`);return n.blob()}async function P(e){if(typeof globalThis.createImageBitmap==`function`){let t=await globalThis.createImageBitmap(e),n={width:t.width,height:t.height};return t.close?.(),n}if(typeof globalThis.Image==`function`&&typeof URL<`u`){let t=URL.createObjectURL(e);try{return await new Promise((e,n)=>{let r=new globalThis.Image;r.onload=()=>{e({width:r.naturalWidth||r.width||3840,height:r.naturalHeight||r.height||2160})},r.onerror=()=>n(Error(`Image dimensions could not be read.`)),r.src=t})}finally{URL.revokeObjectURL(t)}}return{width:d,height:f}}async function F(t,n,r){let i=[];for(let a=0;a<t.length;a+=1){let o=t[a],s=await N(o.url,o.name||`image ${a+1}`),c=await P(s).catch(t=>(e(`Could not read image dimensions:`,t),{width:d,height:f})),l=y(`media/images`,o.name,`image-${String(a+1).padStart(4,`0`)}.jpg`,n);i.push({id:`file-image-${a}`,name:g(l),packagePath:l,blob:s,width:c.width,height:c.height,durationFrames:1440*30}),r?.(a+1,t.length,i[i.length-1].name)}return i}async function I(e,t,n){let r=[];for(let i=0;i<e.length;i+=1){let a=e[i],o=await N(a.url,a.originalName||`audio ${i+1}`),s=y(`media/audio`,a.originalName||a.label,`audio-${String(i+1).padStart(3,`0`)}.wav`,t);r.push({id:`file-audio-${i}`,name:g(s),packagePath:s,blob:o,durationFrames:Number.isFinite(a.duration)?m(a.duration*1e3):0}),n?.(i+1,e.length,r[r.length-1].name)}return r}async function L({mediaData:e,mediaBasePathUrl:n=null,onProgress:r=null}){let i=R(),s=(e?.images||[]).filter(e=>Number.isFinite(C(e))),c=e?.audioTracks||[];if(!s.length&&!c.length)throw Error(`No media to export.`);let l=a(s,o(i));if(!l.entries.length&&!c.length)throw Error(`Images do not contain timestamps.`);let u=new Set;r?.(5,`processingFiles`,`Preparing Premiere media...`);let d=await F(s,u,(e,t,n)=>{r?.(5+Math.round(e/Math.max(1,t)*35),`processingFiles`,n)}),f=await I(c,u,(e,t,n)=>{r?.(45+Math.round(e/Math.max(1,t)*25),`processingFiles`,n)});r?.(75,`processingFiles`,`Building Premiere XML...`);let p=M({sequenceName:`Diapaudio Premiere`,scheduleIndex:l,imageAssets:d,audioTracks:c,audioAssets:f,mediaBasePathUrl:n}),m=p.timelineStartMs,h=p.timelineEndMs,g=t(new Date(m)),_=t(new Date(h));return{...p,imageAssets:d,audioAssets:f,filenameBase:`diapaudio_premiere_${g}-${_}`}}function R(){return globalThis.__DIAPAUDIO_EXPORT_SETTINGS__||i.getState?.()||{}}async function z({mediaData:e,mediaBasePathUrl:t=null}){let n=await L({mediaData:e,mediaBasePathUrl:t});S(new Blob([n.xml],{type:`application/xml`}),`${n.filenameBase}.xml`)}function B(e){return`Diapaudio Premiere package

Import:
1. Unzip this archive.
2. In Premiere Pro, choose File > Import and select diapaudio-premiere.xml.
3. If Premiere asks to relink media, choose the media folder from this archive.

Notes:
- Video is exported as a 3840x2160 editable multi-track sequence with the same horizontal split layout as the preview.
- If a mediaBasePathUrl was provided, XML pathurl fields point to that folder.
- mediaBasePathUrl: ${e||`(not provided)`}
`}async function V({mediaData:e,mediaBasePathUrl:t=null,onProgress:n=null}){let r=await L({mediaData:e,mediaBasePathUrl:t,onProgress:n}),i=new u(new c(`application/zip`),{bufferedWrite:!0,level:0});await i.add(`diapaudio-premiere.xml`,new s(r.xml)),await i.add(`README_IMPORT_PREMIERE.txt`,new s(B(t)));let a=[...r.imageAssets,...r.audioAssets];for(let e=0;e<a.length;e+=1){let t=a[e];n?.(80+Math.round((e+1)/Math.max(1,a.length)*15),`processingFiles`,t.packagePath),await i.add(t.packagePath,new l(t.blob))}n?.(98,`processingFiles`,`Finalizing Premiere package...`),S(await i.close(),`${r.filenameBase}.zip`),n?.(100,`complete`,`${r.filenameBase}.zip`)}function H(e){if(!e)return``;let t=String(e).split(/[/\\]/);return t[t.length-1]||e}function U(e,t){let n=URL.createObjectURL(e),r=document.createElement(`a`);r.href=n,r.download=t,r.rel=`noopener`,document.body.append(r),r.click(),r.remove(),URL.revokeObjectURL(n)}async function W(e){return z(e)}async function G({mediaData:i,delaySeconds:a=0,onProgress:o=null}){if(!i?.images?.length)throw Error(`No media to export.`);let d=[...i.images].filter(e=>e?.originalTimestamp instanceof Date);if(!d.length)throw Error(`Images do not contain timestamps.`);d.sort((e,t)=>n(e.originalTimestamp)-n(t.originalTimestamp));let f=d[0].originalTimestamp,p=d[d.length-1].originalTimestamp,m=`diapaudio_${t(f)}-${t(p)}.zip`,h=i.audioTracks||[],g=1+h.length+d.length,_=0,v=(e=``)=>{o&&o(Math.round(_/g*100),`processingFiles`,e)};v(`Creating archive...`);let y=new u(new c(`application/zip`),{bufferedWrite:!0,level:0});await y.add(`_delay.txt`,new s(r(a||0))),_++,v(`Added delay file`);for(let t=0;t<h.length;t+=1){let n=h[t];try{let e=await fetch(n.url);if(!e.ok)throw Error(`Failed to fetch ${n.originalName||`(audio)`}`);let r=await e.blob(),i=H(n.originalName||`audio.wav`);await y.add(i,new l(r)),_++,v(`Added audio ${t+1}/${h.length}: ${i}`)}catch(n){e(`Skipped audio track during export:`,n),_++,v(`Skipped audio ${t+1}/${h.length}`)}}for(let t=0;t<d.length;t+=1){let n=d[t];try{let e=await fetch(n.url);if(!e.ok)throw Error(`Failed to fetch ${n.name||`(image)`}`);let r=await e.blob(),i=H(n.name||`image.jpg`);await y.add(i,new l(r)),_++,v(`Added image ${t+1}/${d.length}`)}catch(n){e(`Skipped image during export:`,n),_++,v(`Skipped image ${t+1}/${d.length}`)}}v(`Finalizing archive...`),U(await y.close(),m),o?.(100,`complete`,`Downloaded ${m}`)}export{W as exportFinalCutProXml,z as exportPremiereXml,V as exportPremiereXmlPackage,G as exportZipArchive};