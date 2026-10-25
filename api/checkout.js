export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
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

  let body = req.body;

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({
        ok: false,
        error: "Body request bukan JSON yang valid."
      });
    }
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      ok: false,
      error: "Format body request tidak valid."
    });
  }

  if (body.action !== "createOrder") {
    return res.status(400).json({
      ok: false,
      error: 'Action request harus bernilai "createOrder".'
    });
  }

  if (!body.order || typeof body.order !== "object") {
    return res.status(400).json({
      ok: false,
      error: "Data pesanan tidak ditemukan."
    });
  }

  const customer = String(body.order.customer || "").trim();
  const buyerEmail = String(body.order.buyerEmail || "")
    .trim()
    .toLowerCase();
  const items = body.order.items;

  if (!customer) {
    return res.status(400).json({
      ok: false,
      error: "Nama pembeli wajib diisi."
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
    return res.status(400).json({
      ok: false,
      error: "Email pembeli tidak valid."
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      ok: false,
      error: "Keranjang kosong atau format item tidak valid."
    });
  }

  const normalizedItems = [];

  for (const item of items) {
    if (!item || typeof item !== "object") {
      return res.status(400).json({
        ok: false,
        error: "Format item pesanan tidak valid."
      });
    }

    const name = String(item.name || item.product || "").trim();
    const qty = Number(item.qty || item.quantity);

    if (!name) {
      return res.status(400).json({
        ok: false,
        error: "Nama produk wajib diisi."
      });
    }

    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({
        ok: false,
        error: `Jumlah produk "${name}" tidak valid.`
      });
    }

    normalizedItems.push({ name, qty });
  }

  const payload = {
    action: "createOrder",
    order: {
      customer,
      buyerEmail,
      items: normalizedItems
    }
  };

  try {
    const upstreamResponse = await fetch(appsScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
        Accept: "application/json"
      },
      body: JSON.stringify(payload),
      redirect: "follow"
    });

    const responseText = await upstreamResponse.text();
    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      console.error(
        "Respons checkout Apps Script bukan JSON:",
        responseText.slice(0, 1000)
      );

      return res.status(502).json({
        ok: false,
        error: "Respons checkout dari Apps Script tidak valid."
      });
    }

    if (!upstreamResponse.ok || result.ok !== true) {
      return res.status(502).json({
        ok: false,
        error: result.error || "Apps Script gagal memproses pesanan."
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Checkout proxy error:", error);

    return res.status(502).json({
      ok: false,
      error: "Tidak dapat menghubungi Google Apps Script."
    });
  }
}