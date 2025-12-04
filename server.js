import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// 🔥 사용할 카테고리
const categories = ["113", "115", "116", "118"];

// 🔍 마지막 페이지 판별
function isLastPage($) {
  return $("a:contains('다음')").length === 0;
}

// 🔥 스크래핑 API
app.post("/api/scrape", async (req, res) => {
  const keyword = req.body.keyword?.toLowerCase() ?? "";
  const results = [];
  const debug = [];
  const seen = new Set();

  try {
    for (const xcode of categories) {
      let page = 1;

      while (true) {
        const url = `https://www.rocketsalad.co.kr/shop/shopbrand.html?xcode=${xcode}&type=X&page=${page}`;
        debug.push(`요청: ${url}`);

        const response = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" }
        });

        const html = await response.text();
        const $ = cheerio.load(html);

        const tables = $("td > table[cellpadding='0']");
        debug.push(`xcode=${xcode} page=${page} found=${tables.length}`);

        if (tables.length === 0) break;

        tables.each((_, el) => {
          const title = $(el).find("span.Tahoma").first().text().trim();
          const price = $(el).find("span.mk_price").first().text().trim();
          const link = $(el).find("a").attr("href");
          const img = $(el).find("img").attr("src");

          if (!title) return;
          if (keyword && !title.toLowerCase().includes(keyword)) return;

          const id = link;
          if (seen.has(id)) return;
          seen.add(id);

          results.push({
            xcode,
            title,
            price,
            link: link ? `https://www.rocketsalad.co.kr${link}` : null,
            img: img ? `https://www.rocketsalad.co.kr${img}` : null
          });
        });

        if (isLastPage($)) break;
        page++;
      }
    }

    return res.json({
      success: true,
      count: results.length,
      items: results,
      debug
    });

  } catch (err) {
    console.error("SERVER ERROR:", err);

    return res.status(500).json({
      success: false,
      error: err.message,
      debug
    });
  }
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
