(async () => {
    try {
        const electron = await import('electron');
        console.log('App in dynamic import:', electron.app ? 'Defined' : 'Undefined');
        if (electron.app) {
            console.log('Dynamic import worked!');
            process.exit(0);
        }
    } catch (e) {
        console.log('Dynamic import failed:', e.message);
    }
    process.exit(1);
})();
