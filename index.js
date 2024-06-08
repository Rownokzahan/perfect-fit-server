const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { ObjectId } = require("mongodb");
const app = express();
require("dotenv").config();
const port = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jxgrj34.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

client.connect();

client.db("admin").command({ ping: 1 });
console.log("Pinged your deployment. You successfully connected to MongoDB!");

const dresses = client.db("perfectFitDB").collection("dresses");
const users = client.db("perfectFitDB").collection("users");
const carts = client.db("perfectFitDB").collection("carts");
const orders = client.db("perfectFitDB").collection("orders");

// Endpoint to get all dresses
app.get("/dresses", async (req, res) => {
  const result = await dresses.find().toArray();
  res.send(result);
});

// Endpoint to get a specific dress by ID
app.get("/dresses/:id", async (req, res) => {
  const dressId = req.params.id;

  // Check if the ID is a valid ObjectId
  if (!ObjectId.isValid(dressId)) {
    return res.status(400).send({ error: "Invalid dress ID" });
  }

  const result = await dresses.findOne({ _id: new ObjectId(dressId) });
  return res.send(result);
});

// Endpoint to add a new dress
app.post("/dresses", async (req, res) => {
  const newDress = req.body;
  newDress.created_at = new Date();
  const result = await dresses.insertOne(newDress);
  return res.send(result);
});

// Endpoint to update a dress by ID
app.put("/dresses/:id", async (req, res) => {
  const dressId = req.params.id;
  const updatedDress = req.body;
  const result = await dresses.updateOne(
    { _id: new ObjectId(dressId) },
    { $set: { ...updatedDress } }
  );
  return res.send(result);
});

// Endpoint to delete a dress by ID
app.delete("/dresses/:id", async (req, res) => {
  const dressId = req.params.id;
  const result = await dresses.deleteOne({ _id: new ObjectId(dressId) });
  res.send(result);
});

// Endpoint to create a new user
app.post("/users", async (req, res) => {
  const newUser = req.body;
  const alreadyExists = await users.findOne({ _id: newUser._id });
  if (alreadyExists) {
    return res.send(alreadyExists);
  }
  const result = await users.insertOne(newUser);
  return res.send(result);
});

// Endpoint to get a user's cart
app.get("/carts/:userId", async (req, res) => {
  const { userId } = req.params;
  const result = await carts.findOne({ userId });
  if (result) {
    result.items.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }

  return res.send(result);
});

// Endpoint to add an item to a user's cart
app.post("/carts/:userId/items", async (req, res) => {
  const { userId } = req.params;
  const item = req.body;
  const newItem = { _id: new ObjectId(), ...item, created_at: new Date() };

  // Check if the user's cart exists
  const existingCart = await carts.findOne({ userId });

  if (!existingCart) {
    // If the cart doesn't exist, create a new cart for the user
    const result = await carts.insertOne({
      userId,
      items: [newItem],
    });
    res.send(result);
  } else {
    // If the cart exists, add the item to the existing cart
    const result = await carts.updateOne(
      { userId },
      { $push: { items: newItem } }
    );
    res.send(result);
  }
});

// Endpoint to remove an item from a user's cart
app.delete("/carts/:userId/items/:itemId", async (req, res) => {
  const { userId, itemId } = req.params;

  const result = await carts.updateOne(
    { userId }, // Filter to identify the cart by userId
    { $pull: { items: { _id: new ObjectId(itemId) } } } // Remove the item with the specified itemId
  );

  res.send(result);
});

// Endpoint to clear the entire user's cart
app.delete("/carts/:userId/clear", async (req, res) => {
  const { userId } = req.params;
  const result = await carts.deleteOne({ userId });
  res.send(result);
});

// Endpoint to get a user orders
app.get("/orders/:userId/order", async (req, res) => {
  const { userId } = req.params;
  const result = await orders.findOne({ userId });
  if (result) {
    result.orders.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }

  return res.send(result);
});

// Endpoint to add an order for a user
app.post("/orders/:userId/order", async (req, res) => {
  const { userId } = req.params;
  const order = req.body;
  const newOrder = { _id: new ObjectId(), ...order, created_at: new Date() };

  // Check if the user already has an existing order
  const existingOrder = await orders.findOne({ userId });

  if (!existingOrder) {
    // If the order doesn't exist, create a new order for the user
    const result = await orders.insertOne({
      userId,
      orders: [newOrder],
    });
    res.send(result);
  } else {
    // If the order exists, add the new order to the existing orders
    const result = await orders.updateOne(
      { userId },
      { $push: { orders: newOrder } }
    );
    res.send(result);
  }
});

// Default route
app.get("/", (req, res) => {
  res.send("Perfect Fit server is running");
});

// Start the server
app.listen(port, () => {
  console.log(`Perfect Fit server is running on port: ${port}`);
});
