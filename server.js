const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// Middleware test
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth",      require("./routes/auth"));
app.use("/api/vendors",   require("./routes/vendors"));
app.use("/api/bookings",  require("./routes/bookings"));
app.use("/api/reviews",   require("./routes/reviews"));
app.use("/api/admin",     require("./routes/admin"));
app.use("/api/payments",  require("./routes/payments"));

// app.get("/", (req, res) => {
//   res.send("<p>Server is running ✓</p>");
// });

// Health check
app.get("/", (req, res) => res.json({ message: "WeddingWala API Running ✅" }));

// Connect DB & Start
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    app.listen(process.env.PORT || 5000, () =>
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch((err) => {
    console.error("❌ DB Connection Error:", err.message);
    process.exit(1);
  });


  // testing 
