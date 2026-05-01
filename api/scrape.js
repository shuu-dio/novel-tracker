export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const isGong = hostname.includes('gongzicp.com');
  const isJJ = hostname.includes('jjwxc.net');

  if (!isGong && !isJJ) {
    return res.status(400).json({ error: 'Only GongZiCP and JJWXC URLs are supported' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': isGong ? 'https://www.gongzicp.com/' : 'https://www.jjwxc.net/',
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Site returned ${response.status}` });
    }

    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    const html = decoder.decode(buffer);

    let data = {};

    if (isGong) {
      data = parseGongZiCP(html, url);
    } else if (isJJ) {
      data = parseJJWXC(html, url);
    }

    return res.status(200).json({ success: true, platform: isGong ? 'gong' : 'jj', ...data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function parseGongZiCP(html, url) {
  const get = (pattern) => {
    const m = html.match(pattern);
    return m ? m[1].trim() : '';
  };

  const title =
    get(/<h1[^>]*class="[^"]*novel-name[^"]*"[^>]*>([^<]+)</) ||
    get(/<h1[^>]*>([^<]+)<\/h1>/) ||
    get(/<title>([^<|·\-–]+)/) ||
    '';

  const author =
    get(/作者[：:]\s*<[^>]+>([^<]+)</) ||
    get(/作者[：:]([^<\n]+)/) ||
    get(/"author"[^>]*>([^<]+)</) ||
    '';

  const wordCount =
    get(/总字数[：:]\s*([0-9,万]+)/) ||
    get(/字数[：:]\s*([0-9,万]+)/) ||
    get(/([0-9,]+)\s*字/) ||
    '';

  const chapterCount =
    get(/共([0-9]+)章/) ||
    get(/([0-9]+)\s*章/) ||
    get(/章节数[：:]\s*([0-9]+)/) ||
    '';

  const tagsRaw = html.match(/class="[^"]*tag[^"]*"[^>]*>([^<]+)</g) || [];
  const tags = [...new Set(
    tagsRaw
      .map(t => t.replace(/class="[^"]*"[^>]*>/, '').replace(/<.*/, '').trim())
      .filter(t => t && t.length < 20 && t.length > 0)
  )].slice(0, 8);

  const cover =
    get(/<img[^>]*class="[^"]*cover[^"]*"[^>]*src="([^"]+)"/) ||
    get(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*cover[^"]*"/) ||
    '';

  return { title, author, wordCount, chapterCount, tags, cover, sourceUrl: url };
}

function parseJJWXC(html, url) {
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

  const wordCount =
    get(/总推荐.*?([0-9,]+)字/) ||
    get(/文章字数：([0-9,]+)/) ||
    get(/([0-9,]+)字/) ||
    '';

  const chapterCount =
    get(/共([0-9]+)个章节/) ||
    get(/([0-9]+)章/) ||
    '';

  const tagsRaw = html.match(/class="[^"]*tag[^"]*"[^>]*>([^<]+)</g) ||
    html.match(/\[([^\]]{2,10})\]/g) || [];
  const tags = [...new Set(
    tagsRaw
      .map(t => t.replace(/class="[^"]*"[^>]*>/, '').replace(/[\[\]<].*/,'').trim())
      .filter(t => t && t.length < 20 && t.length > 0)
  )].slice(0, 8);

  const cover =
    get(/<img[^>]*id="noveldefaultimage"[^>]*src="([^"]+)"/) ||
    get(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*cover[^"]*"/) ||
    '';

  return { title, author, wordCount, chapterCount, tags, cover, sourceUrl: url };
}
