import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// 🔍 xcode 자동 수집
async function getXcodes() {
  const url = "https://www.rocketsalad.co.kr/shop/shopbrand.html";

  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  const html = await res.text();
  const $ = cheerio.load(html);

  const xcodes = new Set();

  $("area").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const match = href.match(/xcode=(\d+)/);
    if (match) xcodes.add(match[1]);
  });

  return [...xcodes];
}

// 🔍 mcode 자동 수집
async function getMcodes(xcode) {
  const url = `https://www.rocketsalad.co.kr/shop/shopbrand.html?xcode=${xcode}&type=X`;

  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  const html = await res.text();
  const $ = cheerio.load(html);

  const mcodes = new Set();

  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const match = href.match(/mcode=(\d+)/);
    if (match) mcodes.add(match[1]);
  });

  return [...mcodes];
}

// 마지막 페이지 판단
function isLastPage($) {
  const nextBtn = $("a:contains('다음')");
  return nextBtn.length === 0;
}


// 🔥 전체 스크래핑 API
app.post("/api/scrape", async (req, res) => {
  const keyword = req.body.keyword?.toLowerCase() ?? "";
  const results = [];

  try {
    const xcodes = await getXcodes();
    console.log("수집된 Xcode:", xcodes);

    for (const xcode of xcodes) {
      const mcodes = await getMcodes(xcode);

      // mcode가 없으면 단일 xcode 루프
      const mcodeList = mcodes.length > 0 ? mcodes : [null];

      for (const mcode of mcodeList) {
        let page = 1;
        let lastPage = false;

        while (!lastPage) {
          const url = mcode
            ? `https://www.rocketsalad.co.kr/shop/shopbrand.html?xcode=${xcode}&mcode=${mcode}&type=X&page=${page}`
            : `https://www.rocketsalad.co.kr/shop/shopbrand.html?xcode=${xcode}&type=X&page=${page}`;

          console.log("스크래핑:", url);

          const response = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0" }
          });

          const html = await response.text();
          const $ = cheerio.load(html);

          const tables = $("td > table[cellpadding='0']");

          tables.each((_, el) => {
            const title = $(el).find("span.Tahoma").first().text().trim();
            const price = $(el).find("span.mk_price").text().trim();
            const link = $(el).find("a").attr("href");
            const img = $(el).find("img").attr("src");

            if (!title) return;
            if (keyword && !title.toLowerCase().includes(keyword)) return;

            results.push({
              xcode,
              mcode,
              title,
              price,
              link: link ? `https://www.rocketsalad.co.kr${link}` : null,
              img: img ? `https://www.rocketsalad.co.kr${img}` : null
            });
          });

          lastPage = isLastPage($);
          page++;
        }
      }
    }

    res.json({ count: results.length, items: results });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
