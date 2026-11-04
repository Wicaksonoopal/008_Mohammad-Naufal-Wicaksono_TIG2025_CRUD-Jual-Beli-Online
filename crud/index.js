const express = require('express');
const path = require('path');
const db = require('./database');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Cek stok produk
function dataTidakValid(p) {
  return !p.nama_produk ||
    p.harga === undefined || p.harga === '' || p.harga < 0 ||
    p.stok === undefined || p.stok === '' || p.stok < 0;
}

// crud produk: GET, POST, PUT, DELETE

app.get('/api/produk', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM produk');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ pesan: 'Gagal memuat data' });
  }
});

app.post('/api/produk', async (req, res) => {
  const { kode_produk, nama_produk, harga, stok } = req.body;
  if (!kode_produk || dataTidakValid(req.body)) {
    return res.status(400).json({ pesan: 'Isi semua kolom dengan benar' });
  }
  try {
    await db.execute(
      'INSERT INTO produk (kode_produk, nama_produk, harga, stok) VALUES (?, ?, ?, ?)',
      [kode_produk, nama_produk, harga, stok]
    );
    res.status(201).json({ pesan: 'Simpan data berhasil' });
  } catch (err) {
    res.status(400).json({ pesan: 'Kode produk telah terpakai' });
  }
});

app.put('/api/produk/:kode', async (req, res) => {
  const { nama_produk, harga, stok } = req.body;
  if (dataTidakValid(req.body)) {
    return res.status(400).json({ pesan: 'Isi semua kolom dengan benar' });
  }
  try {
    const [hasil] = await db.execute(
      'UPDATE produk SET nama_produk = ?, harga = ?, stok = ? WHERE kode_produk = ?',
      [nama_produk, harga, stok, req.params.kode]
    );
    if (!hasil.affectedRows) {
      return res.status(404).json({ pesan: 'Produk tidak ditemukan' });
    }
    res.json({ pesan: 'Pembaruan data berhasil' });
  } catch (err) {
    res.status(500).json({ pesan: 'Gagal memperbarui data' });
  }
});

app.delete('/api/produk/:kode', async (req, res) => {
  try {
    const [hasil] = await db.execute(
      'DELETE FROM produk WHERE kode_produk = ?', [req.params.kode]
    );
    if (!hasil.affectedRows) {
      return res.status(404).json({ pesan: 'Produk tidak ditemukan' });
    }
    res.json({ pesan: 'Penghapusan data berhasil' });
  } catch (err) {
    res.status(500).json({ pesan: 'Gagal menghapus data' });
  }
});

// produk berkurang saat pembelian

app.post('/api/beli', async (req, res) => {
  const { kode_produk, jumlah } = req.body;
  if (!kode_produk || !(jumlah >= 1)) {
    return res.status(400).json({ pesan: 'Jumlah beli minimal 1' });
  }
  try {
    const [hasil] = await db.execute(
      'UPDATE produk SET stok = stok - ? WHERE kode_produk = ? AND stok >= ?',
      [jumlah, kode_produk, jumlah]
    );
    const [rows] = await db.execute(
      'SELECT * FROM produk WHERE kode_produk = ?', [kode_produk]
    );
    if (rows.length === 0) {
      return res.status(404).json({ pesan: 'Produk tidak ditemukan' });
    }
    const p = rows[0];

    if (!hasil.affectedRows) {
      return res.status(400).json({
        pesan: 'Stok ' + p.nama_produk + ' tidak mencukupi (sisa stok adalah ' + p.stok + ')'
      });
    }
    res.json({
      pesan: 'Pembelian ' + jumlah + ' ' + p.nama_produk + ' berhasil dilakukan' +
        ', Total: Rp ' + (p.harga * jumlah) + '. Sisa stok: ' + p.stok
    });
  } catch (err) {
    res.status(500).json({ pesan: 'Gagal memproses transaksi' });
  }
});

app.listen(3000, () => console.log('http://localhost:3000'));