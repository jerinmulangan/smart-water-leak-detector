const axios = require("axios");
const sharp = require("sharp");

/**
 * Analyzes image for leaks using Gemini 2.5 Pro with maximum accuracy
 * @param {Buffer} imageBuffer - Image buffer (JPEG or PNG)
 * @param {number} end1Pressure - Pressure reading from end 1 (optional)
 * @param {number} end2Pressure - Pressure reading from end 2 (optional)
 * @returns {Promise<string>} - Annotated image as base64 string
 */
async function analyzeWithGemini(imageBuffer, end1Pressure = null, end2Pressure = null) {
  if (!imageBuffer || imageBuffer.length === 0) {
    throw new Error("No image buffer provided!");
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_API_URL = process.env.GEMINI_API_URL;

  if (!GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY not found. Returning original image.");
    return imageBuffer.toString("base64");
  }

  try {
    const base64Image = imageBuffer.toString("base64");

    // Calculate pressure context if available
    let pressureContext = "";
    if (end1Pressure !== null && end2Pressure !== null) {
      const pressureDiff = Math.abs(end1Pressure - end2Pressure);
      pressureContext = `
SYSTEM PRESSURE DATA:
- End 1 Pressure: ${end1Pressure} PSI
- End 2 Pressure: ${end2Pressure} PSI
- Pressure Difference: ${pressureDiff.toFixed(2)} PSI

${pressureDiff > 3 ? 
  '⚠️ ALERT: Significant pressure drop detected (>3 PSI) - Actively search for visible leak evidence!' : 
  pressureDiff > 1.5 ?
  '⚠️ WARNING: Moderate pressure drop detected (>1.5 PSI) - Examine carefully for leaks.' :
  '✓ Normal pressure difference (<1.5 PSI) - Only flag OBVIOUS visible damage.'}
`;
    }

    // Ultra-strict prompt for maximum accuracy
    const prompt = `
You are an EXPERT water leak detection specialist with 20 years of experience. Your reputation depends on accuracy - false positives damage your credibility.

${pressureContext}

TASK: Analyze this image with EXTREME scrutiny. ONLY flag areas with UNMISTAKABLE evidence of active or recent water damage.

✅ ONLY DETECT IF YOU SEE:
1. **Active water**: Visible dripping, pooling, or wet surfaces with clear moisture
2. **Water stains**: Brown, yellow, or dark discoloration patches (NOT shadows or dirt)
3. **Structural damage**: Warped drywall, peeling paint, bubbling surfaces caused by water
4. **Mold/mildew**: Visible black, green, or white fuzzy growth in damp areas
5. **Ceiling damage**: Sagging, rings, or clear water damage patterns

❌ DO NOT FLAG:
- Normal shadows, lighting variations, or camera artifacts
- Clean, dry surfaces even if oddly colored
- Normal wear and tear, cracks, or aging (unless clearly water-related)
- Dust, dirt, or stains that are clearly NOT water damage
- Reflections, glare, or image compression artifacts
- Construction materials or intentional design elements

🎯 ACCURACY RULES:
- Set confidence to "high" ONLY if you are 90%+ certain it's a real leak
- Set confidence to "medium" if 70-89% certain (will be filtered out)
- If you're less than 70% certain, DO NOT include it
- Describe EXACTLY what you see that indicates water damage
- Be conservative - when in doubt, leave it out

RESPONSE FORMAT:
Return ONLY valid JSON (no markdown, no code blocks, no explanations):
{
  "leaks": [
    {
      "x": 150,
      "y": 200,
      "width": 80,
      "height": 60,
      "confidence": "high",
      "description": "brown water stain with visible drip marks on white ceiling",
      "evidence": "discoloration, staining pattern, structural damage"
    }
  ]
}

If NO clear leaks are visible, return: {"leaks": []}

Coordinates must be in pixels from top-left corner (0,0).
Be an expert. Your accuracy matters.
`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1, // Very low for consistent, conservative responses
        topK: 20,
        topP: 0.8,
      },
    };

    console.log("🔍 Sending image to Gemini 2.5 Pro for expert analysis...");
    if (pressureContext) {
      console.log(`📊 Pressure context: End1=${end1Pressure} PSI, End2=${end2Pressure} PSI`);
    }

    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      requestBody,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 90000, // 90s for Pro model (slower but smarter)
      }
    );

    const candidates = response.data?.candidates;
    let responseText = candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      console.warn("⚠️ No response from Gemini. Returning original image.");
      return base64Image;
    }

    console.log("📝 Gemini response:", responseText);

    // Clean response - remove markdown code blocks if present
    responseText = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let leakData;
    try {
      leakData = JSON.parse(responseText);
    } catch (parseErr) {
      console.error("❌ Failed to parse Gemini response as JSON");
      console.error("Raw response:", responseText);
      return base64Image;
    }

    // Filter to ONLY high-confidence detections
    const highConfidenceLeaks = leakData.leaks?.filter(leak => 
      leak.confidence === "high" || leak.confidence === "very high"
    ) || [];

    // Log filtering results
    if (leakData.leaks && leakData.leaks.length > 0) {
      const filteredCount = leakData.leaks.length - highConfidenceLeaks.length;
      if (filteredCount > 0) {
        console.log(`🔍 Filtered out ${filteredCount} low/medium confidence detection(s)`);
      }
    }

    // If no high-confidence leaks detected, return original
    if (highConfidenceLeaks.length === 0) {
      console.log("✅ No high-confidence leaks detected - image appears clean!");
      if (leakData.leaks && leakData.leaks.length > 0) {
        console.log(`   Note: Found ${leakData.leaks.length} low-confidence area(s), but not marking them.`);
      }
      return base64Image;
    }

    console.log(`🎯 LEAK ALERT: Found ${highConfidenceLeaks.length} high-confidence leak(s)!`);
    highConfidenceLeaks.forEach((leak, i) => {
      console.log(`   ${i + 1}. ${leak.description}`);
      console.log(`      Evidence: ${leak.evidence || 'N/A'}`);
    });

    // Draw annotations on detected leaks
    const annotatedImage = await drawLeakAnnotations(imageBuffer, highConfidenceLeaks);
    return annotatedImage.toString("base64");

  } catch (err) {
    console.error("❌ Error calling Gemini API:", err.response?.data || err.message);
    return imageBuffer.toString("base64");
  }
}

/**
 * Draws detailed annotations on image at specified coordinates
 * @param {Buffer} imageBuffer - Original image
 * @param {Array} leaks - Array of high-confidence leak coordinates
 * @returns {Promise<Buffer>} - Annotated image buffer
 */
async function drawLeakAnnotations(imageBuffer, leaks) {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    console.log(`📐 Image dimensions: ${metadata.width}x${metadata.height}`);

    // Create SVG overlay with prominent red rectangles and labels
    const svgElements = leaks.map((leak, index) => {
      const { x, y, width, height, confidence, description } = leak;
      console.log(`  🔴 Leak ${index + 1}: (${x}, ${y}) ${width}x${height}`);
      console.log(`     Confidence: ${confidence}`);
      console.log(`     Details: ${description || 'no description'}`);
      
      // Create a semi-transparent red background for the label
      const labelY = y > 30 ? y - 10 : y + height + 20;
      const labelText = `LEAK #${index + 1}`;
      
      return `
        <!-- Red rectangle around leak -->
        <rect 
          x="${x}" 
          y="${y}" 
          width="${width}" 
          height="${height}" 
          fill="rgba(255, 0, 0, 0.15)" 
          stroke="red" 
          stroke-width="5"
        />
        <!-- Label background -->
        <rect 
          x="${x - 5}" 
          y="${labelY - 18}" 
          width="${labelText.length * 10 + 10}" 
          height="22" 
          fill="red" 
          opacity="0.9"
        />
        <!-- Label text -->
        <text 
          x="${x}" 
          y="${labelY - 3}" 
          font-family="Arial, sans-serif" 
          font-size="16" 
          fill="white" 
          font-weight="bold"
        >${labelText}</text>
      `;
    }).join("");

    const svgOverlay = `
      <svg width="${metadata.width}" height="${metadata.height}">
        ${svgElements}
      </svg>
    `;

    // Composite SVG on top of original image
    const annotatedBuffer = await image
      .composite([{ 
        input: Buffer.from(svgOverlay), 
        top: 0, 
        left: 0 
      }])
      .jpeg({ quality: 95 }) // High quality for clear annotations
      .toBuffer();

    console.log(`✅ Successfully annotated image with ${leaks.length} leak marking(s)`);
    return annotatedBuffer;

  } catch (err) {
    console.error("❌ Error drawing annotations:", err.message);
    return imageBuffer; // Return original on error
  }
}

module.exports = analyzeWithGemini;