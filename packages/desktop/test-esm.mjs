import { app } from 'electron';
console.log('App in ESM:', app ? 'Defined' : 'Undefined');
if (app) {
    console.log('Electron Version:', process.versions.electron);
    process.exit(0);
} else {
    process.exit(1);
}
