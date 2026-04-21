import { WebSocketServer } from 'ws';

export function startHardwareDaemon(port: number = 8080) {
  const wss = new WebSocketServer({ port });

  wss.on('connection', (ws) => {
    console.log(`Hardware Daemon: UI Client connected on port ${port}`);

    ws.on('message', (message) => {
      console.log('Hardware Daemon received:', message.toString());
    });

    // Simulation function to mimic a hardware event (e.g., from a serial port)
    const simulateCount = () => {
      const payload = {
        event_type: "HARDWARE_COUNT_COMPLETED",
        device_id: "FITNESS_SORTER_01",
        timestamp: new Date().toISOString(),
        summary: {
          currency: "USD",
          total_amount: 1050000, 
          total_notes: 106,
          authenticity_status: "PASSED"
        },
        denominations: [
          { value: 100, "count": 104 },
          { value: 50, "count": 2 }
        ],
        serials: [
          { serial: "LB45678901D", denomination: 100, condition: "FIT" },
          { serial: "LB45678902D", denomination: 100, condition: "FIT" },
          { serial: "PG98765432A", denomination: 50, condition: "UNFIT" }
        ]
      };
      
      ws.send(JSON.stringify(payload));
      console.log('Hardware Daemon: Broadcasted HARDWARE_COUNT_COMPLETED');
    };

    // For testing: simulate an event 5 seconds after connection
    setTimeout(simulateCount, 5000);
  });

  console.log(`Hardware Daemon (Mock) started on ws://localhost:${port}`);
}
