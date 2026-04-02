console.log('Node version:', process.version);
console.log('Electron version in process.versions:', process.versions.electron);
console.log('Chrome version in process.versions:', process.versions.chrome);

const electron = require('electron');
console.log('Type of electron required:', typeof electron);
if (typeof electron === 'string') {
    console.log('Electron required is a string path:', electron);
}

// In some versions of Node/Electron, you can't have a node_modules/electron 
// if you want the built-in one. Let's try to delete the required module from cache
// and try again with a trick? No.

// Try to access the built-in module if it's a different name? No.

process.exit(0);
