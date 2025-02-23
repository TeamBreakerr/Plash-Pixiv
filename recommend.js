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
    // 新建图片元素加载图片
    const img = new Image();
    img.crossOrigin = "Anonymous"; // 尝试跨域访问
    img.src = imgUrl;
    img.onload = function() {
      getDominantColorFromImage(img, function(dominantColor) {
        console.log('提取的主色调:', dominantColor);
        // 重新构造页面：显示图片，并用主色调作为背景
        document.body.innerHTML = `
          <img src="${imgUrl}" 
               style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; background: ${dominantColor};">
        `;
        document.body.style.backgroundColor = dominantColor; // 保证背景色应用

        // 停止执行任何跳转操作
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
        // 跳转到原图页面，并附加中转参数
        const separator = originalImageUrl.includes('?') ? '&' : '?';
        window.location.href = originalImageUrl + separator + 'intermediate=true';
      } else {
        console.error('未找到包含原图链接的 <a> 元素。');
      }
    });
  }

  // 主逻辑：根据当前 URL 判断运行逻辑
  if (window.location.href.includes('/artworks/')) {
    // 当前处于作品详情页
    processArtworkPage();
  } else if (window.location.search.includes('intermediate=true')) {
    // 当前为中转页面：进行图片加载和主色调提取
    processImagePage();
  } else {
    // 其他页面：等待作品链接加载后随机跳转
    waitForElement('a[href^="/artworks/"]', () => {
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
})();
