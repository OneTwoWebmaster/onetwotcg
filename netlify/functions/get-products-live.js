import { createClient } from "@supabase/supabase-js";

// Open DB API
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async () => {
  const { data, error } = await supabase
    .from("products")
    .select("id, price, stock");

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: "DB read failed" }) };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ products: data }),
  };
};
