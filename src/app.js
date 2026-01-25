require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/blogs", require("./routes/blog.routes"));
app.use("/api/portfolio", require("./routes/portfolio.routes"));
app.use("/api/testimonials", require("./routes/testimonial.routes"));
app.use("/api/subscribe", require("./routes/subscribe.routes"));


module.exports = app;
