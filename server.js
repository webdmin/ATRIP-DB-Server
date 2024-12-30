// Import required packages
const express = require('express');
const { BlobServiceClient } = require('@azure/storage-blob');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');  // Assuming you have this file
const User = require('./models/User');  // Assuming you have this model

// Load environment variables from .env
dotenv.config();

// Initialize app
const app = express();

// Set up CORS
app.use(cors({
  origin: [
    'http://localhost:3000',  // Local frontend
    'https://atrip-b2ddcgdpefevc7am.centralindia-01.azurewebsites.net/', // Deployed frontend
  ],
  methods: ['GET', 'POST'],
}));

// Middleware
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('Error connecting to MongoDB:', err));

// Azure Blob Storage connection setup
const account = 'ukdatasets';  // Replace with your Azure Storage account name
const accessKey = 'RbyXMRKfGqztZ4i9Y6kCgQW0FxtxfBvo10stsLemf7L3H0y1oOEn+fppnQk7+rINqX/7ApgCdVG8+ASt4+BHgw==';  // Replace with your Azure access key
const connectionString = `DefaultEndpointsProtocol=https;AccountName=${account};AccountKey=${accessKey};EndpointSuffix=core.windows.net`;
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

// Utility function to convert stream to string
async function streamToString(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => {
      chunks.push(data.toString());
    });
    readableStream.on('end', () => {
      resolve(chunks.join(''));
    });
    readableStream.on('error', reject);
  });
}

// Blob Storage Routes
const blobRouter = express.Router();

blobRouter.get('/containers', async (req, res) => {
  try {
    const containers = [];
    for await (const container of blobServiceClient.listContainers()) {
      containers.push(container.name);
    }
    res.json(containers);
  } catch (error) {
    console.error('Error fetching containers:', error);
    res.status(500).send(error.message);
  }
});

blobRouter.get('/containers/:containerName/files', async (req, res) => {
  try {
    const { containerName } = req.params;
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobs = [];
    for await (const blob of containerClient.listBlobsFlat()) {
      blobs.push(blob.name);
    }
    res.json(blobs);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).send(error.message);
  }
});

blobRouter.get('/containers/:containerName/blobs/:blobName', async (req, res) => {
  try {
    const { containerName, blobName } = req.params;
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(decodeURIComponent(blobName));

    const downloadBlockBlobResponse = await blobClient.download();
    const downloaded = await streamToString(downloadBlockBlobResponse.readableStreamBody);

    try {
      const jsonData = JSON.parse(downloaded);
      res.json(jsonData);
    } catch (jsonError) {
      console.error('Error parsing GeoJSON:', jsonError);
      res.status(500).send('Invalid JSON format');
    }
  } catch (error) {
    console.error('Error fetching blob:', error);
    res.status(500).send(error.message);
  }
});

// MongoDB Routes (Authentication Routes)
app.use('/api/auth', authRoutes);  // Assuming this file exists and handles authentication

// Example route for fetching all users
app.get('/data', async (req, res) => {
  try {
    const users = await User.find();  // Fetch all users
    res.json(users);  // Return valid data
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Use the blobRouter for blob-related routes
app.use('/api/blobs', blobRouter);  // Prefix blob-related routes with /api/blobs

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
