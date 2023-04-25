import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const SUPABASE_URL = "https://jqgftdqxquahwokjhzjl.supabase.co";

let supabase = createClient(SUPABASE_URL, process.env.SUPABASE_KEY || "");

const checkForCache = async (url) => {
  try {
    let { data, error } = await supabase.from("meta-cache").select("*").eq("url", url);

    if (error) {
      console.log(error);
      return null;
    }

    if (data) {
      return data[0];
    }

    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const createCache = async (data) => {
  try {
    await supabase.from("meta-cache").insert(data);

    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export { checkForCache, createCache };
