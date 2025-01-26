require("dotenv").config();

const config = require("./config.json");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const upload = require("./multer");
const fs = require("fs");
const path = require("path");

const { authenticateToken } = require("./utilities");

const User = require("./models/user.model");
const TravelPost = require("./models/travelPost.model");

mongoose.connect(config.connectionString);

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

// create a user account
app.post("/create-user", async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res
      .status(400)
      .json({ error: true, message: "All fields are required" });
  }

  const isUser = await User.findOne({ email });
  if (isUser) {
    return res
      .status(400)
      .json({ error: true, message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    fullName,
    email,
    password: hashedPassword,
  });

  await user.save();

  const accessToken = jwt.sign(
    { userId: user._id },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "72h" }
  );

  return res.status(201).json({
    user: { fullName: user.fullName, email: user.email },
    accessToken,
    message: "User Registered",
    error: false,
  });
});

// login user account
app.post("/login-user", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and Password are required" });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ message: "Invalid Credentials" });
  }

  const accessToken = jwt.sign(
    { userId: user._id },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "72h" }
  );

  return res.json({
    user: { fullName: user.fullName, email: user.email },
    accessToken,
    message: "Login Successful",
    error: false,
  });
});

// get user
app.get("/get-user", authenticateToken, async (req, res) => {
  const { userId } = req.user;

  const isUser = await User.findOne({ _id: userId });
  if (!isUser) {
    return res.sendStatus(401);
  }

  return res.json({ user: isUser, message: "" });
});

// route to handle image uploads
app.post("/image-upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: true, message: "No image uploaded" });
    }

    const imageUrl = `http://localhost:8000/uploads/${req.file.filename}`;

    res.status(200).json({ imageUrl });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// delete an image from uploads folder
app.delete("/delete-image", async (req, res) => {
  const { imageUrl } = req.query;

  if (!imageUrl) {
    return res
      .status(400)
      .json({ error: true, message: "imageUrl parameter is required" });
  }

  try {
    // extract the filename from the imageUrl
    const filename = path.basename(imageUrl);

    // define the file path
    const filePath = path.join(__dirname, "uploads", filename);

    // check if the file exists
    if (fs.existsSync(filePath)) {
      // delete the file from the uploads folder
      fs.unlinkSync(filePath);
      res.status(200).json({ message: "Image deleted successfully" });
    } else {
      res.status(200).json({ message: "Image not found" });
    }
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// serve static files from the uploads and assets directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/assets", express.static(path.join(__dirname, "assets")));

// add travel post
app.post("/add-travel-post", authenticateToken, async (req, res) => {
  const { title, story, visitedLocation, imageUrl, visitedDate } = req.body;
  const { userId } = req.user;

  // validating required fields
  if (!title || !story || !visitedLocation || !imageUrl || !visitedDate) {
    res.status(400).json({ error: true, message: "All fields are required" });
  }

  const parseVisitedDate = new Date(parseInt(visitedDate));

  try {
    const travelPost = new TravelPost({
      title,
      story,
      visitedLocation,
      userId,
      imageUrl,
      visitedDate: parseVisitedDate,
    });

    await travelPost.save();
    res.status(201).json({ story: travelPost, message: "Added Successfully" });
  } catch (error) {
    res.status(401).json({ error: true, message: error.message });
  }
});

// get all travel posts
app.get("/get-all-posts", authenticateToken, async (req, res) => {
  const { userId } = req.user;

  try {
    const travelPosts = await TravelPost.find({ userId: userId }).sort({
      isFavourite: -1,
    });
    res.status(200).json({ stories: travelPosts });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// edit travel post
app.put("/edit-travel-post/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, story, visitedLocation, imageUrl, visitedDate } = req.body;
  const { userId } = req.user;

  // validating required fields
  if (!title || !story || !visitedLocation || !visitedDate) {
    res.status(400).json({ error: true, message: "All fields are required" });
  }

  const parseVisitedDate = new Date(parseInt(visitedDate));

  try {
    // find travel post by id and ensure it belongs to auth user
    const travelPost = await TravelPost.findOne({ _id: id, userId: userId });

    if (!travelPost) {
      return res
        .status(404)
        .json({ error: true, message: "Travel story not found" });
    }

    const placeholderImgUrl = `http://localhost:8000/assets/mountains-bg.jpg`;

    travelPost.title = title;
    travelPost.story = story;
    travelPost.visitedLocation = visitedLocation;
    travelPost.imageUrl = imageUrl || placeholderImgUrl;
    travelPost.visitedDate = parseVisitedDate;

    await travelPost.save();
    res.status(200).json({ story: travelPost, message: "Update Successful" });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// delete travel post
app.delete("/delete-travel-post/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;

  try {
    // find travel post by id and ensure it belongs to auth user
    const travelPost = await TravelPost.findOne({ _id: id, userId: userId });

    if (!travelPost) {
      return res
        .status(404)
        .json({ error: true, message: "Travel story not found" });
    }

    // delete travel post from the database
    await travelPost.deleteOne({ _id: id, userId: userId });

    // extract filename from the imageUrl
    const imageUrl = travelPost.imageUrl;
    const filename = path.basename(imageUrl);

    // define file path
    const filePath = path.join(__dirname, 'uploads', filename);

    // delete image file from the uploads folder
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Failed to delete image file:", err);
      }
    });

    res.status(200).json({ message: "Travel story deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// update isFavourite
app.put("/update-is-favourite/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { isFavourite } = req.body;
  const { userId } = req.user;

  try {
    const travelPost = await TravelPost.findOne({ _id: id, userId: userId });

    if (!travelPost) {
      return res.status(404).json({ error: true, message: "Travel story not found" });
    }

    travelPost.isFavourite = isFavourite;

    await travelPost.save();
    res.status(200).json({ story: travelPost, message: 'Update Successful' });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// search travel posts
app.get("/search", authenticateToken, async (req, res) => {
  const { query } = req.query;
  const { userId } = req.user;

  if (!query) {
    return res.status(404).json({ error: true, message: "query is required" });
  }

  try {
    const searchResults = await TravelPost.find({
      userId: userId,
      $or: [
        { title: { $regex: query, $options: "i" } },
        { stpry: { $regex: query, $options: "i" } },
        { visitedLocation: { $regex: query, $options: "i" } },
      ],
    }).sort({ isFavourite: -1 });

    res.status(200).json({ stories: searchResults });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// filter travel posts by date range
app.get("/travel-posts/filter", authenticateToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  const { userId } = req.user;

  try {
    // convert startDate & endDate from ms to Date obj
    const start = new Date(parseInt(startDate));
    const end = new Date(parseInt(endDate));

    // find travel posts that belong to user and are within date range
    const filteredStories = await TravelPost.find({
      userId: userId,
      visitedDate: { $gte: start, $lte: end },
    }).sort({ isFavourite: -1 });

    res.status(200).json({ stories: filteredStories });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});




app.listen(8000);
module.exports = app;
