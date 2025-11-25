require('dotenv').config();
const express = require('express');
const { nanoid } = require('nanoid');
const { pool, initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).json({ ok: true, version: '1.0' });
});

// Root route - Dashboard
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Stats page for single code
app.get('/code/:code', (req, res) => {
  res.sendFile(__dirname + '/public/stats.html');
});

// Create short URL (with optional custom code)
app.post('/api/links', async (req, res) => {
  const { url, customCode } = req.body;
  
  // Validate URL
  if (!url || !url.match(/^https?:\/\/.+/)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // Generate or validate custom code
  let shortCode;
  if (customCode) {
    // Validate custom code format [A-Za-z0-9]{6,8}
    if (!customCode.match(/^[A-Za-z0-9]{6,8}$/)) {
      return res.status(400).json({ error: 'Custom code must be 6-8 alphanumeric characters' });
    }
    shortCode = customCode;
  } else {
    shortCode = nanoid(6);
  }

  try {
    await pool.query(
      'INSERT INTO urls (short_code, original_url) VALUES ($1, $2)',
      [shortCode, url]
    );
    res.status(201).json({ 
      shortUrl: `${process.env.BASE_URL}/${shortCode}`, 
      code: shortCode,
      targetUrl: url
    });
  } catch (error) {
    // Check for duplicate code
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Code already exists' });
    }
    res.status(500).json({ error: 'Failed to create short URL' });
  }
});

// Get all URLs with stats
app.get('/api/links', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT short_code as code, original_url as "targetUrl", clicks, last_clicked_at as "lastClickedAt", created_at as "createdAt" FROM urls ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch URLs' });
  }
});

// Get stats for single code
app.get('/api/links/:code', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT short_code as code, original_url as "targetUrl", clicks, last_clicked_at as "lastClickedAt", created_at as "createdAt" FROM urls WHERE short_code = $1',
      [req.params.code]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch link stats' });
  }
});

// Delete URL
app.delete('/api/links/:code', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM urls WHERE short_code = $1 RETURNING *', [req.params.code]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete URL' });
  }
});

// Redirect short URL
app.get('/:code', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE urls SET clicks = clicks + 1, last_clicked_at = CURRENT_TIMESTAMP WHERE short_code = $1 RETURNING original_url',
      [req.params.code]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).send('URL not found');
    }
    
    res.redirect(302, result.rows[0].original_url);
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
