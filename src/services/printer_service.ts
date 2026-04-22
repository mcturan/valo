import net from 'net';

export async function printReceipt(ip: string, port: number, content: string) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.connect(port, ip, () => {
      // ESC/POS Command to initialize and print
      const ESC = '\x1B';
      const GS = '\x1D';
      const init = ESC + '@';
      const cut = GS + 'V' + '\x42' + '\x00';
      
      client.write(init + content + '\n\n' + cut);
      client.end();
      resolve(true);
    });
    client.on('error', (err) => {
      console.error('Printer Error:', err);
      reject(err);
    });
  });
}
