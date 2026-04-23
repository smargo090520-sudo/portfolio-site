const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: 'postgres',
  password: 'mama152025',
  host: 'localhost',
  port: 5432,
  database: 'portfolio',
});

// ===== СОЗДАНИЕ ТАБЛИЦ =====
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'user'
    );
    
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      content TEXT,
      type VARCHAR(50)
    );
    
    CREATE TABLE IF NOT EXISTS likes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      post_id INTEGER REFERENCES posts(id),
      reaction VARCHAR(20) DEFAULT 'like',
      UNIQUE(user_id, post_id)
    );
    
    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      post_id INTEGER REFERENCES posts(id),
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('Таблицы созданы');
}
initDB();

// ===== ПОЛУЧИТЬ ВСЕ ПОСТЫ =====
app.get('/api/posts', async (req, res) => {
  const result = await pool.query('SELECT * FROM posts');
  res.json(result.rows);
});

// ===== ПОЛУЧИТЬ ЛАЙКИ ПОСТА =====
app.get('/api/posts/:id/likes', async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('SELECT reaction, COUNT(*) FROM likes WHERE post_id = $1 GROUP BY reaction', [id]);
  res.json(result.rows);
});

// ===== ПОСТАВИТЬ ЛАЙК =====
app.post('/api/posts/:id/like', async (req, res) => {
  const { id } = req.params;
  const { user_id, reaction } = req.body;
  
  await pool.query(
    'INSERT INTO likes (user_id, post_id, reaction) VALUES ($1, $2, $3) ON CONFLICT (user_id, post_id) DO UPDATE SET reaction = $3',
    [user_id, id, reaction || 'like']
  );
  res.json({ success: true });
});

// ===== ПОЛУЧИТЬ КОММЕНТАРИИ ПОСТА =====
app.get('/api/posts/:id/comments', async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    'SELECT c.*, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = $1 ORDER BY c.created_at DESC',
    [id]
  );
  res.json(result.rows);
});

// ===== ДОБАВИТЬ КОММЕНТАРИЙ =====
app.post('/api/posts/:id/comment', async (req, res) => {
  const { id } = req.params;
  const { user_id, text } = req.body;
  
  await pool.query(
    'INSERT INTO comments (user_id, post_id, text) VALUES ($1, $2, $3)',
    [user_id, id, text]
  );
  res.json({ success: true });
});

// ===== ЗАГРУЗИТЬ ТЕСТОВЫЕ ДАННЫЕ =====
app.post('/api/seed', async (req, res) => {
  await pool.query("INSERT INTO users (username, password, role) VALUES ('Маргарита', 'mama152025', 'owner') ON CONFLICT DO NOTHING");
  await pool.query("INSERT INTO users (username, password, role) VALUES ('admin1', 'admin123', 'admin') ON CONFLICT DO NOTHING");
  await pool.query("INSERT INTO users (username, password, role) VALUES ('user1', 'user123', 'user') ON CONFLICT DO NOTHING");
  
  const posts = [
    ['Инженер-промптовик высшей категории', 'Составление промптов для нейросетей — это искусство...', 'competence'],
    ['Кино-сваха со стажем', 'Подбор фильма для просмотра — задача не из простых...', 'competence'],
    ['Мастер дедлайн-спринта', 'Выполнение работы в последний момент...', 'competence'],
    ['Амбассадор азиатской культуры', 'Манга, аниме, дорамы, музыка...', 'competence'],
    ['Шеф-повар домашнего формата', 'Готовлю так, что пальчики оближешь...', 'competence'],
    ['Самопровозглашённый мастер ногтевого искусства', 'Домашний маникюр — это отдельный вид медитации...', 'competence'],
    ['Бюрократический навигатор', 'Помогаю разобраться в документах...', 'competence'],
    ['Мастер спорта по пешим прогулкам', 'Пешие прогулки — это недооценённый вид активности...', 'competence'],
    ['Художник широкого профиля и свободных материалов', 'Рисую чем угодно и на чём угодно...', 'competence']
  ];
  
  for (const post of posts) {
    await pool.query('INSERT INTO posts (title, content, type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', post);
  }
  
  res.json({ success: true });
});

app.listen(5000, () => {
  console.log('Сервер запущен на http://localhost:5000');
});