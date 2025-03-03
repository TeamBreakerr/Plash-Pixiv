(function() {
  // 通用：等待元素出现
  function waitForElement(selector, callback) {
    if (document.querySelector(selector)) {
      callback(document.querySelector(selector));
      return;
    }
    
    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        obs.disconnect();
        callback(element);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 简单计算图片平均色作为主色调
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
        // Set the body styles and image with inline styles
        document.body.style.margin = '0px';
        document.body.style.height = '100%';
        document.body.style.backgroundColor = dominantColor;
        document.body.innerHTML = `
          <img src="${imgUrl}" 
               style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; background: ${dominantColor};">
        `;
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

  // 从网页中提取所有页码链接的函数
  function extractAllPageLinks() {
    console.log('开始提取所有页码链接...');
    const navElement = document.querySelector('nav.sc-xhhh7v-0');
    if (navElement) {
      console.log('找到导航元素');
      const allLinks = navElement.getElementsByTagName('a');
      const pageLinks = Array.from(allLinks).filter(link => {
        return !link.hidden && 
               link.href && 
               link.href.includes('?p=') && 
               !link.querySelector('svg');
      });
      console.log(`找到 ${pageLinks.length} 个页码链接`);
      return pageLinks;
    } 
    console.log('未找到导航元素');
    return [];
  }

  // 收藏页逻辑：随机选择页码后再随机选择一张图片
  function processBookmarksPage() {
    console.log('处理书签页面...');
    if (window.location.href.includes('?p=')) {
      console.log('当前URL已有页码参数，直接选择随机作品');
      selectRandomArtwork();
      return;
    }
    setTimeout(() => {
      console.log('开始查找页码链接...');
      const pageLinks = extractAllPageLinks();
      if (pageLinks.length > 0) {
        const randomIndex = Math.floor(Math.random() * pageLinks.length);
        const selectedLink = pageLinks[randomIndex];
        console.log(`随机选择了链接: ${selectedLink.href}`);
        window.location.href = selectedLink.href;
      } else {
        console.log('未找到足够的页码链接，直接选择随机作品');
        selectRandomArtwork();
      }
    }, 1000);
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
  console.log('脚本开始执行，当前URL:', window.location.href);
  
  if (window.location.href.includes('/bookmarks')) {
    console.log('检测到书签页面，执行书签页面处理逻辑');
    processBookmarksPage();
  } else if (window.location.href.includes('/artworks/')) {
    console.log('检测到作品页面，执行作品页面处理逻辑');
    processArtworkPage();
  } else if (window.location.search.includes('intermediate=true')) {
    console.log('检测到图片页面，执行图片处理逻辑');
    processImagePage();
  } else {
    console.log('无法识别当前页面类型');
  }
})();
