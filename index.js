const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.t7ifjiq.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader  = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}
// hjhj

async function run() {
  try {
    await client.connect();
    const toolCollection = client.db("computerparts").collection("tools");
    //
    const purchaseCollection = client
      .db("computerparts")
      .collection("purchases");
    const userCollection = client.db("computerparts").collection("users");

    app.get("/tool", async (req, res) => {
      const query = {};
      const cursor = await toolCollection.find(query);
      const tools = await cursor.toArray();
      console.log(tools);
      res.send(tools);
    });
    //
    app.get("/user", async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });
    // admin
    //
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user?.role === "admin";
      res.send({ admin: isAdmin });
    });

    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send({ result });
      } else {
        req.status(403).send({ message: "Forbidden" });
      }
    });
    //

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      //
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });
    
    //

    app.get("/ordered", async (req, res) => {
      const tools = await purchaseCollection.find().toArray();
      res.send(tools);
    });

    app.get("/purchase", verifyJWT, async (req, res) => {
      const customer = req.query.customer;
      const decodedEmail = req.decoded.email;
      if (customer === decodedEmail) {
        const query = { customer: customer };
        const purchases = await purchaseCollection.find(query).toArray();
        res.send(purchases);
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
    });
    
    //

    app.post("/purchase", async (req, res) => {
      const purchase = req.body;
      const result = await purchaseCollection.insertOne(purchase);
      res.send(result);
    });
  } finally {
    console.log("database connected");
  }
}

run().catch(console.dir);
//

app.get("/", (req, res) => {
  res.send("Hello ELECTRICAL SPARK");
});

app.listen(port, () => {
  console.log(`Electrical spark app listening on port ${port}`);
});
