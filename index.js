const express = require("express");
const app = express();
const cors = require("cors");
const admin = require("firebase-admin"); //
require("dotenv").config();
const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT); //

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount), //
});

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xbjvx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.dicodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("BD_Travel_Agency_Portal");
    const productsCollection = database.collection("services");
    const purchaseCollection = database.collection("purcheases");
    const reviewsCollection = database.collection("reviews");
    const usersCollection = database.collection("users");

    // get services data
    app.get("/services", async (req, res) => {
      const cursor = productsCollection.find({});
      const products = await cursor.toArray();
      res.send(products);
    });
    // post service data

    app.post("/services", async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.json(result);
    });
    // get single service

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.json(result);
    });

    // delete single service

    app.delete("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.json(result);
    });

    // // post purchase data
    app.post("/allOrders", async (req, res) => {
      const order = req.body;
      const result = await purchaseCollection.insertOne(order);
      res.send(result);
    });

    // Delete purchase data
    app.delete("/allOrders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await purchaseCollection.deleteOne(query);
      res.json(result);
    });

    // Get purchase data by email
    app.get("/allOrders", async (req, res) => {
      let query = {};
      const email = req.query.email;
      if (email) {
        query = { email: email };
      }
      const cursor = await purchaseCollection.find(query).toArray();
      res.json(cursor);
    });

    // get orders id for database
    app.get("/allOrders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await purchaseCollection.findOne(query);
      res.json(result);
    });

    app.put("/udpate/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          status: "Shipped",
        },
      };
      const result = await purchaseCollection.updateOne(
        filter,
        updatedDoc,
        options
      );

      res.json(result);
    });

    // get review data

    app.get("/review", async (req, res) => {
      const cursor = reviewsCollection.find({});
      const reviews = await cursor.toArray();
      res.send(reviews);
    });

    // post review data

    app.post("/review", async (req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      res.json(result);
    });

    // get user data

    app.get("/users/:email", async (req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        let isAdmin = false;
        if (user?.role === "admin") {
          isAdmin = true;
        }
        res.json({ admin: isAdmin });
      });

    // post user

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.json(result);
    });

    // get user

    app.get("/users", async (req, res) => {
      const cursor = usersCollection.find({});
      const users = await cursor.toArray();
      res.send(users);
    });

    // upsert user

    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });

    //  pament mathod
    app.post("/create-payment-intent", async (req, res) => {
      const paymentInfo = req.body;
      const amount = paymentInfo.price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    });

    // payment status
    app.put("/allOrders/:id", async (req, res) => {
        const id = req.params.id;
        const payment = req.body;
        const filter = { _id: ObjectId(id) };
        const updateDoc = {
          $set: {
            payment: payment,
          },
        };
        const result = await purchaseCollection.updateOne(filter, updateDoc);
        res.json(result);
      });


    // add user admin

    app.put("/users/admin", async (req, res) => {
        const user = req.body;
        const filter = { email: user.email };
        const updateDoc = { $set: { role: "admin" } };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.json(result);
      });

    // app.put("/users/admin", verifyToken, async (req, res) => {
    //   const user = req.body;
    //   console.log(user)
    //   const requester = req.dicodedEmail;
    //   if (requester) {
    //     const requesterAccount = await usersCollection.findOne({
    //       email: requester,
    //     });
    //     if (requesterAccount.role === "admin") {
    //       const filter = { email: user.email };
    //       const updateDoc = { $set: { role: "admin" } };
    //       const result = await usersCollection.updateOne(filter, updateDoc);
    //       res.json(result);
    //     }
    //   } else {
    //     res
    //       .status(403)
    //       .json({ message: "you do not have an access to make admin" });
    //   }
    // });

  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello BD Travel Agency");
});

app.listen(port, () => {
  console.log(` listening at ${port}`);
});
