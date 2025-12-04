
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 public 폴더 서빙 (Render에서 프론트까지 같이 사용 가능)
app.use(express.static("public"));

// 스크래핑 API
app.post("/api/scrape", async (req, res) => {
  const { keyword } = req.body;
  const url = "https://www.rocketsalad.co.kr/shop/shopbrand.html?xcode=118&type=X";

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    const results = [];

    $("td > table[cellpadding='0']").each((_, el) => {
      const title = $(el).find("span.Tahoma").text().trim();
      const price = $(el).find("span.mk_price").text().trim();
      const link = $(el).find("a").attr("href");
      const img = $(el).find("img").attr("src");

      if (keyword && !title.toLowerCase().includes(keyword.toLowerCase())) {
        return;
      }

      results.push({
        title,
        price,
        link: link ? `https://www.rocketsalad.co.kr${link}` : null,
        img: img ? `https://www.rocketsalad.co.kr${img}` : null
      });
    });

    res.json({ count: results.length, items: results });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Render가 지정하는 포트 사용
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
