import * as cheerio from "cheerio";

// 카테고리 배열 (사용자가 직접 채울 수 있음)
const categories = ["113", "115", "116", "118"];  
// 113: TOP, 115: PANTS, 118: OUTER, 116: ACC

// 키워드 필터링
const keywords = ["Army"];

// 마지막 페이지 감지 함수
function isLastPage($) {
  // "다음" 링크가 없으면 마지막 페이지
  const nextBtn = $("a:contains('다음')");
  return nextBtn.length === 0;
}

// 스크래핑 함수
async function scrapeAllCategories() {
  const allResults = [];

  for (const xcode of categories) {
    console.log(`\n=== 카테고리 ${xcode} ===`);

    let pageNum = 1;

    while (true) {
      const url = `https://www.rocketsalad.co.kr/shop/shopbrand.html?xcode=${xcode}&type=X&page=${pageNum}`;
      console.log(`페이지 ${pageNum} 스크래핑 중...`);

      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        });

        const html = await res.text();
        const $ = cheerio.load(html);

        // 상품 container: table 단위
        const tables = $("td > table[cellpadding='0']");
        console.log("이 페이지 상품 테이블 개수:", tables.length);

        tables.each((_, el) => {
          const link = $(el).find("a").attr("href");
          const title = $(el).find("span.Tahoma").first().text().trim();
          const price = $(el).find("span.mk_price").text().trim();
          const img = $(el).find("img").attr("src");

          // 키워드 필터링
          if (keywords.some(k => title.includes(k))) {
            allResults.push({
              category: xcode,
              title,
              price,
              link: link ? `https://www.rocketsalad.co.kr${link}` : null,
              img: img ? `https://www.rocketsalad.co.kr${img}` : null
            });
          }
        });

        // 지금 페이지가 마지막이면 종료
        if (isLastPage($)) {
          console.log(` → 카테고리 ${xcode}: 마지막 페이지 도달`);
          break;
        }

        pageNum++; // 다음 페이지로 이동

      } catch (err) {
        console.error(`페이지 ${pageNum} 스크래핑 오류:`, err.message);
        break;
      }
    }
  }

  console.log("\n=== 전체 결과 ===");
  console.log("발견된 매물:", allResults.length);
  console.log(allResults);
}

// 실행
scrapeAllCategories();

//git 등록 120412
