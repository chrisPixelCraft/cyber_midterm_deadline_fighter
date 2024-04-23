const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const adminLayout = "../views/layouts/admin";
const jwtSecret = process.env.JWT_SECRET;

/**
 *
 * Check Avatar Storage
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/"); // make sure this directory exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname); // ensure no naming conflicts
  },
});

const upload = multer({ storage: storage });

/**
 *
 * Check Login
 */
const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
};

/**
 * GET /
 * Admin - Login Page
 */
router.get("/admin", async (req, res) => {
  try {
    const locals = {
      title: "Admin",
      description: "Simple Blog created with NodeJs, Express & MongoDb.",
    };

    res.render("admin/index", { locals, layout: adminLayout });
  } catch (error) {
    console.log(error);
  }
});

/**
 * POST /
 * Admin - Check Login
 */
router.post("/admin", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id }, jwtSecret);
    res.cookie("token", token, { httpOnly: true });
    res.redirect("/dashboard");
  } catch (error) {
    console.log(error);
  }
});

/**
 * GET /
 * Admin Dashboard
 */
router.get("/dashboard", authMiddleware, async (req, res) => {
  try {
    const locals = {
      title: "Dashboard",
      description: "Simple Blog created with NodeJs, Express & MongoDb.",
    };

    const data = await Post.find();
    res.render("admin/dashboard", {
      locals,
      data,
      layout: adminLayout,
    });
  } catch (error) {
    console.log(error);
  }
});

/**
 * GET /
 * Admin - Create New Post
 */

router.get("/dashboard", authMiddleware, async (req, res) => {
  try {
    // Assuming `userId` is a reference to the User model in the Post schema
    const posts = await Post.find().populate("userId").lean();

    res.render("admin/dashboard", {
      posts: posts, // Now each post should have user details included
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading the dashboard");
  }
});

router.get("/add-post", authMiddleware, async (req, res) => {
  try {
    const locals = {
      title: "Add Post",
      description: "Simple Blog created with NodeJs, Express & MongoDb.",
    };

    const data = await Post.find();
    res.render("admin/add-post", {
      locals,
      layout: adminLayout,
    });
  } catch (error) {
    console.log(error);
  }
});

/**
 * POST /
 * Admin - Create New Post
 */
router.post("/add-post", authMiddleware, async (req, res) => {
  try {
    const newPost = new Post({
      title: req.body.title,
      body: req.body.body,
      userId: req.userId, // Attach the user ID to the post
    });

    await newPost.save(); // Use save to ensure hooks and other middleware execute
    res.redirect("/dashboard");
  } catch (error) {
    console.log(error);
    res.status(500).send("Server error");
  }
});
// router.post("/add-post", authMiddleware, async (req, res) => {
//   try {
//     try {
//       const newPost = new Post({
//         title: req.body.title,
//         body: req.body.body,
//       });

//       await Post.create(newPost);
//       res.redirect("/dashboard");
//     } catch (error) {
//       console.log(error);
//     }
//   } catch (error) {
//     console.log(error);
//   }
// });

/**
 * GET /
 * Admin - Create New Post
 */
// router.get("/edit-post/:id", authMiddleware, async (req, res) => {
//   try {
//     const locals = {
//       title: "Edit Post",
//       description: "Free NodeJs User Management System",
//     };

//     const data = await Post.findOne({ _id: req.params.id });

//     res.render("admin/edit-post", {
//       locals,
//       data,
//       layout: adminLayout,
//     });
//   } catch (error) {
//     console.log(error);
//   }
// });
router.get("/edit-post/:id", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).send("Post not found");
    }

    if (post.userId.toString() !== req.userId) {
      return res.status(403).send("Unauthorized access to edit this post");
    }

    res.render("admin/edit-post", {
      title: "Edit Post",
      post: post,
      layout: adminLayout,
    });
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).send("Server error");
  }
});

/**
 * PUT /
 * Admin - Create New Post
 */
// router.put("/edit-post/:id", authMiddleware, async (req, res) => {
//   try {
//     await Post.findByIdAndUpdate(req.params.id, {
//       title: req.body.title,
//       body: req.body.body,
//       updatedAt: Date.now(),
//     });

//     res.redirect(`/edit-post/${req.params.id}`);
//   } catch (error) {
//     console.log(error);
//   }
// });
router.put("/edit-post/:id", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).send("Post not found");
    }

    if (post.userId.toString() !== req.userId) {
      return res.status(403).send("Unauthorized to update this post");
    }

    post.title = req.body.title;
    post.body = req.body.body;
    post.updatedAt = Date.now();

    await post.save();
    res.redirect(`/edit-post/${req.params.id}`);
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).send("Server error");
  }
});

// router.post('/admin', async (req, res) => {
//   try {
//     const { username, password } = req.body;

//     if(req.body.username === 'admin' && req.body.password === 'password') {
//       res.send('You are logged in.')
//     } else {
//       res.send('Wrong username or password');
//     }

//   } catch (error) {
//     console.log(error);
//   }
// });

/**
 * POST /
 * Admin - Register
 */
// router.post("/register", async (req, res) => {
//   try {
//     const { username, password } = req.body;
//     const hashedPassword = await bcrypt.hash(password, 10);

//     try {
//       const user = await User.create({ username, password: hashedPassword });
//       res.status(201).json({ message: "User Created", user });
//     } catch (error) {
//       if (error.code === 11000) {
//         res.status(409).json({ message: "User already in use" });
//       }
//       res.status(500).json({ message: "Internal server error" });
//     }
//   } catch (error) {
//     console.log(error);
//   }
// });

router.post("/register", upload.single("avatar"), async (req, res) => {
  const { username, password } = req.body;
  const avatarPath = req.file ? req.file.path : "/uploads/default_avatar.png"; // Use uploaded file path or default
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const newUser = await User.create({
      username,
      password: hashedPassword,
      avatar: avatarPath,
    });
    res.status(201).json({ message: "User created", user: newUser });
  } catch (error) {
    if (error.code === 11000) {
      // Handle duplicate username
      return res.status(409).json({ message: "Username already exists" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * DELETE /
 * Admin - Delete Post
 */
// router.delete("/delete-post/:id", authMiddleware, async (req, res) => {
//   try {
//     await Post.deleteOne({ _id: req.params.id });
//     res.redirect("/dashboard");
//   } catch (error) {
//     console.log(error);
//   }
// });
router.delete("/delete-post/:id", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    // Check if the post exists and if the logged-in user is the author
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.userId.toString() !== req.userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this post" });
    }

    await Post.deleteOne({ _id: req.params.id });
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).send("Server error");
  }
});

/**
 * GET /
 * Admin Logout
 */
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  //res.json({ message: 'Logout successful.'});
  res.redirect("/");
});

module.exports = router;
