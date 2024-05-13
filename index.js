const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://food-menu-ffbe8.web.app'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());



// console.log(process.env.DB_PASS)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ev60phs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middlewares
const logger = async (req, res, next) => {
  console.log("called", req.host, req.originalUrl);
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Invalid authorization" });
    }
    req.user = decoded;
    next();
  });
};

const cookieOption = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  secure: process.env.NODE_ENV === "production" ? true : false,
};





async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const foodsCollection = client.db('foodDB').collection('foods');
    const requestedCollection = client.db('foodDB').collection('requestedFood');

    // auth related api
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "5h",
      });
      res.cookie("token", token, cookieOption).send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("Logging Out", user);
      res
        .clearCookie("token", { ...cookieOption, maxAge: 0 })
        .send({ success: true });
    });





    
    // app.post('/jwt', async(req, res) =>{
    //   const user = req.body;
    //   console.log(user);
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
    //   res
    //   .cookie('token' , token, {
    //     httpOnly: true,
    //     secure: false,
       
    //   })
    //   .send({success: true})
    // })



    // ***************************************************
    // services related api
    // getting data from server
    app.get('/foods', async (req, res) => {
      const cursor = foodsCollection.find({status:'Available'});
      const result = await cursor.toArray();
      res.send(result);
    })

    // getting data for my list
    app.get('/myList/:email', logger, verifyToken, async (req, res) => {
      console.log(req.params.email);
      // console.log('tok tok token', req.cookies.token)  //here kam ase
      const result = await foodsCollection.find({
        email:
          req.params.email
      }).toArray();
      res.send(result);
    })

    

    // creating data to server
    app.post('/foods', async(req, res) => {
      const newFood = req.body
      console.log(newFood);
      const result = await foodsCollection.insertOne(newFood);
      res.send(result);
    })

    // updating a food
    app.get('/foods/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await foodsCollection.findOne(query);
      res.send(result);
    })


    app.put('/foods/:id' , async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updateFood = req.body;
      const food = {
        $set: {
          foodName: updateFood.foodName,
          quantity: updateFood.quantity,
          date: updateFood.date,
          location: updateFood.location,
          photo: updateFood.photo,
          notes: updateFood.notes,
        }
      }

      const result = await foodsCollection.updateOne(filter, food, options);
      res.send(result)

    })

    // delete food
    app.delete('/foods/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodsCollection.deleteOne(query);
      res.send(result);
    });

    // ******************************************************************

    // add requested food
    app.put("/reqFood/:id", async (req, res) => {
     const id = req.params.id;
     const data = req.body;
     const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const selectedFood = await foodsCollection.findOne(filter );

      const {foodName, photo, quantity, date, location,  notes, email, donatorName, donatorPhoto} = selectedFood;
      const food = { 
        $set: {
          foodName, photo, quantity, date, location,  notes, email, donatorName, donatorPhoto,status:'Requested'
        }
      }

      const updatedStatus = await foodsCollection.updateOne(
        filter,
        food,
        options
      );

      if (updatedStatus.modifiedCount > 0) {
        const result = await requestedCollection.insertOne(data);
        res.send(result);
      } else {
        res.status(404).send({ message: "Request failed" });
      }
    });

    // show requested food Read operation
    app.get("/reqFood", async (req, res) => {
      const cursor = requestedCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get reqFood by email
    app.get("/reqFood/:email", logger, verifyToken,  async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const result = await requestedCollection.find(query).toArray();
      res.send(result);
    });


    // *********************************************************************

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('food server is running')
})

app.listen(port, () => {
    console.log(`food server is running on port ${port}`)
})