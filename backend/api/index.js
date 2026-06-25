import express from "express";

const app = express();

app.use(express.json());

// TEST ROUTE
app.get("/", (req, res) => {
  res.json({ message: "CRM API running 🚀" });
});

// CREATE LEAD (example)
app.post("/lead", (req, res) => {
  const { name, phone } = req.body;

  res.json({
    success: true,
    lead: { name, phone }
  });
});

export default app;