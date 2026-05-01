export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  let hostname, pathname;
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname;
    pathname = parsed.pathname;
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const isGong = hostname.includes('gongzicp.com');
  const isJJ = hostname.includes('jjwxc.net');

  if (!isGong && !isJJ) {
    return res.status(400).json({ error: 'Only GongZiCP and JJWXC URLs are supported' });
  }

  try {
    if (isGong) {
      const data = await fetchGongZiCP(pathname, url);
      return res.status(200).json({ success: true, platform: 'gong', ...data });
    } else {
      const data = await fetchJJWXC(url);
      return res.status(200).json({ success: true, platform: 'jj', ...data });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ── GongZiCP: use their internal JSON API directly ──
async function fetchGongZiCP(pathname, sourceUrl) {
  const idMatch = pathname.match(/novel-(\d+)/);
  if (!idMatch) throw new Error('Could not extract novel ID from URL');
  const novelId = idMatch[1];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    'Referer': `https://www.gongzicp.com/novel-${novelId}.html`,
    'Accept': 'application/json, text/plain, */*',
    'Authorization': 'Basic 6ZmI5aSn5a6dOmNwMTIzNDU2',
    'Client': 'pc',
    'Content-Type': 'application/json',
    'Token': 'undefined',
  };

  const [infoRes, chaptersRes] = await Promise.all([
    fetch(`https://www.gongzicp.com/webapi/novel/novelInfo?id=${novelId}`, { headers }),
    fetch(`https://www.gongzicp.com/webapi/novel/chapterGetList?nid=${novelId}`, { headers }),
  ]);

  if (!infoRes.ok) throw new Error(`GongZiCP API returned ${infoRes.status}`);
  const infoJson = await infoRes.json();

  if (infoJson.code !== 200 || !infoJson.data) {
    throw new Error('GongZiCP API returned no data');
  }

  const d = infoJson.data;

  let chapterCount = '';
  if (chaptersRes.ok) {
    const chapJson = await chaptersRes.json();
    if (chapJson.data?.list) {
      const count = chapJson.data.list.filter(c => c.type === 'item').length;
      chapterCount = String(count);
    }
  }

  const wordCount = d.novel_wordnumber
    ? d.novel_wordnumber.toLocaleString('zh-CN') + '字'
    : '';

  const tags = [
    ...(d.type_list || []),
    ...(d.tag_list || []),
  ].filter(Boolean).slice(0, 8);

  return {
    title: d.novel_name || '',
    author: d.author_nickname || '',
    wordCount,
    chapterCount,
    tags,
    cover: d.novel_cover || '',
    status: d.novel_process || '',
    sourceUrl,
  };
}

// ── JJWXC: scrape HTML with GBK encoding ──
async function fetchJJWXC(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': 'https://www.jjwxc.net/',
    }
  });

  if (!response.ok) throw new Error(`JJWXC returned ${response.status}`);

  // JJWXC uses GBK encoding
  const buffer = await response.arrayBuffer();
  const html = new TextDecoder('gbk').decode(buffer);

  const get = (pattern) => {
    const m = html.match(pattern);
    return m ? m[1].trim() : '';
  };

  const title =
    get(/<span\s+itemprop="articleSection"[^>]*>([^<]+)</) ||
    get(/<h1[^>]*>([^<]+)<\/h1>/) ||
    get(/<title>([^_\-|<]+)/) ||
    '';

  const author =
    get(/作者：<a[^>]+>([^<]+)</) ||
    get(/itemprop="author"[^>]*>([^<]+)</) ||
    get(/作者[：:]([^<\n，,]{1,20})/) ||
    '';

  // word count from itemprop="wordCount" e.g. 389931字
  const wordCount =
    get(/itemprop="wordCount">([^<]+)/) ||
    get(/全文字数：<\/span><span[^>]*>([^<]+)/) ||
    get(/文章字数：([0-9,]+字)/) ||
    '';

  // JJWXC doesn't show total chapter count on the novel page
  const chapterCount = '';

  // Genre from itemprop="genre" — e.g. "原创-言情-近代现代-爱情"
  const genreRaw = get(/itemprop="genre"[^>]*>\s*([^<]+)\s*</);
  const tags = genreRaw
    ? [...new Set(genreRaw.split('-').map(t => t.trim()).filter(t => t && t !== '原创'))]
    : [];

  const cover =
    get(/<img[^>]*id="noveldefaultimage"[^>]*src="([^"]+)"/) ||
    '';

  return { title, author, wordCount, chapterCount, tags, cover, sourceUrl: url };
}
