const express = require("express");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const db = require('./mysql');


const app = express();
const nodemailer = require("nodemailer");

// Middleware
app.use(express.static("public")); // Serve static files
app.use(express.json()); // Middleware to parse JSON data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.set("view engine", "ejs");

// Use express-session for session management
app.use(
  session({
    secret: "secret_key", // Replace with a secure key in production
    resave: false,
    saveUninitialized: false,
  })
);

// Dummy Admin Credentials
const ADMIN_CREDENTIALS = { username: "admin", password: "password" }; // Replace with secure values in production

// Dummy Data for Projects
let projects = [
  {
    id: 1,
    name: "Wedding Event",
    description: "A beautiful wedding setup.",
    image:
      "https://completewedo.com/wp-content/uploads/2019/01/Manhattan61518_bridalparty.jpg",
  },
  {
    id: 2,
    name: "Corporate Meeting",
    description: "Professional corporate event.",
    image:
      "https://content.thriveglobal.com/wp-content/uploads/2019/03/AdobeStock_84436707.jpeg",
  },
  {
    id: 3,
    name: "Birthday Party",
    description: "A colorful birthday celebration.",
    image:
      "https://www.themixer.com/en-us/wp-content/uploads/sites/2/2022/11/390.-How-to-Plan-a-Surprise-Birthday-Party_Featured-Image_Canva_Aja-Koska.jpg",
  },
  {
    id: 4,
    name: "Music Festival",
    description: "Exciting live music festival.",
    image:
      "https://www.amusephiladelphia.com/wp-content/uploads/2018/08/34735177654_35eb166e10_k.jpg",
  },
  {
    id: 5,
    name: "Product Launch",
    description: "Stylish and modern product launch event.",
    image:
      "https://atneventstaffing.com/wp-content/uploads/2018/12/IMG_1647.jpg",
  },
  {
    id: 6,
    name: "Charity Gala",
    description: "Elegant gala to support a great cause.",
    image:
      "https://better.net/wp-content/uploads/2023/10/Gala-SFBallet-DEV19GAL_NR014.jpg",
  },
];

let galleryItems = [
  {
    id: 1,
    title: "Photo 1",
    image: "/assets/img/masonry-portfolio/masonry-portfolio-1.jpg",
  },
  {
    id: 2,
    title: "Photo 2",
    image: "/assets/img/masonry-portfolio/masonry-portfolio-10.jpg",
  },
  {
    id: 3,
    title: "Photo 3",
    image: "/assets/img/masonry-portfolio/masonry-portfolio-2.jpg",
  },
];

// Middleware to check if admin is logged in
const isAdmin = (req, res, next) => {
  if (req.session.isLoggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads"); // Save files to the 'uploads' directory inside 'public'
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Use timestamp + file extension
  },
});

const upload = multer({ storage });

// Routes
app.get("/", (req, res) => res.render("home", { projects: projects }));

app.get("/services", (req, res) => res.render("services"));

app.get("/gallery", (req, res) => {
  res.render("gallery", { galleryItems: galleryItems }); // Pass galleryItems to the view
});

// Admin route to manage the gallery
app.get("/admin/gallery", isAdmin, (req, res) => {
  res.render("adminGallery", { galleryItems }); // Pass gallery items for editing
});

// Handle adding new photos (admin only)
app.post("/admin/gallery", isAdmin, (req, res) => {
  const { title } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;
  galleryItems.push({ id: galleryItems.length + 1, title, image });
  res.redirect("/admin/gallery");
});

// Handle deleting photos (admin only)
app.post("/admin/gallery/delete/:id", isAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  galleryItems = galleryItems.filter((item) => item.id !== id);
  res.redirect("/admin/gallery");
});

// Admin Manage Projects Page
app.get("/admin/projects", isAdmin, (req, res) => {
  res.render("admin", { projects });
});

// Admin Manage Gallery Page
app.get("/admin/gallery", isAdmin, (req, res) => {
  res.render("adminGallery", { gallery });
});

// Admin Main Page
app.get("/admin", isAdmin, (req, res) => {
  res.render("adminMain"); // Render the main admin page
});

app.get("/projects", (req, res) => res.render("projects", { projects }));
app.get("/admin", isAdmin, (req, res) => res.render("admin", { projects }));

// Admin Login Routes
app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === ADMIN_CREDENTIALS.username &&
    password === ADMIN_CREDENTIALS.password
  ) {
    req.session.isLoggedIn = true;
    res.redirect("/admin");
  } else {
    res.render("login", { error: "Invalid username or password" });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

app.post("/gallery", isAdmin, upload.single("image"), (req, res) => {
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  if (!image) {
    return res.status(400).send("Image is required.");
  }

  const id =
    galleryItems.length > 0 ? galleryItems[galleryItems.length - 1].id + 1 : 1; // Unique ID
  galleryItems.push({ id, image });

  res.redirect("/admin/gallery");
});

app.delete("/gallery/:id", isAdmin, (req, res) => {
  const { id } = req.params;
  console.log(id);
  galleryItems = galleryItems.filter((photo) => photo.id != id);
  res.redirect("/admin/gallery");
});

app.put("/gallery/:id", isAdmin, upload.single("image"), (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  // Find the gallery item to update
  const galleryItem = galleryItems.find((item) => item.id == id);

  if (galleryItem) {
    galleryItem.title = title || galleryItem.title;
    galleryItem.image = image || galleryItem.image;
  }

  res.redirect("/admin/gallery");
});

// Admin Project Management Routes
// Route to add new project with image
app.post("/projects", isAdmin, upload.single("image"), (req, res) => {
  const { name, description } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null; // Save image path

  // Validation: Ensure required fields are provided
  if (!name || !description || !image) {
    return res
      .status(400)
      .send("All fields (name, description, image) are required.");
  }

  // Create a new project object
  const id = projects.length > 0 ? projects[projects.length - 1].id + 1 : 1; // Assign a unique ID
  const newProject = { id, name, description, image };

  // Add the new project to the projects array
  projects.push(newProject);

  // Redirect to the admin page after adding the project
  res.redirect("/admin/projects");
});

app.put("/projects/:id", isAdmin, upload.single("image"), (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const project = projects.find((p) => p.id == id);

  if (project) {
    project.name = name;
    project.description = description;
    if (req.file) {
      project.image = `/uploads/${req.file.filename}`; // Update image path
    }
  }
  res.redirect("/admin/projects");
});

app.delete("/projects/:id", isAdmin, (req, res) => {
  const { id } = req.params;
  projects = projects.filter((p) => p.id != id);
  res.redirect("/admin/projects");
});

// Route to handle form submission
app.post("/contact", (req, res) => {
  const { name, email, subject, message } = req.body;

  console.log("Received data:", req.body);

  // Set up Nodemailer transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "your-email@gmail.com",
      pass: "password",
    },
  });

  const mailOptions = {
    from: email, // Sender's email (this is the email from the form)
    to: "your-email@gmail.com", // Your email to receive the contact messages
    subject: subject, // Subject of the email
    text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`, // Email content
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      res.status(500).send("Error occurred while sending the email");
    } else {
      console.log("Email sent: " + info.response);
      res.redirect("/#contact");
    }
  });
});

// Start Server
const PORT = 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
