import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import setupRoutes from "./routes/index.js";
import { setActiveDatabase } from "../database/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const dbParam = req.query.db;
  if (dbParam) {
    setActiveDatabase(dbParam);
  }
  next();
});

app.use(express.static(path.join(__dirname, "../../frontend"), {}));

setupRoutes(app);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.use('/utils', express.static(path.join(__dirname, '../../utils'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
