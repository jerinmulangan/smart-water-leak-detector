require("dotenv").config();
console.log("API key:", process.env.GEMINI_API_KEY ? "Loaded ✅" : "Not found ❌");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");

const BACKEND_URL = "http://localhost:3000/api/analyze-leak";

async function sendTestImage(filePath, end1, end2, email) {
  const form = new FormData();
  form.append("image", fs.createReadStream(filePath));
  form.append("end1Pressure", end1);
  form.append("end2Pressure", end2);
  form.append("userEmail", email);

  try {
    const response = await axios.post(BACKEND_URL, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    console.log("Server response:", response.data);
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}

// Example usage
(async () => {
  const testImages = ["./test_images/test2.png"];
  const email = "ggstephen6724@gmail.com";

  for (let i = 0; i < testImages.length; i++) {
    const end1 = (Math.random() * 10 + 10).toFixed(2);
    const end2 = (Math.random() * 10 + 10).toFixed(2);
    console.log(`Sending image ${i + 1} with pressures ${end1}, ${end2}`);
    await sendTestImage(testImages[i], end1, end2, email);
  }
})();
