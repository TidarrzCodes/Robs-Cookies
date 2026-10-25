export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      ok: false,
      error: "Method tidak diizinkan."
    });
  }

  const appsScriptUrl = process.env.CHECKOUT_ENDPOINT;

  if (!appsScriptUrl) {
    return res.status(500).json({
      ok: false,
      error: "Environment variable CHECKOUT_ENDPOINT belum diatur."
    });
  }

  if (
    !appsScriptUrl.startsWith("https://script.google.com/macros/s/") ||
    !appsScriptUrl.endsWith("/exec")
  ) {
    return res.status(500).json({
      ok: false,
      error: "CHECKOUT_ENDPOINT harus berupa URL Apps Script yang berakhiran /exec."
    });
  }

  try {
    const response = await fetch(appsScriptUrl, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      redirect: "follow",
      cache: "no-store"
    });

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      console.error("Respons Apps Script bukan JSON:", text.slice(0, 1000));

      return res.status(502).json({
        ok: false,
        error: "Respons daftar produk dari Apps Script tidak valid."
      });
    }

    if (!response.ok || !Array.isArray(data.products)) {
      return res.status(502).json({
        ok: false,
        error: data.error || "Daftar produk tidak ditemukan di respons Apps Script."
      });
    }

    const products = data.products
      .filter(product =>
        product &&
        String(product.name || "").trim() &&
        Number.isFinite(Number(product.price)) &&
        product.active !== false
      )
      .map(product => ({
        name: String(product.name).trim(),
        category: String(product.category || "").trim(),
        price: Number(product.price),
        stock: Math.max(0, Number(product.stock) || 0),
        active: product.active !== false
      }));

    return res.status(200).json({
      ok: true,
      products
    });
  } catch (error) {
    console.error("Products proxy error:", error);

    return res.status(502).json({
      ok: false,
      error: "Tidak dapat menghubungi Google Apps Script."
    });
  }
}