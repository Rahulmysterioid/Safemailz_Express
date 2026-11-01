const MailComposer = require('nodemailer/lib/mail-composer');
function normalizeAttachments(input = []) {
    if (!Array.isArray(input) || input.length > 10) throw new Error('Attach up to 10 files.');
    let total = 0;
    return input.map(file => {
        if (!file || typeof file.content !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.content)) throw new Error('Invalid attachment content.');
        const content = Buffer.from(file.content, 'base64');
        total += content.length;
        if (!content.length || content.length > 2*1024*1024 || total > 6*1024*1024) throw new Error('Attachments must be non-empty, up to 2 MB each and 6 MB total.');
        const filename = String(file.filename || 'attachment').split(/[\\/]/).pop().replace(/[\r\n\x00-\x1f]/g, '').slice(0,255) || 'attachment';
        const contentType = /^[\w.+-]+\/[\w.+-]+$/.test(file.contentType || '') ? file.contentType : 'application/octet-stream';
        return {filename, contentType, content};
    });
}
async function buildRawMessage(options) {
    const message = new MailComposer({...options,headers:{...options.headers,Importance:options.priority || 'normal'}}).compile();
    message.keepBcc = true;
    return new Promise((resolve,reject)=>message.build((err,buffer)=>err?reject(err):resolve(buffer.toString('base64url'))));
}
module.exports = {normalizeAttachments, buildRawMessage};
