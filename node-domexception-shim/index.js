// Native DOMException shim for Node.js 18+
// Replaces the deprecated node-domexception npm package
module.exports = globalThis.DOMException;
