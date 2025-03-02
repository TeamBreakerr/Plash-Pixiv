(function() {
  // 通用：等待元素出现
  function waitForElement(selector, callback) {
    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        obs.disconnect();
        callback(element);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 简单计算图片平均色作为主色调（注意：这种方式仅作示例，实际可替换为更专业的算法）
  function getDominantColorFromImage(img, callback) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    try {
      ctx.drawImage(img, 0, 0);
    } catch (e) {
      console.error('绘制图片到画布失败，可能存在跨域问题', e);
      return;
    }
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
    r = Math.floor(r / count);
    g = Math.floor(g / count);
    b = Math.floor(b / count);
    callback(`rgb(${r}, ${g}, ${b})`);
  }

  // 中转页面：加载图片，提取主色调后再进行显示
  function processImagePage() {
    const imgUrl = window.location.href.split('?')[0];
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imgUrl;
    img.onload = function() {
      getDominantColorFromImage(img, function(dominantColor) {
        console.log('提取的主色调:', dominantColor);
        document.body.innerHTML = `
          <img src="${imgUrl}" 
               style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; background: ${dominantColor};">
        `;
        document.body.style.backgroundColor = dominantColor;
      });
    };
    img.onerror = function() {
      console.error('图片加载失败');
    };
  }

  // 作品详情页逻辑：寻找原图链接，并跳转到中转页面
  function processArtworkPage() {
    waitForElement('a[href*="img-original"]', () => {
      const aElement = document.querySelector('a[href*="img-original"]');
      if (aElement) {
        const originalImageUrl = aElement.href;
        console.log('原图 URL:', originalImageUrl);
        const separator = originalImageUrl.includes('?') ? '&' : '?';
        window.location.href = originalImageUrl + separator + 'intermediate=true';
      } else {
        console.error('未找到包含原图链接的 <a> 元素。');
      }
    });
  }

  // 收藏页逻辑：随机选择页码后再随机选择一张图片
  function processBookmarksPage() {
    // 如果当前 URL 没有分页参数，则先随机选择一个页码
    if (window.location.href.indexOf('?p=') === -1) {
      waitForElement('nav.sc-xhhh7v-0', function(navElement) {
        const pageElements = navElement.querySelectorAll('a, button');
        let pages = [];
        pageElements.forEach(el => {
          const span = el.querySelector('span');
          if (span) {
            const pageNum = parseInt(span.textContent.trim(), 10);
            if (!isNaN(pageNum)) {
              let href = '';
              if (el.tagName.toLowerCase() === 'a' && el.href) {
                href = el.href;
              } else {
                // 对于 button 元素，构造 URL（默认基于当前页面地址）
                href = window.location.href + '?p=' + pageNum;
              }
              pages.push({ page: pageNum, url: href });
            }
          }
        });
        if (pages.length > 0) {
          const randomPage = pages[Math.floor(Math.random() * pages.length)];
          if (window.location.href !== randomPage.url) {
            console.log('随机选择的页码 URL:', randomPage.url);
            window.location.href = randomPage.url;
            return;
          }
        }
        // 若已在随机页或无分页链接，则直接选择随机作品
        selectRandomArtwork();
      });
    } else {
      // 已有分页参数，直接选择随机作品
      selectRandomArtwork();
    }
  }

  // 从当前页面随机选择一张作品图片
  function selectRandomArtwork() {
    waitForElement('a[href^="/artworks/"]', function() {
      const workLinks = document.querySelectorAll('a[href^="/artworks/"]');
      if (workLinks.length === 0) {
        console.error('未在页面上找到任何艺术作品链接。');
        return;
      }
      const randomIndex = Math.floor(Math.random() * workLinks.length);
      const selectedWorkLink = workLinks[randomIndex];
      const workPageUrl = selectedWorkLink.href;
      console.log('跳转到作品页面 URL:', workPageUrl);
      window.location.href = workPageUrl;
    });
  }

  // 主逻辑：根据当前 URL 判断运行逻辑
  if (window.location.href.includes('/users/10343884/bookmarks/artworks')) {
    processBookmarksPage();
  } else if (window.location.search.includes('intermediate=true')) {
    processImagePage();
  } else if (window.location.href.includes('/artworks/')) {
    processArtworkPage();
  } else {
    console.log('未识别的 Pixiv 页面。');
  }
})();
