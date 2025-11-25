require('dotenv').config();
const express = require('express');
const { nanoid } = require('nanoid');
const { pool, initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Create short URL
app.post('/api/shorten', async (req, res) => {
  const { url } = req.body;
  
  if (!url || !url.match(/^https?:\/\/.+/)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const shortCode = nanoid(6);
    await pool.query(
      'INSERT INTO urls (short_code, original_url) VALUES ($1, $2)',
      [shortCode, url]
    );
    res.json({ shortUrl: `${process.env.BASE_URL}/${shortCode}`, shortCode });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create short URL' });
  }
});

// Get all URLs with stats
app.get('/api/urls', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT short_code, original_url, clicks, created_at FROM urls ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch URLs' });
  }
});

// Delete URL
app.delete('/api/urls/:shortCode', async (req, res) => {
  try {
    await pool.query('DELETE FROM urls WHERE short_code = $1', [req.params.shortCode]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete URL' });
  }
});

// Redirect short URL
app.get('/:shortCode', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE urls SET clicks = clicks + 1 WHERE short_code = $1 RETURNING original_url',
      [req.params.shortCode]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).send('URL not found');
    }
    
    res.redirect(result.rows[0].original_url);
  } catch (error) {
    res.status(500).send('Server error');
  }
});

// Initialize DB
initDB().catch(console.error);

// Start server (only in non-serverless environment)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
