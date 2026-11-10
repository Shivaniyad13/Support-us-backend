import { app } from "./app";
import { config } from "./config";

// Local development ke liye listen karein, Vercel par nahi
if (process.env.NODE_ENV !== "production") {
  app.listen(config.PORT, () => {
    console.log(`Support Us API listening on port ${config.PORT}`);
  });
}

// Vercel serverless function ke liye default export
export default app;