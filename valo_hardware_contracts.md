# VALO Donanım İletişim Sözleşmeleri (JSON Payloads)

Sistemdeki donanımları dinleyen Daemon servisleri, elde ettikleri veriyi aşağıdaki kesin JSON formatlarına dönüştürerek ana sunucuya iletmek zorundadır.

## 1. Para Sayma Makinesi (Fitness Sorter) Sözleşmesi
Bir sayım işlemi tamamlandığında, makinenin RS232/TCP portundan gelen ham veri çözümlenip aşağıdaki formatta WebSocket üzerinden iletilir.

```json
{
  "event_type": "HARDWARE_COUNT_COMPLETED",
  "device_id": "FITNESS_SORTER_01",
  "timestamp": "2026-04-21T10:41:17Z",
  "summary": {
    "currency": "USD",
    "total_amount": 1050000, 
    "total_notes": 106,
    "authenticity_status": "PASSED"
  },
  "denominations": [
    { "value": 100, "count": 104 },
    { "value": 50, "count": 2 }
  ],
  "serials": [
    { "serial": "LB45678901D", "denomination": 100, "condition": "FIT" },
    { "serial": "LB45678902D", "denomination": 100, "condition": "FIT" },
    { "serial": "PG98765432A", "denomination": 50, "condition": "UNFIT" }
  ]
}