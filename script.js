const axios = require('axios');
const express = require('express');
const cors = require('cors');
const path = require('path');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Global variables for sharing
let activeSharing = {};

// API endpoint to get token
app.post('/api/get-token', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }
    
    const response = await axios.get(`https://devatools69.vercel.app/getter?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
    
    if (response.data && response.data.status && response.data.data.access_token_eaad6v7) {
      return res.json({ 
        success: true, 
        token: response.data.data.access_token_eaad6v7 
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        message: response.data.message || 'Failed to retrieve token' 
      });
    }
  } catch (error) {
    console.error('Error getting token:', error.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// API endpoint to share posts
app.post('/api/share', async (req, res) => {
  const { token, url, count, interval } = req.body;
  
  if (!token || !url || !count || !interval) {
    return res.status(400).json({ success: false, message: 'Missing required parameters' });
  }
  
  // Generate a unique session ID
  const sessionId = Date.now().toString();
  
  // Initialize sharing session
  activeSharing[sessionId] = {
    token,
    url,
    targetCount: parseInt(count),
    interval: parseInt(interval),
    sharedCount: 0,
    timer: null,
    status: 'starting',
    logs: []
  };
  
  // Start sharing
  startSharing(sessionId);
  
  return res.json({ 
    success: true, 
    sessionId,
    message: `Started sharing session with ID: ${sessionId}`
  });
});

// API endpoint to stop sharing
app.post('/api/stop-sharing', (req, res) => {
  const { sessionId } = req.body;
  
  if (!sessionId || !activeSharing[sessionId]) {
    return res.status(400).json({ success: false, message: 'Invalid session ID' });
  }
  
  stopSharing(sessionId);
  
  return res.json({ 
    success: true, 
    message: 'Sharing stopped' 
  });
});

// API endpoint to get sharing status
app.get('/api/status/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessionId || !activeSharing[sessionId]) {
    return res.status(400).json({ success: false, message: 'Invalid session ID' });
  }
  
  const session = activeSharing[sessionId];
  
  return res.json({
    success: true,
    status: session.status,
    sharedCount: session.sharedCount,
    targetCount: session.targetCount,
    logs: session.logs
  });
});

// Function to start sharing
function startSharing(sessionId) {
  const session = activeSharing[sessionId];
  
  if (!session) return;
  
  session.status = 'active';
  addLog(sessionId, `Starting to share ${session.targetCount} posts with interval ${session.interval}ms`);
  
  // Function to share a single post
  async function sharePost() {
    try {
      addLog(sessionId, `Sharing post ${session.sharedCount + 1}/${session.targetCount}...`);
      
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/me/feed`,
        {
          link: session.url,
          privacy: { value: 'SELF' },
          no_story: true,
          access_token: session.token
        },
        {
          headers: {
            authority: 'graph.facebook.com',
            'cache-control': 'max-age=0',
            'sec-ch-ua-mobile': '?0',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36',
          }
        }
      );
      
      session.sharedCount++;
      const postId = response?.data?.id;
      
      addLog(sessionId, `Post shared: ${session.sharedCount}/${session.targetCount} - ID: ${postId || 'Unknown'}`, 'success');
      
      if (session.sharedCount >= session.targetCount) {
        stopSharing(sessionId);
        addLog(sessionId, 'Finished sharing all posts!', 'success');
        
        if (postId) {
          setTimeout(() => {
            deletePost(sessionId, postId);
          }, 60 * 60 * 1000); // Delete after 1 hour
        }
      }
    } catch (error) {
      addLog(sessionId, `Failed to share post: ${error.response?.data?.error?.message || error.message}`, 'error');
    }
  }
  
  // Start the interval
  session.timer = setInterval(sharePost, session.interval);
}

// Function to stop sharing
function stopSharing(sessionId) {
  const session = activeSharing[sessionId];
  
  if (!session) return;
  
  if (session.timer) {
    clearInterval(session.timer);
    session.timer = null;
  }
  
  session.status = 'stopped';
  addLog(sessionId, 'Sharing stopped');
}

// Function to delete a post
async function deletePost(sessionId, postId) {
  try {
    const session = activeSharing[sessionId];
    if (!session) return;
    
    await axios.delete(`https://graph.facebook.com/${postId}?access_token=${session.token}`);
    addLog(sessionId, `Post deleted: ${postId}`, 'success');
  } catch (error) {
    addLog(sessionId, `Failed to delete post: ${error.response?.data?.error?.message || error.message}`, 'error');
  }
}

// Function to add a log
function addLog(sessionId, message, type = 'normal') {
  const session = activeSharing[sessionId];
  if (!session) return;
  
  const log = {
    time: new Date().toISOString(),
    message,
    type,
    processed: false // for stat tracking
  };
  
  session.logs.push(log);
  
  // Keep only the last 100 logs
  if (session.logs.length > 100) {
    session.logs.shift();
  }
  
  console.log(`[Session ${sessionId}] ${message}`);
}

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 