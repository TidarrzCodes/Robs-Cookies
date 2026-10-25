export default async function handler(req, res) {
  // Endpoint ini hanya menerima POST.
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      error: "Method tidak diizinkan."
    });
  }

  // URL Web App Google Apps Script disimpan di Vercel:
  // Settings → Environment Variables → CHECKOUT_ENDPOINT
  const appsScriptUrl = process.env.CHECKOUT_ENDPOINT;

  if (!appsScriptUrl) {
    return res.status(500).json({
      ok: false,
      error: "Environment variable CHECKOUT_ENDPOINT belum diatur di Vercel."
    });
  }

  // Pastikan URL menunjuk ke Apps Script Web App.
  if (
    !appsScriptUrl.startsWith("https://script.google.com/macros/s/") ||
    !appsScriptUrl.endsWith("/exec")
  ) {
    return res.status(500).json({
      ok: false,
      error: "CHECKOUT_ENDPOINT harus berupa URL Web App Apps Script yang berakhiran /exec."
    });
  }

  // Vercel biasanya sudah mem-parse JSON menjadi objek.
  // Jika yang diterima string, parse satu kali.
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

  // Validasi struktur request yang diharapkan Apps Script.
  if (body.action !== "createOrder") {
    return res.status(400).json({
      ok: false,
      error: 'Action request harus bernilai "createOrder".'
    });
  }

  if (!body.order || typeof body.order !== "object") {
    return res.status(400).json({
      ok: false,
      error: "Data order tidak ditemukan."
    });
  }

  const customer = String(body.order.customer || "").trim();
  const buyerEmail = String(body.order.buyerEmail || "").trim();
  const items = body.order.items;

  if (!customer) {
    return res.status(400).json({
      ok: false,
      error: "Nama pembeli wajib diisi."
    });
  }

  if (!buyerEmail) {
    return res.status(400).json({
      ok: false,
      error: "Email pembeli wajib diisi."
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      ok: false,
      error: "Keranjang pesanan kosong atau format item tidak valid."
    });
  }

  const invalidItem = items.some(item => {
    return (
      !item ||
      typeof item !== "object" ||
      !String(item.name || "").trim() ||
      !Number.isInteger(Number(item.qty)) ||
      Number(item.qty) < 1
    );
  });

  if (invalidItem) {
    return res.status(400).json({
      ok: false,
      error: "Nama produk atau jumlah item tidak valid."
    });
  }

  // Bentuk ulang payload agar hanya data yang dibutuhkan diteruskan.
  const payload = {
    action: "createOrder",
    order: {
      customer,
      buyerEmail,
      items: items.map(item => ({
        name: String(item.name).trim(),
        qty: Number(item.qty)
      }))
    }
  };

  try {
    const upstreamResponse = await fetch(appsScriptUrl, {
      method: "POST",
      headers: {
        // Apps Script membaca JSON dari postData.contents.
        "Content-Type": "text/plain;charset=utf-8"
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
        "Respons Apps Script bukan JSON:",
        responseText.slice(0, 1000)
      );

      return res.status(502).json({
        ok: false,
        error: "Respons dari Apps Script tidak valid. Periksa deployment dan izin Web App."
      });
    }

    // Apps Script dapat mengembalikan JSON dengan ok: false.
    if (!upstreamResponse.ok || result.ok !== true) {
      return res.status(502).json({
        ok: false,
        error:
          result.error ||
          "Apps Script menolak atau gagal memproses pesanan."
      });
    }

    // Teruskan hasil sukses dari Apps Script ke landing page.
    return res.status(200).json(result);
  } catch (error) {
    console.error("Checkout proxy error:", error);

    return res.status(502).json({
      ok: false,
      error: "Tidak dapat menghubungi Google Apps Script."
    });
  }
}