const thinky = require("./lib/thinky.js");
const r = thinky.r;

async function recoverOrphanedData() {
  console.log("Starting data recovery script...");
  console.log("=========================================");

  let samplesFixed = 0;
  let constructsFixed = 0;
  let imagesFixed = 0;

  try {
    // Wait for the database connection
    console.log("Connecting to RethinkDB...");

    // 1. Fix SampleDescriptions
    const orphanedSamples = await r
      .table("SampleDescription")
      .filter((doc) => doc.hasFields("requestId"))
      .run();

    console.log(`Found ${orphanedSamples.length} orphaned SampleDescriptions.`);

    for (const sample of orphanedSamples) {
      if (sample.requestId) {
        await r.table("SampleDescription").get(sample.id).update({
          requestID: sample.requestId, // Copy value to correct key
        }).run();
        
        // Remove the incorrect key
        await r.table("SampleDescription").get(sample.id).replace(r.row.without('requestId')).run();
        samplesFixed++;
      }
    }

    // 2. Fix Constructs
    const orphanedConstructs = await r
      .table("Construct")
      .filter((doc) => doc.hasFields("requestId"))
      .run();

    console.log(`Found ${orphanedConstructs.length} orphaned Constructs.`);

    for (const construct of orphanedConstructs) {
      if (construct.requestId) {
        await r.table("Construct").get(construct.id).update({
          requestID: construct.requestId, // Copy value to correct key
        }).run();
        
        // Remove the incorrect key
        await r.table("Construct").get(construct.id).replace(r.row.without('requestId')).run();
        constructsFixed++;
      }
    }

    // 3. Fix SampleImages (just in case they were affected too)
    const orphanedImages = await r
      .table("SampleImage")
      .filter((doc) => doc.hasFields("requestId"))
      .run();

    console.log(`Found ${orphanedImages.length} orphaned SampleImages.`);

    for (const image of orphanedImages) {
      if (image.requestId) {
        await r.table("SampleImage").get(image.id).update({
          requestID: image.requestId, // Copy value to correct key
        }).run();
        
        // Remove the incorrect key
        await r.table("SampleImage").get(image.id).replace(r.row.without('requestId')).run();
        imagesFixed++;
      }
    }

    console.log("=========================================");
    console.log("RECOVERY COMPLETE!");
    console.log(`Fixed SampleDescriptions: ${samplesFixed}`);
    console.log(`Fixed Constructs:         ${constructsFixed}`);
    console.log(`Fixed SampleImages:       ${imagesFixed}`);
    console.log("=========================================");

  } catch (err) {
    console.error("An error occurred during recovery:", err);
  } finally {
    // Ensure the script exits cleanly
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
}

recoverOrphanedData();
