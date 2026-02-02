import express from "express";
import { matchesRouter } from "./routes/matches";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});
app.use("/matches", matchesRouter);

app.listen(port, () => console.log(`Server is running on port ${port}`));
