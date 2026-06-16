const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// Canlı sunucu (Render) portu otomatik ayarlar, yoksa yerelde 3000 açılır
const PORT = process.env.PORT || 3000;

// MongoDB Atlas Bağlantı Linki
const MONGO_URI = "mongodb+srv://dronurgogebakan_db_user:5120288@cluster0.xnaohye.mongodb.net/seyrusefa?retryWrites=true&w=majority&appName=Cluster0";

// MongoDB Atlas Bulut Bağlantısı
mongoose.connect(MONGO_URI)
    .then(() => console.log("☁️ MongoDB Atlas Bulut Veritabanı Bağlantısı Başarılı!"))
    .catch(err => console.error("❌ Veritabanı bağlantı hatası:", err));

// 🚜 MONGODB İÇİN VERİ MODELİ (ŞEMA) TANIMLAMASI
const ReportSchema = new mongoose.Schema({
    title: String,
    summary: String,
    lat: Number,
    lng: Number,
    expiresAt: Number,
    downvotes: { type: Number, default: 0 }
});

// Veritabanı modeli oluşturuluyor (Koleksiyon adı otomatik 'reports' olur)
const Report = mongoose.model('Report', ReportSchema);

// 🔍 Aktif ve süresi dolmamış çalışmaları listele
app.get('/api/reports', async (req, res) => {
    try {
        const now = Date.now();
        // Süresi geçmemiş VE 3'ten az şikayet almış olanları filtrele
        const reports = await Report.find({
            expiresAt: { $gt: now },
            downvotes: { $lt: 3 }
        });
        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🚀 Yeni Bildirim Ekleme
app.post('/api/reports', async (req, res) => {
    try {
        const { title, summary, lat, lng } = req.body;
        const expiresAt = Date.now() + 12 * 60 * 60 * 1000; // 12 saat ömür

        const newReport = new Report({
            title,
            summary,
            lat,
            lng,
            expiresAt,
            downvotes: 0
        });

        await newReport.save();
        res.status(201).json(newReport);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 👍 "Hâlâ Burada" (Doğrula)
app.post('/api/reports/:id/still-there', async (req, res) => {
    try {
        const id = req.params.id;
        const report = await Report.findById(id);

        if (!report) return res.status(404).json({ message: "Çalışma bulunamadı." });

        const maxExpiration = Date.now() + 24 * 60 * 60 * 1000; // Maksimum 24 saat uzayabilir
        const newExpiresAt = Math.min(report.expiresAt + 2 * 60 * 60 * 1000, maxExpiration);

        report.expiresAt = newExpiresAt;
        await report.save();

        res.json({ message: "Süre uzatıldı!", expiresAt: newExpiresAt });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 👎 "Çalışma Bitmiş" (Şikayet/Bitirme)
app.post('/api/reports/:id/finished', async (req, res) => {
    try {
        const id = req.params.id;
        const report = await Report.findById(id);

        if (!report) return res.status(404).json({ message: "Çalışma bulunamadı." });

        report.downvotes += 1;
        report.expiresAt -= 4 * 60 * 60 * 1000; // Süresinden 4 saat düşür

        await report.save();
        res.json({ message: "Geri bildirim alındı.", downvotes: report.downvotes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda aktif.`));