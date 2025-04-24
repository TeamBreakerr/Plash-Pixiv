(function() {
  // 通用：等待元素出现
  function waitForElement(selector, callback) {
    let element = document.querySelector(selector);
    if (element) {
      callback(element);
      return;
    }

    const observer = new MutationObserver((mutations, obs) => {
      element = document.querySelector(selector);
      if (element) {
        obs.disconnect(); // 找到后停止观察
        callback(element);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 简单计算图片平均色作为主色调
  function getDominantColorFromImage(img, callback) {
    const canvas = document.createElement('canvas');
    // 降低画布尺寸可以提高性能，但可能牺牲一点精度
    const scaleFactor = Math.min(1, 100 / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = img.naturalWidth * scaleFactor;
    canvas.height = img.naturalHeight * scaleFactor;
    const ctx = canvas.getContext('2d');
    try {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height); // 绘制缩放后的图片
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let r = 0, g = 0, b = 0, count = 0;
      // 增加步长以提高性能，例如每隔 5 个像素取一个点
      const step = 5 * 4; // 5像素 * 4通道 (RGBA)
      for (let i = 0; i < data.length; i += step) {
        // 可选：忽略接近纯白或纯黑的像素，或透明像素
        if (data[i + 3] < 250) continue; // 忽略透明度低的像素
        // if (data[i] > 250 && data[i + 1] > 250 && data[i + 2] > 250) continue; // 忽略白色
        // if (data[i] < 10 && data[i + 1] < 10 && data[i + 2] < 10) continue; // 忽略黑色

        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      if (count > 0) {
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        callback(`rgb(${r}, ${g}, ${b})`);
      } else {
         // 如果所有像素都被忽略了，返回一个默认颜色
         callback('rgb(128, 128, 128)'); // 例如灰色
      }
    } catch (e) {
      console.error('绘制图片到画布失败，可能存在跨域问题或图片格式问题', e);
      callback('rgb(128, 128, 128)'); // 失败时返回默认颜色
    }
  }

  // 中转页面：加载图片，提取主色调后再进行显示
  function processImagePage() {
    const imgUrl = window.location.href.split('?')[0]; // 获取不带参数的 URL
    console.log('中转页：加载图片 URL:', imgUrl);
    const img = new Image();
    img.crossOrigin = "Anonymous"; // 尝试匿名加载以允许 Canvas 操作
    img.src = imgUrl;
    img.onload = function() {
      console.log('图片已加载，开始提取主色调...');
      getDominantColorFromImage(img, function(dominantColor) {
        console.log('提取的主色调:', dominantColor);
        document.body.style.margin = '0';
        document.body.style.height = '100%';
        document.body.style.backgroundColor = dominantColor;
        // 清空 body 内容，防止干扰
        document.body.innerHTML = '';
        // 创建并添加图片元素
        const imgElement = document.createElement('img');
        imgElement.src = imgUrl;
        imgElement.style.position = 'absolute';
        imgElement.style.top = '0';
        imgElement.style.left = '0';
        imgElement.style.width = '100%';
        imgElement.style.height = '100%';
        imgElement.style.objectFit = 'contain'; // 保持图片比例缩放
        imgElement.style.backgroundColor = dominantColor; // 背景填充
        document.body.appendChild(imgElement);
        console.log('图片已显示');
      });
    };
    img.onerror = function() {
      console.error('图片加载失败:', imgUrl);
      // 可以选择显示错误信息或跳转回来源页等
      document.body.innerHTML = `<div style="color: white; text-align: center; padding-top: 20px;">图片加载失败: ${imgUrl}</div>`;
      document.body.style.backgroundColor = 'rgb(50, 50, 50)'; // 出错时显示深灰色背景
    };
  }

  // 作品详情页逻辑：寻找原图链接，并跳转到中转页面
  function processArtworkPage() {
    console.log('等待原图链接...');
    // 等待包含 'img-original' 的链接出现
    waitForElement('a[href*="img-original"]', (aElement) => {
      console.log('找到包含原图链接的 <a> 元素:', aElement);
      const originalImageUrl = aElement.href;
      console.log('原图 URL:', originalImageUrl);
      // 检查 URL 是否已经是图片格式结尾，防止错误跳转
      if (/\.(jpg|jpeg|png|gif|webp)$/i.test(originalImageUrl.split('?')[0])) {
        const separator = originalImageUrl.includes('?') ? '&' : '?';
        const intermediateUrl = originalImageUrl + separator + 'intermediate=true';
        console.log('跳转到中转页面 URL:', intermediateUrl);
        window.location.href = intermediateUrl;
      } else {
         console.error('找到的链接似乎不是有效的图片 URL:', originalImageUrl);
         // 可以在这里添加一些后备逻辑，例如尝试查找其他可能的元素或停止执行
      }
    });
    // 可以添加一个超时逻辑，以防元素长时间不出现
    setTimeout(() => {
        if (!document.querySelector('a[href*="img-original"]')) {
            console.error('等待原图链接超时 (15s)。');
        }
    }, 15000); // 例如等待15秒
  }

  // 从导航元素中提取所有有效的页码链接
  function extractAllPageLinks(navElement) {
    console.log('在导航元素内提取所有页码链接...');
    if (!navElement) {
       console.log('导航元素无效');
       return [];
    }
    const allLinks = navElement.getElementsByTagName('a');
    const pageLinks = Array.from(allLinks).filter(link => {
      // 过滤条件：
      // 1. 链接可见 (非 hidden)
      // 2. 必须有 href 属性
      // 3. href 包含 '?p='
      // 4. 链接内不直接包含 <svg> 元素 (以排除 Pixiv 的箭头按钮)
      // 5. 链接内包含 <span> 元素 (数字页码通常在 span 内)
      return !link.hidden &&
             link.href &&
             link.href.includes('?p=') &&
             !link.querySelector('svg') &&
             link.querySelector('span');
    });
    console.log(`找到 ${pageLinks.length} 个页码链接`);
    return pageLinks;
  }

  // 收藏页逻辑：随机选择页码后再随机选择一张图片
  function processBookmarksPage() {
    console.log('处理书签页面...');
    // 如果已经是带页码的页面，直接选作品
    if (window.location.href.includes('?p=')) {
      console.log('当前URL已有页码参数，直接选择随机作品');
      selectRandomArtwork();
      return;
    }

    // 等待一个数字页码链接出现，然后找它的父 <nav>
    const pageLinkSelector = 'nav a[href*="?p="]:not(:has(svg)):has(span)';
    let elementFound = false;
    let timeoutHandle = null;

    console.log(`开始等待第一个页码链接: ${pageLinkSelector}`);

    timeoutHandle = setTimeout(() => {
      if (!elementFound) {
        console.error(`等待页码链接 (${pageLinkSelector}) 超时 (10s)，直接选择随机作品`);
        selectRandomArtwork();
      }
    }, 10000); // 10秒超时

    waitForElement(pageLinkSelector, (pageLinkElement) => {
      if (elementFound) return; // 防止重复执行
      elementFound = true;
      clearTimeout(timeoutHandle);

      console.log('第一个页码链接已找到:', pageLinkElement);
      const navElement = pageLinkElement.closest('nav');

      if (navElement) {
        console.log('父级 <nav> 元素已找到:', navElement);
        const pageLinks = extractAllPageLinks(navElement);

        if (pageLinks.length > 0) {
          const randomIndex = Math.floor(Math.random() * pageLinks.length);
          const selectedLink = pageLinks[randomIndex];
          console.log(`随机选择了链接: ${selectedLink.href}`);

          // 跳转前检查当前 URL
          const currentUrl = window.location.href;
          if (currentUrl.includes('/bookmarks') && !currentUrl.includes('?p=')) {
             console.log("准备跳转到选中的页码链接...");
             window.location.href = selectedLink.href;
          } else {
             console.warn(`页面URL已改变 (当前: ${currentUrl}) 或已包含页码参数，取消跳转。尝试直接选择随机作品。`);
             selectRandomArtwork();
          }
        } else {
          console.log('在找到的导航元素中未找到足够的页码链接，直接选择随机作品');
          selectRandomArtwork();
        }
      } else {
        console.error('找到了页码链接，但未能找到其父级 <nav> 元素。直接选择随机作品');
        selectRandomArtwork();
      }
    });
  }

  // 从当前页面随机选择一张作品图片并跳转
  function selectRandomArtwork() {
    console.log('等待作品链接...');
    // 等待包含 /artworks/ 的链接出现
    waitForElement('a[href^="/artworks/"]', () => {
      // 使用 querySelectorAll 获取所有匹配的链接
      const workLinks = document.querySelectorAll('a[href^="/artworks/"]');
      if (workLinks.length === 0) {
        console.error('未在页面上找到任何艺术作品链接 (a[href^="/artworks/"])。');
        // 可以在这里添加重试或停止逻辑
        return;
      }
      console.log(`找到 ${workLinks.length} 个作品链接。`);
      // 过滤掉可能指向用户页或其他非作品页的链接（如果需要更精确）
      const validWorkLinks = Array.from(workLinks).filter(link => /^\/artworks\/\d+$/.test(new URL(link.href).pathname));
       if (validWorkLinks.length === 0) {
          console.error('过滤后未找到有效的作品链接 (格式如 /artworks/12345)。');
          // 可能需要调整过滤条件或选择第一个找到的链接作为备选
          if (workLinks.length > 0) {
              console.log("尝试使用第一个找到的 /artworks/ 链接作为备选。")
              validWorkLinks.push(workLinks[0]); // 将第一个原始链接加入列表
          } else {
              return; // 如果原始列表也是空的，则无法继续
          }
      }
      console.log(`过滤后剩下 ${validWorkLinks.length} 个有效作品链接。`);

      const randomIndex = Math.floor(Math.random() * validWorkLinks.length);
      const selectedWorkLink = validWorkLinks[randomIndex];
      const workPageUrl = selectedWorkLink.href;
      console.log('随机选择的作品页面 URL:', workPageUrl);
      window.location.href = workPageUrl;
    });
     // 可以添加一个超时逻辑，以防元素长时间不出现
    setTimeout(() => {
        if (document.querySelectorAll('a[href^="/artworks/"]').length === 0) {
            console.error('等待作品链接超时 (15s)。');
        }
    }, 15000); // 例如等待15秒
  }

  // 主逻辑：根据当前 URL 判断运行哪部分代码
  function run() {
      const currentUrl = window.location.href;
      console.log('脚本开始执行，当前URL:', currentUrl);

      // 避免在 about:blank 或非目标页面执行核心逻辑
      if (currentUrl === 'about:blank' || !currentUrl.startsWith('http')) {
          console.log('当前页面是 about:blank 或非 HTTP(S) 页面，脚本停止执行。');
          return;
      }

      // 注意：检查顺序很重要，更具体的路径应该先检查
      if (currentUrl.includes('/artworks/')) {
          // 检查是否是中转图片页面
          if (window.location.search.includes('intermediate=true')) {
              console.log('检测到图片中转页面，执行图片处理逻辑');
              processImagePage();
          } else {
              console.log('检测到作品详情页面，执行作品页面处理逻辑');
              processArtworkPage();
          }
      } else if (currentUrl.includes('/bookmarks')) {
          console.log('检测到书签页面，执行书签页面处理逻辑');
          processBookmarksPage();
      } else {
          console.log('当前页面类型无法识别，脚本不执行特定操作。');
      }
  }

  // --- 执行入口 ---
  // 可选：延迟一点点执行，确保页面基础结构加载
  // setTimeout(run, 100);
  // 或者直接执行
  run();

})(); // 立即执行函数结束
