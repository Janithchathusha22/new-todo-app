const express = require('express');
const app = express();
const { Pool } = require('pg');
const cors = require('cors');

// Add CORS middleware
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database configuration with explicit host settings
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'tasks',
  port: process.env.DB_PORT || 5432,
  host: process.env.DB_HOST || '127.0.0.1', // Using explicit IP instead of localhost
  
  max: 20, 
  idleTimeoutMillis: 30000, 
  connectionTimeoutMillis: 2000, 
};

const pool = new Pool(dbConfig);

// Enhanced connection testing
const testConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log('Successfully connected to database');
    return true;
  } catch (err) {
    console.error('Database connection error details:', {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database,
      error: err.message
    });
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Initialize database with better error handling
async function initializeDatabase() {
  try {
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Unable to establish database connection');
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization failed:', err);
    throw err;
  }
}

// Graceful shutdown handling
process.on('exit', () => {
  pool.end();
});

// Initialize database and start server
initializeDatabase()
  .then(() => {
    const port = process.env.PORT || 8080;
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${port}`);
    });
  })
  .catch(err => {
    console.error('Server failed to start:', err);
    process.exit(1);
  });

// Routes
app.get('/', (req, res) => {
  res.send('Database ready!');
});

app.patch('/tasks/:id', async (req, res) => {
    try {
      const taskId = req.params.id;
      const updates = req.body;
  
      // Validate updates
      const allowedColumns = ['title', 'description', 'completed'];
      const updatesKeys = Object.keys(updates);
      const invalidKeys = updatesKeys.filter(key => !allowedColumns.includes(key));
      if (invalidKeys.length > 0) {
        return res.status(400).json({ error: `Invalid fields: ${invalidKeys.join(', ')}` });
      }
      if (updatesKeys.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
  
      // Build safe query
      const setClause = updatesKeys
        .map((key, index) => `${key} = $${index + 1}`)
        .join(', ');
      const values = updatesKeys.map(key => updates[key]);
      values.push(taskId);
  
      const query = {
        text: `UPDATE tasks SET ${setClause} WHERE id = $${values.length} RETURNING *`,
        values: values,
      };
  
      const result = await pool.query(query);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Update failed' });
    }
  });

app.post('/tasks', async (req, res) => {
  try {
    const { title, description } = req.body;
    await pool.query(
      'INSERT INTO tasks (title, description) VALUES ($1, $2)',
      [title, description]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Insert failed' });
  }
});

app.get('/tasks', async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT * FROM tasks WHERE completed = false ORDER BY created_at DESC LIMIT 5'
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Query failed' });
    }
  });

  // Mark task as completed
  app.patch('/tasks/:id/complete', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Update the task to completed
        const result = await pool.query(
            'UPDATE tasks SET completed = true WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Task not found' 
            });
        }

        // Return success response
        res.json({ 
            success: true, 
            message: 'Task completed successfully',
            task: result.rows[0]
        });
    } catch (err) {
        console.error('Error completing task:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to complete task' 
        });
    }
});