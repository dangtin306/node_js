import { connectDB } from './connect.js';
const db = await connectDB();

export async function mongo_update_multi(query, set) {
  try {
    // If "set" does not have a $set property, wrap it
    if (!set.hasOwnProperty('$set') && !set.hasOwnProperty('$unset') && !set.hasOwnProperty('$inc')) {
      set = { $set: set };
    }

    const collection = db.collection("collection_1");
    const result = await collection.updateMany(query, set);

    console.log(`Matched ${result.matchedCount} document(s) and modified ${result.modifiedCount} document(s).`);

    if (result.modifiedCount > 0) {
      return {
        mongo_status: "success",
        mongo_results: "update_success",
        modified_count: result.modifiedCount
      };
    } else {
      return {
        mongo_status: "success",
        mongo_results: "update_cancel",
        modified_count: 0
      };
    }
  } catch (error) {
    console.error("Error during multi update:", error);
    return {
      mongo_status: "cancel",
      mongo_results: error.message
    };
  } finally {
    console.log("mongo_update_multi: done");
  }
}
