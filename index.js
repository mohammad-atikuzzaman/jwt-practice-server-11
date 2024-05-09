const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

app.use(cookieParser());

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tyigyp7.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// custom middleware

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log("value of token", token);

  if (!token) {
    return res.status(401).send({ message: "Unauthorized" });
  }

  jwt.verify(token, process.env.SECRET_KEY_TOKEN, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "Unauthorized" });
    }
    // console.log("decoded data from custom middleware3",decoded);
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    //  jwt api

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log(user);

      const token = jwt.sign(user, process.env.SECRET_KEY_TOKEN, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.post("/logout", async(req, res)=>{
      const user = req.body;
      console.log("logging out :", user);
      res.clearCookie("token", {maxAge: 0}).send({message: true})
    })

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    const database = client.db("Jwt-practice");
    const postsCollection = database.collection("postCollection");
    const cartCollection = database.collection("cartCollection");

    app.get("/posts", async (req, res) => {
      const cursor = postsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/carts/:email",verifyToken, async (req, res) => {
      const {email} = req.decoded
      
      const reqEmail = req.params.email

      if(email !== reqEmail){
        return res.status(403).send({message: "Forbidden request"})
      }

      const query = {email: reqEmail}
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/posts", async (req, res) => {
      const data = req.body;
      const setData = {
        ...data,
      };
      const result = await postsCollection.insertOne(setData);
      res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const data = req.body;
      const setData = {
        ...data,
      };
      const result = await cartCollection.insertOne(setData);
      res.send(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("my express server is running");
});

app.listen(port, () => {
  console.log(`app is running on port : ${port}`);
});
