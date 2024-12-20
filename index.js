const express = require("express");
const { exec } = require("child_process");
const cors = require("cors");
const mysql = require("mysql2");

// Create a connection pool to your database
const pool = mysql.createPool({
  host: "terraform-20241217062232408100000004.c9e8ko6ciek1.ap-south-1.rds.amazonaws.com", // Replace with your DB host
  user: "admin",
  password: "sachinyadavrao",
  database: "mydb",
  port: 3306, // Explicitly define port if needed
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const app = express();
app.use(cors()); // Enable CORS
app.use(express.json());

// Root endpoint to check if the API is running
app.get("/", (req, res) => {
  res.send("API is running");
});

// Deploy endpoint to invoke Terraform and store details in the database
app.post("/deploy", (req, res) => {
  const keyword = req.body.keyword;

  console.log("Deploying with keyword:", keyword);

  exec(
    "terraform apply -auto-approve",
    { cwd: "D:/aws-devops/terraform/terraform-infra" }, // Correct path to Terraform directory
    (error, stdout, stderr) => {
      if (error) {
        console.error("Exec Error:", error);
        return res.status(500).send({
          message: "Terraform execution failed",
          error: error.message,
          stderr,
        });
      }
      if (stderr) {
        console.error("Terraform stderr:", stderr);
        return res.status(500).send({
          message: "Terraform execution had warnings",
          stderr,
        });
      }

      console.log("Terraform output:", stdout); // Log Terraform output

      // Extract the endpoint from Terraform output
      const endpoint = extractEndpointFromOutput(stdout);
      console.log("Extracted endpoint:", endpoint);

      // Insert the keyword and endpoint into the database
      const insertQuery =
        "INSERT INTO keyword_endpoints (keyword, endpoint) VALUES (?, ?)";
      pool.execute(insertQuery, [keyword, endpoint], (err, results) => {
        if (err) {
          console.error("Database insertion error:", err);
          return res.status(500).json({
            message: "Error storing keyword and endpoint",
            error: err,
          });
        }
        res.send({
          message: "Deployment started and details stored",
          details: stdout,
          keyword: keyword,
          endpoint: endpoint,
        });
      });
    }
  );
});

// Endpoint to load data based on a keyword
app.post("/load-data", (req, res) => {
  const keyword = req.body.keyword;

  console.log("Loading data for keyword:", keyword);

  // Query to fetch data based on the keyword
  const query = "SELECT * FROM keyword_endpoints WHERE keyword = ?";
  pool.execute(query, [keyword], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res
        .status(500)
        .json({ message: "Error querying the database", error: err });
    }

    // Send a success response with the data
    if (results.length > 0) {
      res.json({ message: "Data loaded successfully", data: results });
    } else {
      res
        .status(404)
        .json({ message: "No data found for the provided keyword" });
    }
  });
});

// Start the server
app.listen(5000, () => console.log("API running on port 5000"));

// Helper function to extract endpoint from Terraform output
function extractEndpointFromOutput(stdout) {
  // Match the output line that contains `endpoint = "value"`
  const match = stdout.match(/endpoint\s*=\s*"([^"]+)"/);
  return match ? match[1] : "unknown"; // Extract the endpoint or return "unknown"
}
