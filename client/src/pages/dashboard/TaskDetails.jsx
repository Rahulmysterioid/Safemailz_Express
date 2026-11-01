import React, { useEffect, useRef, useState } from 'react';
import { FiBold, FiItalic, FiList, FiLink, FiCode, FiPaperclip, FiHelpCircle, FiChevronDown } from 'react-icons/fi';

import { renderToStaticMarkup } from 'react-dom/server';

const RICH = '<!--task-rich-->';
const safeLink = value => /^(https?:\/\/|mailto:)/i.test(value);
// Formatting is rendered as React nodes. User-authored HTML is always plain text.
function inline(text) {
    return text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|~~[^~]+~~|`[^`]+`|\*[^*]+\*)/g).map((part,i)=>{
        const link=/^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
        if(link && safeLink(link[2])) return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>;
        if(part.startsWith('**'))return <strong key={i}>{part.slice(2,-2)}</strong>;
        if(part.startsWith('~~'))return <s key={i}>{part.slice(2,-2)}</s>;
        if(part.startsWith('`'))return <code key={i}>{part.slice(1,-1)}</code>;
        if(part.startsWith('*'))return <em key={i}>{part.slice(1,-1)}</em>;
        return part;
    });
}
function LegacyDescription({text}) {
    return <div className="task-description">{text.split('\n').map((line,i)=>{
        if(line.startsWith('## '))return <h4 key={i}>{inline(line.slice(3))}</h4>;
        if(line.startsWith('# '))return <h3 key={i}>{inline(line.slice(2))}</h3>;
        if(line.startsWith('> '))return <blockquote key={i}>{inline(line.slice(2))}</blockquote>;
        const list=/^(- |\d+\. )(.*)$/.exec(line);
        if(list)return <div className="task-description-bullet" key={i}><span>{list[1]==='- '?'•':list[1]}</span><span>{inline(list[2])}</span></div>;
        return <div key={i}>{line?inline(line):'\u00a0'}</div>;
    })}</div>;
}
// Rebuild an allowlisted tree: scripts, styles, event handlers and unsafe URLs never enter the editor.
function cleanFragment(html) {
    const source=new DOMParser().parseFromString(html,'text/html');
    const target=document.createDocumentFragment();
    const allowed=new Set(['p','div','br','b','strong','i','em','s','strike','u','ul','ol','li','blockquote','h1','h2','h3','h4','code','a']);
    const copy=(node,parent)=>{
        if(node.nodeType===3){parent.append(document.createTextNode(node.textContent));return;}
        if(node.nodeType!==1 || ['script','style','iframe','object','svg','math'].includes(node.localName))return;
        const el=allowed.has(node.localName)?document.createElement(node.localName):document.createDocumentFragment();
        if(node.localName==='a' && safeLink(node.getAttribute('href')||'')){el.setAttribute('href',node.getAttribute('href'));el.setAttribute('target','_blank');el.setAttribute('rel','noopener noreferrer');}
        [...node.childNodes].forEach(child=>copy(child,el));parent.append(el);
    };
    [...source.body.childNodes].forEach(node=>copy(node,target));return target;
}
export function TaskDescription({text}) {
    if(!text.startsWith(RICH))return <LegacyDescription text={text}/>;
    const fragment=cleanFragment(text.slice(RICH.length));
    const render=(node,key)=>node.nodeType===3?node.textContent:React.createElement(node.localName,{key,...(node.localName==='a'?{href:node.getAttribute('href'),target:'_blank',rel:'noopener noreferrer'}:{})},...Array.from(node.childNodes,(n,i)=>render(n,i)));
    return <div className="task-description">{Array.from(fragment.childNodes,(n,i)=>render(n,i))}</div>;
}
export function DescriptionEditor({value,onChange,disabled,children}) {
    const input=useRef(null), savedRange=useRef(null), initialized=useRef(false);
    const [help,setHelp]=useState(false), [linkOpen,setLinkOpen]=useState(false), [url,setUrl]=useState(''), [message,setMessage]=useState(''), [count,setCount]=useState(0);
    const [active,setActive]=useState({});
    useEffect(()=>{
        if(initialized.current)return;initialized.current=true;
        input.current.replaceChildren(cleanFragment(value.startsWith(RICH)?value.slice(RICH.length):renderToStaticMarkup(<LegacyDescription text={value}/>)));
        if(!value)input.current.replaceChildren();
        setCount(input.current.innerText.length);
    },[value]);
    const remember=()=>{
        const sel=window.getSelection();
        if(sel.rangeCount && input.current.contains(sel.anchorNode) && input.current.contains(sel.focusNode))savedRange.current=sel.getRangeAt(0).cloneRange();
        setActive({bold:document.queryCommandState('bold'),italic:document.queryCommandState('italic'),strikeThrough:document.queryCommandState('strikeThrough')});
    };
    const restore=()=>{input.current.focus();if(savedRange.current && input.current.contains(savedRange.current.commonAncestorContainer)){const sel=window.getSelection();sel.removeAllRanges();sel.addRange(savedRange.current);}};
    const sync=()=>{
        const el=input.current;const holder=document.createElement('div');holder.append(cleanFragment(el.innerHTML));
        const text=el.innerText;const next=text.trim()?RICH+holder.innerHTML:'';
        if(text.length>2000 || next.length>20000){document.execCommand('undo');setMessage('Description limit is 2,000 characters.');return;}
        setMessage('');setCount(text.length);onChange(next);remember();
    };
    const command=(name,arg=null)=>{restore();document.execCommand(name,false,arg);sync();};
    const button=(label,Icon,action,cmd)=><button type="button" title={label} aria-label={label} aria-pressed={cmd?Boolean(active[cmd]):undefined} disabled={disabled} onMouseDown={e=>e.preventDefault()} onClick={action}><Icon aria-hidden="true"/></button>;
    return <div className="task-description-editor">
        <label id="task-description-label">Description <span className="task-muted">(optional)</span></label>
        <div className="task-rich-frame">
            <div className="task-format-toolbar" role="group" aria-label="Description formatting">
                <div className="task-toolbar-select"><span aria-hidden="true">Tt <FiChevronDown/></span><select title="Text style" aria-label="Text style" disabled={disabled} value="" onChange={e=>command('formatBlock',e.target.value)}><option value="" disabled>Text style</option><option value="p">Normal text</option><option value="h3">Heading 1</option><option value="h4">Heading 2</option><option value="blockquote">Quote</option></select></div>
                <span className="task-toolbar-divider"/>
                {button('Bold selected text',FiBold,()=>command('bold'),'bold')}
                {button('Italic selected text',FiItalic,()=>command('italic'),'italic')}
                <button type="button" title="Strikethrough" aria-label="Strikethrough" aria-pressed={Boolean(active.strikeThrough)} disabled={disabled} onMouseDown={e=>e.preventDefault()} onClick={()=>command('strikeThrough')}><s>S</s></button>
                <span className="task-toolbar-divider"/>
                <div className="task-toolbar-select"><span aria-hidden="true"><FiList/><FiChevronDown/></span><select title="List formatting" aria-label="List formatting" disabled={disabled} value="" onChange={e=>command(e.target.value)}><option value="" disabled>Lists</option><option value="insertUnorderedList">Bullet list</option><option value="insertOrderedList">Numbered list</option></select></div>
                <span className="task-toolbar-divider"/>
                {button('Insert link',FiLink,()=>{remember();setLinkOpen(!linkOpen);setUrl('');})}
                {button('Inline code',FiCode,()=>{restore();const sel=window.getSelection();if(!sel.toString()){setMessage('Select text to format as code.');return;}const code=document.createElement('code');code.textContent=sel.toString();document.execCommand('insertHTML',false,code.outerHTML);sync();})}
                {button('Attach files',FiPaperclip,()=>document.getElementById('task-files')?.click())}
                <span className="task-toolbar-spacer"/>
                <button type="button" title="Formatting help" aria-label="Formatting help" aria-expanded={help} onClick={()=>setHelp(!help)}><FiHelpCircle aria-hidden="true"/></button>
            </div>
            {linkOpen && <div className="task-link-panel"><label htmlFor="task-link-url">Link address</label><div><input id="task-link-url" autoFocus placeholder="https://example.com" value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')e.preventDefault();}}/><button type="button" className="task-btn" disabled={!safeLink(url.trim())} onClick={()=>{restore();if(!window.getSelection().toString()){const a=document.createElement('a');a.href=url.trim();a.textContent=url.trim();document.execCommand('insertHTML',false,a.outerHTML);sync();}else command('createLink',url.trim());setLinkOpen(false);}}>Insert</button><button type="button" className="task-icon-btn" aria-label="Cancel link" onClick={()=>setLinkOpen(false)}>×</button></div></div>}
            <div id="task-description-input" ref={input} className="task-live-editor task-description" role="textbox" aria-labelledby="task-description-label" aria-multiline="true" aria-readonly={disabled} contentEditable={!disabled} suppressContentEditableWarning data-placeholder="Add a more detailed description…" onInput={sync} onMouseUp={remember} onKeyUp={remember} onBlur={remember} onPaste={e=>{e.preventDefault();command('insertText',e.clipboardData.getData('text/plain'));}} onDrop={e=>e.preventDefault()}/>
            {children}
        </div>
        {help && <div className="task-format-help">Select text and choose a formatting button, or switch on Bold / Italic before typing. Formatting appears instantly. Use Ctrl+B or Ctrl+I for shortcuts.</div>}
        {message && <div role="status" className="task-format-help">{message}</div>}
        <span className="task-editor-count">Live formatting <span>{count}/2,000</span></span>
    </div>;
}
export function AttachmentPreview({file,taskId,onDownload,onRemove}) {
    const [src,setSrc]=useState(''), [failed,setFailed]=useState(false);
    const extension=file.name.split('.').pop().toLowerCase();
    const mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp'}[extension];
    useEffect(()=>{
        if(!mime)return;
        const controller=new AbortController();let objectUrl;
        setSrc('');setFailed(false);
        (async()=>{
            try {
                let blob;
                if(file.data){const bytes=Uint8Array.from(atob(file.data),c=>c.charCodeAt(0));blob=new Blob([bytes],{type:mime});}
                else {
                    const token=localStorage.getItem('token') || sessionStorage.getItem('token');
                    const response=await fetch(`/api/tasks/${encodeURIComponent(taskId)}/attachments/${encodeURIComponent(file.id)}`,{headers:{Authorization:`Bearer ${token || ''}`},signal:controller.signal});
                    if(!response.ok)throw new Error('Preview unavailable');
                    blob=new Blob([await response.arrayBuffer()],{type:mime});
                }
                if(controller.signal.aborted)return;
                objectUrl=URL.createObjectURL(blob);setSrc(objectUrl);
            }catch(err){if(err.name!=='AbortError')setFailed(true);}
        })();
        return ()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
    },[file.id,file.data,taskId,mime]);
    return <div className="task-inline-file">
        {mime && src && !failed?<img className="task-inline-image" src={src} alt={file.name} onError={()=>setFailed(true)}/>:<div className="task-inline-file-icon" aria-hidden="true">{mime&&!failed?'…':extension.slice(0,5).toUpperCase()||'FILE'}</div>}
        <div className="task-inline-file-info">{file.id?<button type="button" className="task-file-link" onClick={()=>onDownload(taskId,file)}>{file.name}</button>:<strong>{file.name}</strong>}<small>{Math.max(1,Math.round(file.size/1024))} KB{mime&&failed?' · Preview unavailable':''}</small></div>
        {onRemove && <button type="button" className="task-icon-btn task-inline-remove" aria-label={`Remove ${file.name}`} onClick={onRemove}>×</button>}
    </div>;
}
export function TaskAttachments({files,onChange,disabled,taskId,onDownload,onReading}) {
    const [error,setError]=useState('');
    useEffect(()=>{if(!error)return;const timer=setTimeout(()=>setError(''),4000);return ()=>clearTimeout(timer);},[error]);
    const read=async e=>{
        const selected=Array.from(e.target.files || []);e.target.value='';setError('');
        if(!selected.length)return;
        if(files.length+selected.length>5 || selected.some(f=>f.size===0 || f.size>2*1024*1024) || [...files,...selected].reduce((n,f)=>n+f.size,0)>6*1024*1024){setError('Up to 5 files, 2 MB each and 6 MB total. Empty files are not supported.');return;}
        onReading(true);
        try {
            const added=await Promise.all(selected.map(file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(new Error('File could not be read. Please select it again.'));r.onload=()=>resolve({name:file.name,size:file.size,data:String(r.result).split(',')[1]});r.readAsDataURL(file);})));onChange([...files,...added]);
        }catch(err){setError(err.message);}finally{onReading(false);}
    };
    return <div className={files.length ? "task-inline-attachments" : undefined}><input id="task-files" type="file" multiple hidden style={{display:"none"}} disabled={disabled} onChange={read} aria-label="Attach files"/>{files.length>0 && <div className="task-attachment-previews" aria-label="Attachment previews">{files.map((file,i)=><AttachmentPreview key={file.id||`${i}-${file.name}`} file={file} taskId={taskId} onDownload={onDownload} onRemove={disabled?undefined:()=>onChange(files.filter((_,index)=>index!==i))}/>)}</div>}{error && <div role="alert" className="task-upload-notice"><span>{error}</span><button type="button" aria-label="Dismiss upload notice" onClick={()=>setError('')}>×</button></div>}</div>;
}

