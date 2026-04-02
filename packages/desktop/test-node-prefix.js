try {
    const electron = require('node:electron');
    console.log('App in node:electron:', electron.app ? 'Defined' : 'Undefined');
    if (electron.app) {
        console.log('Successfully bypassed shadowing using node: prefix!');
        process.exit(0);
    }
} catch (e) {
    console.log('node:electron failed:', e.message);
}
process.exit(1);
