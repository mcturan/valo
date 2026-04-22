# 🔍 VALO Denetim Bulguları (Obsidian Edition)

## 🚨 Kritik Yapısal Hatalar
1. **Integer Overflow:** `INTEGER` tipi 21 milyon TRY üzerinde çöker. `BIGINT`'e geçilmeli.
2. **Race Condition:** İlk işlem anında çift hesap açma riski.
3. **Secret Leak:** `JWT_SECRET` koda gömülü.
4. **Logic Mismatch:** UI ve Backend para birimi adetleri tutarsız.

## 🛠️ Refaktör Stratejisi
- `src/routes/`: Express rotaları buraya.
- `src/controllers/`: İş mantığı buraya.
- `src/repositories/`: DB sorguları buraya.

## 🔗 Bağlantılar
- [[Refactor_Roadmap]]
- [[Task_Tracker]]
