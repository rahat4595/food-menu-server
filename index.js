const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



console.log(process.env.DB_PASS)


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ev60phs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const foodsCollection = client.db('foodDB').collection('foods');
    const requestedCollection = client.db('foodDB').collection('requestedFood');


    // getting data from server
    app.get('/foods', async (req, res) => {
      const cursor = foodsCollection.find({status:'Available'});
      const result = await cursor.toArray();
      res.send(result);
    })

    // getting data for my list
    app.get('/myList/:email', async (req, res) => {
      console.log(req.params.email);
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
    app.get("/reqFood/:email", async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const result = await requestedCollection.find(query).toArray();
      res.send(result);
    });


    // *********************************************************************

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
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