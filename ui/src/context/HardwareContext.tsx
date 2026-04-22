import React, { createContext, useContext, useEffect, useState } from 'react';

interface HardwareEvent {
  event_type: string;
  device_id: string;
  timestamp: string;
  summary?: any;
  denominations?: any[];
  serials?: any[];
}

interface HardwareContextType {
  lastEvent: HardwareEvent | null;
  isConnected: boolean;
}

const HardwareContext = createContext<HardwareContextType>({ lastEvent: null, isConnected: false });

export const HardwareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lastEvent, setLastEvent] = useState<HardwareEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080');

    socket.onopen = () => {
      console.log('UI: Connected to Hardware Daemon');
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('UI: Hardware Event received:', data);
      setLastEvent(data);
    };

    socket.onclose = () => {
      console.log('UI: Disconnected from Hardware Daemon');
      setIsConnected(false);
    };

    return () => socket.close();
  }, []);

  return (
    <HardwareContext.Provider value={{ lastEvent, isConnected }}>
      {children}
    </HardwareContext.Provider>
  );
};

export const useHardware = () => useContext(HardwareContext);
