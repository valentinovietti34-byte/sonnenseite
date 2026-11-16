// Maps the app's forecast request URLs to responses saved on disk (the public API rate-limits shared cloud IPs).
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const DIR = process.env.SS_FIXTURES || path.join(__dirname, '.fixtures');   // optional saved responses, keyed by sha1 of the request URL
exports.lookup = (url) => { const p = path.join(DIR, crypto.createHash('sha1').update(url).digest('hex')); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; };
