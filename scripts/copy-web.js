#!/usr/bin/env node
// Copy the web sources into www/ for Capacitor to bundle.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'index.html');
const dstDir = path.join(root, 'www');
const dst = path.join(dstDir, 'index.html');

if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });
fs.copyFileSync(src, dst);
console.log('✓ Copied index.html -> www/index.html');
