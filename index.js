const express = require('express');
const { nanoid } = require('nanoid');
const MongoClient = require('mongodb').MongoClient;

const app = express();


const mongoURL = 'mongodb://localhost:27017';
const dbName = 'url_shortener';
let db;


app.use(express.json());


async function connectToDB() {
  const client = new MongoClient(mongoURL);
  await client.connect();
  db = client.db(dbName);
}

function generateShortAlias() {
  const prefix = 'www.ppa.in/';
  const shortAlias = prefix + nanoid(22); 
  return shortAlias;
}

async function shortenUrl(req, res) {
  const destinationUrl = req.body.destinationUrl;
  if (!destinationUrl) {
    return res.status(400).json({ error: 'Destination URL is required' });
  }

  const shortUrl = generateShortAlias();


  const urlMapping = { shortUrl, destinationUrl, createdAt: new Date() };
  await db.collection('urls').insertOne(urlMapping);

  return res.status(200).json({ shortUrl });
}


async function updateShortUrl(req, res) {
  const shortUrl = req.body.shortUrl;
  const newDestinationUrl = req.body.newDestinationUrl;
  if (!shortUrl || !newDestinationUrl) {
    return res.status(400).json({ error: 'Short URL and new destination URL are required' });
  }

  const result = await db.collection('urls').updateOne(
    { shortUrl },
    { $set: { destinationUrl: newDestinationUrl } }
  );

  if (result.modifiedCount === 1) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(404).json({ error: 'Short URL not found' });
  }
}


async function getDestinationUrl(req, res) {
  const shortUrl = req.params.shortUrl;

  const urlMapping = await db.collection('urls').findOne({ shortUrl });

  if (urlMapping) {
    return res.redirect(urlMapping.destinationUrl);
  } else {
    return res.status(404).json({ error: 'Short URL not found' });
  }
}


async function updateExpiry(req, res) {
  const shortUrl = req.body.shortUrl;
  const daysToAdd = req.body.daysToAdd;

 
  const result = await db.collection('urls').updateOne(
    { shortUrl },
    { $set: { expiryDate: new Date(Date.now() + daysToAdd * 86400000) } }
  );

  if (result.modifiedCount === 1) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(404).json({ error: 'Short URL not found' });
  }
}


app.post('/shorten', shortenUrl);
app.put('/update', updateShortUrl);
app.get('/:shortUrl', getDestinationUrl);
app.put('/updateexpiry', updateExpiry);


const port = 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});


connectToDB().then(() => {
  console.log('Connected to MongoDB');
});
