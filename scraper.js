
import * as cheerio from "cheerio";

// 카테고리 배열 (원하는대로 수정 가능)
const categories = ["113", "115", "116", "118"];

// "다음" 버튼이 있는지 체크
function isLastPage($) {
  const nextBtn = $("a:contains('다음')");
  return nextBtn.length === 0;
}

export default async function scrape(keyword) {
  const allResults = [];

  for (const xcode of categories) {
    console.log(`카테고리 ${xcode} 시작`);

    for (let pageNum = 1; pageNum <= 100; pageNum++) {
      const url = `https://www.rocketsalad.co.kr/shop/shopbrand.html?xcode=${xcode}&type=X&page=${pageNum}`;
      console.log(`[${xcode}] 페이지 ${pageNum} 요청 중...`);

      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0"
          }
        });

        const html = await res.text();
        const $ = cheerio.load(html);

        const tables = $("td > table[cellpadding='0']");
        console.log(`상품 테이블 개수: ${tables.length}`);

        if (tables.length === 0) break;

        tables.each((_, el) => {
          const title = $(el).find("span.Tahoma").first().text().trim();
          const price = $(el).find("span.mk_price").text().trim();
          const link = $(el).find("a").attr("href");
          const img = $(el).find("img").attr("src");

          if (title.includes(keyword)) {
            allResults.push({
              category: xcode,
              title,
              price,
              link: link ? `https://www.rocketsalad.co.kr${link}` : null,
              img: img ? `https://www.rocketsalad.co.kr${img}` : null
            });
          }
        });

        if (isLastPage($)) break;

      } catch (err) {
        console.error("스크래핑 오류:", err.message);
      }
    }
  }

  return allResults;
}
