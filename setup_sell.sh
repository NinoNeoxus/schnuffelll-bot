#!/bin/bash
echo "Installing dependencies for builder..."
npm install javascript-obfuscator archiver --save-dev

echo ""
echo "Starting Obfuscation Process..."
node build_obfuscated.js
