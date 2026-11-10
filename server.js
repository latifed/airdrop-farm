const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'projects.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// Helper: Read projects
function readProjects() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading projects:', err);
    return [];
  }
}

// Helper: Write projects
function writeProjects(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing projects:', err);
    return false;
  }
}

// API: Get all projects
app.get('/api/projects', (req, res) => {
  const projects = readProjects();
  res.json(projects);
});

// API: Get single project
app.get('/api/projects/:id', (req, res) => {
  const projects = readProjects();
  const project = projects.find(p => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(project);
});

// API: Create new project
app.post('/api/projects', (req, res) => {
  const { name, symbol, category, status, riskTier, summary, content, website, appUrl, twitter, funding, founders, backers, logo } = req.body;
  if (!name || !symbol) {
    return res.status(400).json({ error: 'Name and symbol are required.' });
  }

  const projects = readProjects();
  const id = req.body.id || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `proj-${Date.now()}`;

  if (projects.some(p => p.id === id)) {
    return res.status(409).json({ error: 'Project with this ID/Name already exists.' });
  }

  const newProject = {
    id,
    name: name.trim(),
    symbol: symbol.trim().toUpperCase(),
    logo: logo || '',
    website: website || '',
    appUrl: appUrl || '',
    twitter: twitter || '',
    category: category || 'DeFi / Airdrop',
    status: status || 'Aktif Puan Kasma',
    riskTier: riskTier || 'Orta Risk',
    funding: funding || 'Bilinmiyor',
    founders: founders || '',
    backers: backers || '',
    summary: summary || '',
    content: content || 'Detaylı analiz henüz eklenmedi.'
  };

  projects.push(newProject);
  writeProjects(projects);
  res.status(201).json(newProject);
});

// API: Update project
app.put('/api/projects/:id', (req, res) => {
  const projects = readProjects();
  const index = projects.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const current = projects[index];
  const updated = {
    ...current,
    ...req.body,
    id: current.id // keep original ID
  };

  projects[index] = updated;
  writeProjects(projects);
  res.json(updated);
});

// API: Delete project
app.delete('/api/projects/:id', (req, res) => {
  let projects = readProjects();
  const initialLength = projects.length;
  projects = projects.filter(p => p.id !== req.params.id);

  if (projects.length === initialLength) {
    return res.status(404).json({ error: 'Project not found' });
  }

  writeProjects(projects);
  res.json({ success: true, message: 'Project removed successfully.' });
});

// Fallback to index.html for SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Airdrop Farm Server running at http://localhost:${PORT}`);
});
