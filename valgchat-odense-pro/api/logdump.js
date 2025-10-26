import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  const adminToken = process.env.ADMIN_TOKEN || "";
  const auth = req.headers["authorization"] || "";
  if (!adminToken || auth !== `Bearer ${adminToken}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const file = path.resolve("/tmp/chatlog.csv");
  if (!fs.existsSync(file)) {
    res.setHeader("Content-Type","text/plain; charset=utf-8");
    return res.status(200).send("timestamp;pid;role;content\n");
  }
  const data = fs.readFileSync(file);
  res.setHeader("Content-Type","text/csv; charset=utf-8");
  res.setHeader("Content-Disposition","attachment; filename=chatlog.csv");
  return res.status(200).send(data);
}
