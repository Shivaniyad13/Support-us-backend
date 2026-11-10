import { app } from "./app";
import { config } from "./config";

// Local development ke liye listen karein, Vercel par NODE_ENV production hota hai
if (process.env.NODE_ENV !== "production") {
  app.listen(config.PORT, () => {
    console.log(`Support Us API listening on port ${config.PORT}`);
  });
}

// Vercel Serverless Function ke liye yeh line sabse zaroori hai
export default app;