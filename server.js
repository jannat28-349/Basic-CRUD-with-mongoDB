require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const connectDB = require("./config/db");
const User = require("./models/User");

app.use(bodyParser.json());

connectDB();

app.get("/", (req, res) => {
  res.json({ msg: "app successful" });
});

app.post("/users", async (req, res) => {
  try {
    const body = req.body;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(body.password, salt);
    const password = hash;
    const userObj = new User({
      name: body.name,
      email: body.email,
      password: password,
      age: body.age,
    });
    await userObj
      .save()
      .then((savedUser) => {
        res.status(201).json(savedUser);
      })
      .catch((error) => {
        res.status(404).send("User not created!!");
      });
  } catch (error) {
    res.status(500).send(`Something Went wrong`);
  }
});

async function handleEmailLogin(email, res, password) {
  const user = await User.findOne({ email: email });
  if (user) {
    const isValidPassword = bcrypt.compare(password, user.password);
    if (isValidPassword) {
      const accesssToken = jwt.sign(
        { email: user.email, id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "2m" }
      );
      const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "3m",
      });
      const userObj = user.toJSON();
      userObj["accessToken"] = accesssToken;
      userObj["refreshToken"] = refreshToken;
      res.status(200).json(userObj);
    } else {
      res.status(401).json({ message: `Wrong Password!!` });
    }
  } else {
    res.status(404).json({ message: `User Not Found` });
  }
}

async function handleRefreshLogin(refreshToken, res) {
  if (!refreshToken) {
    res.status(404).json({ message: `No refresh token defined` });
  } else {
    jwt.verify(refreshToken, process.env.JWT_SECRET, async (err, payload) => {
      if (err) {
        res.status(401).json({ message: `Unauthorized` });
      } else {
        const id = payload.id;
        const user = await User.findById(id);
        if (user) {
          const accesssToken = jwt.sign(
            { email: user.email, id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "2m" }
          );
          const refreshToken = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "3m" }
          );
          const userObj = user.toJSON();
          userObj["accessToken"] = accesssToken;
          userObj["refreshToken"] = refreshToken;
          res.status(200).json(userObj);
        } else {
          res.status(404).json({ message: `User Not Found` });
        }
      }
    });
  }
}

app.post("/users/login", async (req, res) => {
  try {
    const { email, password, type, refreshToken } = req.body;
    if (!type) {
      res.status(404).json({ message: `type is not defined` });
    } else {
      if (type == "email") {
        await handleEmailLogin(email, res, password);
      } else {
        await handleRefreshLogin(refreshToken, res);
      }
    }
  } catch (error) {
    res.status(500).send(`Something Went wrong`);
  }
});

//middleware to authenticate JWT accesss token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        res.status(401).json({ message: `Unauthorized` });
      } else {
        req.user = user;
        next();
      }
    });
  } else {
    res.status(401).json({ message: `Unauthorized` });
  }
};

//? get a user profile api

app.get("/profile", authenticateToken, async (req, res) => {
  const id = req.user.id;
  try {
    const user = await User.findById(id);
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ message: `User not found` });
    }
  } catch (error) {
    res.status(500).send(`Something Went wrong`);
  }
});

//? update a user profile api
app.put("/profile", authenticateToken, async (req, res) => {
  try {
    const id = req.user.id;
    const body = req.body;
    const user = await User.findByIdAndUpdate(id, body, {
      new: true,
      strict: false,
    });
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ message: `User not found` });
    }
  } catch (error) {
    res.status(500).send(`Something Went wrong`);
  }
});

//? delete a user profile api
app.delete("/profile", authenticateToken, async (req, res) => {
  try {
    const id = req.user.id;
    const user = await User.findByIdAndDelete(id);
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ message: `User not found` });
    }
  } catch (error) {
    res.status(500).send(`Something Went wrong`);
  }
});

app.get("/users", authenticateToken, async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json(users);
  } catch (error) {
    res.status(500).send(`Something Went wrong`);
  }
});

app.get("/users/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const user = await User.findById(id);
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ message: `User not found` });
    }
  } catch (error) {
    res.status(500).send(`Something Went wrong`);
  }
});

app.put("/users/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body;
    const user = await User.findByIdAndUpdate(id, body, {
      new: true,
      strict: false,
    });
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ message: `User not found` });
    }
  } catch (error) {
    res.status(500).send(`Something Went wrong`);
  }
});

app.delete("/users/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findByIdAndDelete(id);
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ message: `User not found` });
    }
  } catch (error) {
    res.status(500).send(`Something Went wrong`);
  }
});

const port = process.env.PORT;
app.listen(port, () => {
  console.log(`App is listening at port ${port}`);
});
