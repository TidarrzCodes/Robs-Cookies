export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method tidak diizinkan." });
  }

  const endpoint = process.env.CHECKOUT_ENDPOINT;

  if (!endpoint) {
    return res.status(500).json({
      error: "Environment variable CHECKOUT_ENDPOINT belum diatur."
    });
  }

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(req.body),
      redirect: "follow"
    });

    const text = await upstream.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: "Respons dari Apps Script tidak valid."
      });
    }

    return res.status(upstream.ok ? 200 : 502).json(data);
  } catch (error) {
    console.error("Checkout proxy error:", error);

    return res.status(502).json({
      error: "Tidak dapat menghubungi Apps Script."
    });
  }
}