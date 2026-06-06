22:14:50 [vite] (client) hmr update /src/styles.css?direct
22:14:50 [vite] (ssr) page reload src/lib/fonio/backend/store.server.ts
[vite] program reload
[Supabase] Initializing with: {
  url: 'https://uorswcrvepxmkmyjzayg.s...',
  authMode: '✅ service-role'
}
[BOOKING] 👤 Manual booking: bypassing wave validation (receptionist override)
[BOOKING] 📝 Creating booking record for Hans Keller on slot ac15c3eb-1f9a-4b30-9b24-80bd01db6dd0
[BOOKING] ✓ Booking created. Now updating waitlist & call attempts...
[BOOKING] 📋 Updating waitlist entry 50fc27eb-3c52-4934-9873-b320f1dadddc for patient d9ed9df9-dfe1-47da-b3d8-4eda73d66945
[Router] Error: {
  path: '/api/bookings/attempt',
  method: 'POST',
  error: 'state is not defined',
  stack: 'ReferenceError: state is not defined\n' +
    '    at attemptBooking (C:\\Users\\alexl\\Desktop\\Hackatons\\OpenSlot-AI\\src\\lib\\fonio\\backend\\store.server.ts:569:29)\n' +
    '    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n' +
    '    at async handleFonioApiRequest (C:\\Users\\alexl\\Desktop\\Hackatons\\OpenSlot-AI\\src\\lib\\fonio\\backend\\router.server.ts:143:19)\n' +
    '    at async Object.fetch (C:\\Users\\alexl\\Desktop\\Hackatons\\OpenSlot-AI\\src\\server.ts:44:27)\n' +
    '    at async file:///C:/Users/alexl/Desktop/Hackatons/OpenSlot-AI/node_modules/@tanstack/start-plugin-core/dist/esm/vite/dev-server-plugin/plugin.js:79:36'
}