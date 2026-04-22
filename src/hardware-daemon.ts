import { WebSocketServer } from 'ws';
// import { SerialPort } from 'serialport'; // Real hardware communication

export function startHardwareDaemon(port: number = 8080) {
  const wss = new WebSocketServer({ port });

  wss.on('connection', (ws, req) => {
    const token = new URL(req.url || '', `http://${req.headers.host}`).searchParams.get('token');
    if (token !== 'valo-hardware-token-2024') return ws.close(1008, 'Unauthorized');

    console.log('Hardware Daemon: UI Client connected.');

    // --- REAL HARDWARE LISTENER (Placeholder for Physical Connection) ---
    /*
    const port = new SerialPort({ path: '/dev/ttyUSB0', baudRate: 9600 });
    port.on('data', (data) => {
       // Parse real data from Fitness Sorter
       ws.send(JSON.stringify({ event_type: "HARDWARE_COUNT_COMPLETED", data }));
    });
    */

    // FOR TESTING: Better simulation that mimics real serial data stream
    const simulateDevice = () => {
       ws.send(JSON.stringify({
          event_type: "HARDWARE_COUNT_COMPLETED",
          device_id: "FITNESS_SORTER_REAL_PROTOTYPE",
          summary: { currency: "USD", total_amount: 500000, total_notes: 50 }
       }));
    };
    setTimeout(simulateDevice, 3000);
  });
  console.log(`Hardware Daemon on ws://localhost:${port}`);
}
