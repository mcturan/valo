import { config } from '../config/env.js';

export async function analyzeRiskWithAI(volume: number, customerName: string) {
  try {
    const prompt = `VALO RISK ENGINE ANALYSIS: 
    Customer: ${customerName}
    30-Day USD Volume: ${volume}
    Task: Identify potential 'smurfing' or high-risk financial patterns.
    Rules: If volume > 10000 high risk. If > 5000 medium risk.
    Response: JSON format ONLY: { "risk_level": "LOW|MEDIUM|HIGH|CRITICAL", "reason": "brief reason" }`;

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      body: JSON.stringify({ model: 'llama3', prompt, stream: false }),
    });
    
    if (!response.ok) throw new Error('Ollama offline');
    const data: any = await response.json();
    return JSON.parse(data.response);
  } catch (e) {
    // Fallback if AI is offline
    let risk_level = 'LOW';
    if (volume > 10000) risk_level = 'CRITICAL';
    else if (volume > 5000) risk_level = 'MEDIUM';
    return { risk_level, reason: 'AI Engine Offline - Standard Rule Applied' };
  }
}
