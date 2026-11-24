/* Shinka File & Image Toolbox - image operations stay in memory only. */
'use strict';
let toolboxTab='image',toolboxTool='compress',toolboxFiles=[],toolboxProcessed=[],toolboxDocTool='images-pdf',toolboxDocOutput=null;
const toolboxPresets=[{label:'Avatar · 256×256',w:256,h:256},{label:'Profile · 512×512',w:512,h:512},{label:'HD · 1280×720',w:1280,h:720},{label:'Full HD · 1920×1080',w:1920,h:1080},{label:'Instagram · 1080×1080',w:1080,h:1080}];
function setToolboxTab(tab){toolboxTab=tab==='document'?'document':'image'}
/* Capture toolbox tab clicks before the application's general action router.
   This keeps the standalone module usable even if the main router changes. */
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-action="toolbox-tab"]');
 if(!button)return;
 e.preventDefault();
 e.stopImmediatePropagation();
 setToolboxTab(button.dataset.tab||'image');
 const shell=document.querySelector('.fit-shell');
 if(shell)shell.outerHTML=renderFileImageToolbox();
},true);

function setToolboxTool(tool){toolboxTool=['compress','resize','convert'].includes(tool)?tool:'compress'}
function toolboxFormatBytes(bytes){if(!Number.isFinite(bytes))return '—';if(bytes<1024)return bytes+' B';if(bytes<1024*1024)return (bytes/1024).toFixed(1)+' KB';return (bytes/1024/1024).toFixed(2)+' MB'}
function toolboxEscape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toolboxFormatLabel(file){return (file.type||'image').split('/').pop().toUpperCase()}
function toolboxOutputExtension(format){return format==='image/jpeg'?'jpg':format==='image/png'?'png':'webp'}
function toolboxMime(format){return ({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'})[String(format).toLowerCase()]||'image/webp'}
function renderFileImageToolbox(){
 const isImage=toolboxTab==='image';
 const tools=[['compress','Compress','Reduce image file size'],['resize','Resize','Change dimensions'],['convert','Convert format','JPG · PNG · WebP']];
 const toolNav=tools.map(([id,label,desc])=>'<button type="button" class="fit-tool '+(toolboxTool===id?'selected':'')+'" data-action="toolbox-tool" data-tool="'+id+'"><strong>'+label+'</strong><small>'+desc+'</small></button>').join('');
 const files=toolboxFiles.length?'<div class="fit-file-list">'+toolboxFiles.map((item,i)=>'<article class="fit-file-row"><div class="fit-thumb">'+(item.preview?'<img src="'+item.preview+'" alt="">':'▧')+'</div><div class="fit-file-info"><strong>'+toolboxEscape(item.file.name)+'</strong><small>'+toolboxFormatBytes(item.file.size)+' · '+toolboxEscape(toolboxFormatLabel(item.file))+'</small></div><div class="fit-file-actions"><button type="button" class="fit-icon-btn" data-action="toolbox-move" data-index="'+i+'" data-direction="-1" '+(i===0?'disabled':'')+' aria-label="Move up">↑</button><button type="button" class="fit-icon-btn" data-action="toolbox-move" data-index="'+i+'" data-direction="1" '+(i===toolboxFiles.length-1?'disabled':'')+' aria-label="Move down">↓</button><button type="button" class="fit-icon-btn danger" data-action="toolbox-remove" data-index="'+i+'" aria-label="Remove file">×</button></div></article>').join('')+'</div>':'<div class="fit-empty">No images selected yet</div>';
 const output=toolboxProcessed.length?'<div class="fit-output-list">'+toolboxProcessed.map((item,i)=>'<article class="fit-output-row"><div><strong>'+toolboxEscape(item.name)+'</strong><small>'+toolboxFormatBytes(item.blob.size)+' · '+item.width+'×'+item.height+(item.reduction!==null?' · '+item.reduction+'% smaller':'')+'</small></div><button type="button" class="fit-small-btn" data-action="toolbox-download" data-index="'+i+'">Download</button></article>').join('')+'</div>':'<div class="fit-empty">Processed images will appear here</div>';
 const options=toolboxTool==='compress'?'<div class="fit-field"><label for="fitTargetKB">Target file size</label><div class="fit-target-input"><input id="fitTargetKB" type="number" min="10" max="51200" step="10" value="500"><span>KB</span></div><small>We will try to reach this size while keeping the original dimensions and the highest possible visual quality. The result is approximate.</small></div><div class="fit-field"><label for="fitFormat">Output format</label><select id="fitFormat"><option value="image/jpeg">JPG (recommended)</option><option value="image/webp">WebP</option></select><small>PNG is not offered here because lossless PNG compression cannot reliably meet an arbitrary target size.</small></div>'
 :toolboxTool==='resize'?'<div class="fit-field"><label for="fitPreset">Dimension preset</label><select id="fitPreset"><option value="">Custom dimensions</option>'+toolboxPresets.map((p,i)=>'<option value="'+i+'">'+p.label+'</option>').join('')+'</select></div><div class="fit-dimensions"><div class="fit-field"><label for="fitWidth">Width (px)</label><input id="fitWidth" type="number" min="1" max="12000" value="1280"></div><div class="fit-field"><label for="fitHeight">Height (px)</label><input id="fitHeight" type="number" min="1" max="12000" value="720"></div></div><label class="fit-check"><input id="fitAspect" type="checkbox" checked> Maintain aspect ratio</label><div class="fit-field"><label for="fitResizeQuality">Output quality <strong id="fitResizeQualityValue">88%</strong></label><input id="fitResizeQuality" type="range" min="10" max="100" value="88"></div><div class="fit-field"><label for="fitResizeFormat">Output format</label><select id="fitResizeFormat"><option value="original">Keep original format</option><option value="image/jpeg">JPG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option></select></div>'
 :'<div class="fit-field"><label for="fitConvertFormat">Convert to</label><select id="fitConvertFormat"><option value="image/jpeg">JPG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option></select></div><div class="fit-field"><label for="fitConvertQuality">Quality <strong id="fitConvertQualityValue">90%</strong></label><input id="fitConvertQuality" type="range" min="10" max="100" value="90"><small>Quality controls JPG and WebP. PNG remains lossless.</small></div>';
 const content=isImage?'<div class="fit-layout"><section class="fit-panel"><div class="fit-panel-head"><div><h3>Image settings</h3><p>Choose how your images should be processed.</p></div></div>'+toolNav+'<div class="fit-options">'+options+'</div><div class="fit-actions"><button type="button" class="fit-primary" data-action="toolbox-process" '+(!toolboxFiles.length?'disabled':'')+'>Process '+toolboxFiles.length+' image'+(toolboxFiles.length===1?'':'s')+'</button><button type="button" class="fit-secondary" data-action="toolbox-clear">Clear all</button></div></section><section class="fit-panel"><div class="fit-panel-head"><div><h3>Your images</h3><p>Files stay in this browser tab and are never uploaded.</p></div><span class="fit-count">'+toolboxFiles.length+' selected</span></div><label class="fit-dropzone" id="fitDropzone"><input id="fitFiles" type="file" accept="image/jpeg,image/png,image/webp" multiple><span class="fit-upload-icon">＋</span><strong>Drop images here</strong><span>or browse files · JPG, PNG, WebP</span></label>'+files+'</section></div><section class="fit-panel fit-results"><div class="fit-panel-head"><div><h3>Processed results</h3><p>Compare file sizes and download your outputs.</p></div><button type="button" class="fit-secondary" data-action="toolbox-download-all" '+(!toolboxProcessed.length?'disabled':'')+'>Download all</button></div>'+output+'</section>'
 :'<section class="fit-panel fit-document-panel"><div class="fit-doc-heading"><span class="fit-doc-icon">▤</span><h3>Document Converter</h3><p>Choose a document operation. Processing stays in this browser.</p></div><div class="fit-doc-tools"><button type="button" class="fit-doc-tool '+(toolboxDocTool==='images-pdf'?'selected':'')+'" data-action="toolbox-doc-tool" data-tool="images-pdf"><strong>Images → PDF</strong><small>Combine images into a PDF document</small><span class="fit-status-live">Available now</span></button><div class="fit-doc-tool disabled"><strong>PDF → Images</strong><small>Render PDF pages to PNG or JPG</small><span>Engine not implemented yet</span></div><div class="fit-doc-tool disabled"><strong>PDF → DOCX</strong><small>Extract editable text and layout</small><span>Engine not implemented yet</span></div><div class="fit-doc-tool disabled"><strong>DOCX → PDF</strong><small>Convert Word page layout to PDF</small><span>Engine not implemented yet</span></div></div><div class="fit-doc-workspace"><div class="fit-panel-head"><div><h3>Images → PDF</h3><p>Add images, arrange their page order, then create your PDF.</p></div><span class="fit-count">'+toolboxFiles.length+' images</span></div><label class="fit-dropzone" id="fitDropzone"><input id="fitFiles" type="file" accept="image/jpeg,image/png,image/webp" multiple><span class="fit-upload-icon">＋</span><strong>Add images for your PDF</strong><span>JPG, PNG or WebP · each image becomes one page</span></label>'+files+'<div class="fit-doc-actions"><label for="fitPdfPageSize">Page size</label><select id="fitPdfPageSize"><option value="a4">A4</option><option value="letter">US Letter</option><option value="image">Fit page to image</option></select><button type="button" class="fit-primary" data-action="toolbox-doc-process" '+(!toolboxFiles.length?'disabled':'')+'>Create PDF</button><button type="button" class="fit-secondary" data-action="toolbox-clear">Clear images</button></div><div id="fitDocResult" class="fit-doc-result">'+(toolboxDocOutput?'<strong>PDF ready</strong><span>'+toolboxEscape(toolboxDocOutput.name)+' · '+toolboxFormatBytes(toolboxDocOutput.blob.size)+'</span><button type="button" class="fit-small-btn" data-action="toolbox-doc-download">Download PDF</button>':'Your PDF will appear here after conversion.')+'</div></div><div class="fit-privacy-note">This first document engine creates image-based PDFs. It does not extract text from images. Other document engines are not yet available.</div></section>';
 return '<section class="fit-shell"><div class="fit-intro"><div><div class="eyebrow">LOCAL FILE UTILITIES</div><h2>File &amp; Image Toolbox</h2><p>Small, practical file tools. Your files stay on your device.</p></div><span class="fit-shield">⌑ &nbsp; Private by design</span></div><div class="fit-tabs" role="tablist"><button type="button" data-action="toolbox-tab" data-tab="document" class="'+(!isImage?'selected':'')+'" aria-selected="'+(!isImage)+'">Document Converter</button><button type="button" data-action="toolbox-tab" data-tab="image" class="'+(isImage?'selected':'')+'" aria-selected="'+isImage+'">Image Optimizer</button></div>'+content+'<div class="fit-privacy-note">Processing is local and temporary. Nothing is saved to Shinka tasks, projects, time logs, IndexedDB or LocalStorage.</div></section>';
}
function clearToolboxFiles(){toolboxFiles.forEach(x=>x.preview&&URL.revokeObjectURL(x.preview));toolboxFiles=[];toolboxProcessed=[];toolboxDocOutput=null}
function removeToolboxFile(index){const item=toolboxFiles[index];if(item?.preview)URL.revokeObjectURL(item.preview);toolboxFiles.splice(index,1);toolboxProcessed=[]}
function moveToolboxFile(index,direction){const next=index+direction;if(next<0||next>=toolboxFiles.length)return;[toolboxFiles[index],toolboxFiles[next]]=[toolboxFiles[next],toolboxFiles[index]]}
function toolboxLoadImage(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>resolve({img,url});img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not read image '+file.name))};img.src=url})}
async function toolboxCanvasBlob(canvas,mime,quality){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('This browser could not create the selected image format.')),mime,quality))}
async function processToolboxImages(){
 if(!toolboxFiles.length)throw new Error('Choose at least one image first.');
 const output=[];
 for(const item of toolboxFiles){
  const {img,url}=await toolboxLoadImage(item.file);
  try{
   let width=img.naturalWidth,height=img.naturalHeight,mime=item.file.type||'image/png',blob;
   if(toolboxTool==='resize'){
    const w=Number(document.querySelector('#fitWidth')?.value),h=Number(document.querySelector('#fitHeight')?.value);
    if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>12000||h>12000)throw new Error('Enter dimensions between 1 and 12,000 pixels.');
    if(document.querySelector('#fitAspect')?.checked){const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight);width=Math.max(1,Math.round(img.naturalWidth*scale));height=Math.max(1,Math.round(img.naturalHeight*scale))}else{width=w;height=h}
    const chosen=document.querySelector('#fitResizeFormat')?.value||'original';if(chosen!=='original')mime=chosen;
   }else if(toolboxTool==='convert'){mime=document.querySelector('#fitConvertFormat')?.value||'image/jpeg'}
   else{mime=document.querySelector('#fitFormat')?.value||'image/jpeg';}
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   const ctx=canvas.getContext('2d',{alpha:mime!=='image/jpeg'});if(!ctx)throw new Error('Canvas is not available in this browser.');
   if(mime==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height)}
   ctx.drawImage(img,0,0,width,height);
   if(toolboxTool==='compress'){
    const targetKB=Number(document.querySelector('#fitTargetKB')?.value);
    if(!Number.isFinite(targetKB)||targetKB<10||targetKB>51200)throw new Error('Target size must be between 10 KB and 51,200 KB.');
    const target=targetKB*1024;
    let low=.08,high=.98,best=null,smallest=null;
    for(let attempt=0;attempt<9;attempt++){
     const q=(low+high)/2,candidate=await toolboxCanvasBlob(canvas,mime,q);
     if(!smallest||candidate.size<smallest.size)smallest=candidate;
     if(candidate.size<=target){best=candidate;low=q}else{high=q}
    }
    blob=best||smallest;
   }else blob=await toolboxCanvasBlob(canvas,mime,toolboxTool==='resize'?Number(document.querySelector('#fitResizeQuality')?.value||88)/100:Number(document.querySelector('#fitConvertQuality')?.value||90)/100);
   const ext=toolboxOutputExtension(mime),base=item.file.name.replace(/\.[^.]+$/,'');
   const reduction=Math.round((1-blob.size/item.file.size)*100);
   output.push({name:base+(toolboxTool==='compress'?'-compressed':toolboxTool==='resize'?'-resized':'-'+ext)+'.'+ext,blob,width,height,reduction,originalSize:item.file.size,targetMet:toolboxTool==='compress'?blob.size<=Number(document.querySelector('#fitTargetKB')?.value)*1024:null});
   canvas.width=0;canvas.height=0;
  }finally{URL.revokeObjectURL(url)}
 }
 toolboxProcessed.forEach(x=>x.url&&URL.revokeObjectURL(x.url));toolboxProcessed=output.map(x=>({...x,url:URL.createObjectURL(x.blob)}));
 if(typeof showToast==='function')showToast('Processed '+output.length+' image'+(output.length===1?'':'s')+'.');
}

function toolboxConcatBytes(parts){const length=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(length);let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length}return out}
function toolboxAscii(value){return new TextEncoder().encode(value)}
async function toolboxImageAsJpeg(file){const bitmap=await createImageBitmap(file);try{const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0);const blob=await toolboxCanvasBlob(canvas,'image/jpeg',.94);canvas.width=0;canvas.height=0;return{bytes:new Uint8Array(await blob.arrayBuffer()),width:bitmap.width,height:bitmap.height}}finally{bitmap.close?.()}}
async function createToolboxPdfFromImages(){
 if(!toolboxFiles.length)throw new Error('Add at least one image first.');
 const size=document.querySelector('#fitPdfPageSize')?.value||'a4';
 const page=size==='letter'?[612,792]:[595.28,841.89],objects=[null],pages=[];
 const addObject=bytes=>{objects.push(bytes);return objects.length};
 const catalogId=addObject(new Uint8Array()),pagesId=addObject(new Uint8Array());
 for(const item of toolboxFiles){
  const image=await toolboxImageAsJpeg(item.file);
  const pw=size==='image'?image.width*72/96:page[0],ph=size==='image'?image.height*72/96:page[1];
  const scale=Math.min(pw/image.width,ph/image.height),dw=image.width*scale,dh=image.height*scale,x=(pw-dw)/2,y=(ph-dh)/2;
  const imageHeader=toolboxAscii('<< /Type /XObject /Subtype /Image /Width '+image.width+' /Height '+image.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+image.bytes.length+' >>\nstream\n');
  const imageStream=toolboxConcatBytes([imageHeader,image.bytes,toolboxAscii('\nendstream')]);
  const imageId=addObject(imageStream);
  const commands='q\n'+dw.toFixed(3)+' 0 0 '+dh.toFixed(3)+' '+x.toFixed(3)+' '+y.toFixed(3)+' cm\n/Im0 Do\nQ\n';
  const commandBytes=toolboxAscii(commands),contentId=addObject(toolboxConcatBytes([toolboxAscii('<< /Length '+commandBytes.length+' >>\nstream\n'),commandBytes,toolboxAscii('endstream')]));
  const pageId=addObject(toolboxAscii('<< /Type /Page /Parent '+pagesId+' 0 R /MediaBox [0 0 '+pw.toFixed(3)+' '+ph.toFixed(3)+'] /Resources << /XObject << /Im0 '+imageId+' 0 R >> >> /Contents '+contentId+' 0 R >>'));
  pages.push(pageId);
 }
 objects[catalogId-1]=toolboxAscii('<< /Type /Catalog /Pages '+pagesId+' 0 R >>');
 objects[pagesId-1]=toolboxAscii('<< /Type /Pages /Kids ['+pages.map(id=>id+' 0 R').join(' ')+'] /Count '+pages.length+' >>');
 const chunks=[toolboxAscii('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')],offsets=[0];let offset=chunks[0].length;
 for(let i=0;i<objects.length;i++){offsets.push(offset);const part=toolboxConcatBytes([toolboxAscii((i+1)+' 0 obj\n'),objects[i],toolboxAscii('\nendobj\n')]);chunks.push(part);offset+=part.length}
 const xrefOffset=offset,xref=['xref\n0 '+(objects.length+1)+'\n','0000000000 65535 f \n'];for(let i=1;i<offsets.length;i++)xref.push(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
 chunks.push(toolboxAscii(xref.join('')+'trailer\n<< /Size '+(objects.length+1)+' /Root '+catalogId+' 0 R >>\nstartxref\n'+xrefOffset+'\n%%EOF'));
 return new Blob([toolboxConcatBytes(chunks)],{type:'application/pdf'});
}
async function processToolboxDocument(){toolboxDocOutput=null;const blob=await createToolboxPdfFromImages();toolboxDocOutput={blob,name:'shinka-images-'+new Date().toISOString().slice(0,10)+'.pdf'};if(typeof showToast==='function')showToast('PDF created locally.')}
function downloadToolboxDocument(){if(!toolboxDocOutput)throw new Error('Create the PDF first.');const url=URL.createObjectURL(toolboxDocOutput.blob),a=document.createElement('a');a.href=url;a.download=toolboxDocOutput.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}

function downloadToolboxFile(index){const item=toolboxProcessed[index];if(!item)throw new Error('That processed file is no longer available.');const url=URL.createObjectURL(item.blob),a=document.createElement('a');a.href=url;a.download=item.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function toolboxCrc32(bytes){let crc=0xffffffff;for(let i=0;i<bytes.length;i++){crc^=bytes[i];for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0}
function toolboxZip16(v){return new Uint8Array([v&255,(v>>>8)&255])}
function toolboxZip32(v){return new Uint8Array([v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255])}
function toolboxZipJoin(parts){return toolboxConcatBytes(parts)}
async function toolboxCreateZip(entries){
 const enc=new TextEncoder(),local=[],central=[];let offset=0;
 for(const entry of entries){const name=enc.encode(entry.name),data=new Uint8Array(await entry.blob.arrayBuffer()),crc=toolboxCrc32(data);
  const header=toolboxZipJoin([toolboxZip32(0x04034b50),toolboxZip16(20),toolboxZip16(0x0800),toolboxZip16(0),toolboxZip16(0),toolboxZip16(0),toolboxZip32(crc),toolboxZip32(data.length),toolboxZip32(data.length),toolboxZip16(name.length),toolboxZip16(0),name]);
  local.push(header,data);
  const record=toolboxZipJoin([toolboxZip32(0x02014b50),toolboxZip16(20),toolboxZip16(20),toolboxZip16(0x0800),toolboxZip16(0),toolboxZip16(0),toolboxZip16(0),toolboxZip32(crc),toolboxZip32(data.length),toolboxZip32(data.length),toolboxZip16(name.length),toolboxZip16(0),toolboxZip16(0),toolboxZip16(0),toolboxZip16(0),toolboxZip32(0),toolboxZip32(offset),name]);
  central.push(record);offset+=header.length+data.length;
 }
 const centralBytes=toolboxZipJoin(central),centralOffset=offset,centralSize=centralBytes.length;
 const end=toolboxZipJoin([toolboxZip32(0x06054b50),toolboxZip16(0),toolboxZip16(0),toolboxZip16(entries.length),toolboxZip16(entries.length),toolboxZip32(centralSize),toolboxZip32(centralOffset),toolboxZip16(0)]);
 return new Blob([...local,centralBytes,end],{type:'application/zip'});
}
async function downloadToolboxAll(){if(!toolboxProcessed.length)throw new Error('Process images before downloading.');const blob=await toolboxCreateZip(toolboxProcessed.map(x=>({name:x.name,blob:x.blob})));const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='shinka-processed-images.zip';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);if(typeof showToast==='function')showToast('ZIP archive created locally.');}
document.addEventListener('change',e=>{
 if(e.target?.id==='fitFiles'){const selected=[...e.target.files];const allowed=selected.filter(f=>['image/jpeg','image/png','image/webp'].includes(f.type));if(allowed.length!==selected.length)showToast('Only JPG, PNG and WebP files are supported.',true);for(const file of allowed){if(file.size>30*1024*1024){showToast(file.name+' exceeds the 30 MB per-image limit.',true);continue}toolboxFiles.push({file,preview:URL.createObjectURL(file)})}toolboxProcessed=[];toolboxDocOutput=null;const root=document.querySelector('.fit-shell');if(root)root.outerHTML=renderFileImageToolbox()}
 if(e.target?.id==='fitPreset'&&e.target.value!==''){const p=toolboxPresets[Number(e.target.value)];if(p){document.querySelector('#fitWidth').value=p.w;document.querySelector('#fitHeight').value=p.h}}
});
document.addEventListener('input',e=>{const mapping={'fitQuality':['fitQualityValue','%'],'fitResizeQuality':['fitResizeQualityValue','%'],'fitConvertQuality':['fitConvertQualityValue','%']};const item=mapping[e.target?.id];if(item){const label=document.getElementById(item[0]);if(label)label.textContent=e.target.value+item[1]}}
);
document.addEventListener('dragover',e=>{if(e.target.closest('#fitDropzone')){e.preventDefault();e.target.closest('#fitDropzone').classList.add('dragging')}});
document.addEventListener('dragleave',e=>{const zone=e.target.closest('#fitDropzone');if(zone&&!zone.contains(e.relatedTarget))zone.classList.remove('dragging')});
document.addEventListener('drop',e=>{const zone=e.target.closest('#fitDropzone');if(!zone)return;e.preventDefault();zone.classList.remove('dragging');const input=zone.querySelector('input');const dt=new DataTransfer();[...e.dataTransfer.files].forEach(f=>dt.items.add(f));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}))});
window.addEventListener('beforeunload',clearToolboxFiles);
