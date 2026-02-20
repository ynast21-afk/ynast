# SEO & Google Search Console Checklist

## 🔍 Google Search Console "Couldn't Fetch" Issue
**Current Status**: Although the sitemap status says "Couldn't Fetch", your **URL Inspection confirms the URL is on Google**.
**Diagnosis**: This is a **very common** behavior for new sites on Vercel.
- **Cause**: Google's crawler often times out or fails to parse sitemaps instantly for new domains, especially if the sitemap is generated dynamically.
- **Verification**: If "URL Inspection" says "URL is on Google", **you are indexed**. The sitemap error is a reporting lag in GSC and usually resolves itself within a few days to a week without any action.
- **Action**: Do **NOT** delete and resubmit the sitemap repeatedly. This resets the queue. Just leave it.

## ✅ SEO Improvements Applied (v2.3.0.26)
We have conducted a thorough review and improved the following for better visibility in **Video** and **Image** tabs:

### 1. Enhanced Video Schema (`VideoObject`)
- **Fix**: Corrected the `duration` format (ISO 8601) to handle hours/minutes correctly (e.g., `PT1H08M54S`).
- **New Feature**: Added `contentUrl` pointing directly to the video file (mp4). This significantly improves the chance of appearing in the **Video Tab** with a playable preview.
- **Existing**: `thumbnailUrl`, `name`, `description`, `uploadDate` were already correct.

### 2. Metadata Optimization
- **Title**: Dynamic titles include Video Title + Streamer Name for better click-through rate.
- **Description**: Includes keywords like "dance", "performance", "kStreamer" automatically.
- **OpenGraph**: Correctly set for sharing on Twitter/KakaoTalk/Discord.

### 3. Sitemap & Robots
- **robots.txt**: Correctly allows crawling of all content and points to `sitemap.xml`.
- **sitemap.xml**: Dynamically generates URLs for all videos.

## 🚀 How to Verify
1.  **Wait 2-3 Days**: After the next deployment, Google needs time to re-crawl.
2.  **Test Rich Results**: Use [Google Rich Results Test](https://search.google.com/test/rich-results) on a specific video URL (e.g., `https://kdance.xyz/video/1`).
    -   You should see a valid **Video** structured data item.
3.  **Search Queries**:
    -   `site:kdance.xyz` -> Lists all indexed pages.
    -   `"Streamer Name" kdance` -> Should show the video page.
    -   Video Tab: Search for the video title.

## ⚠️ Notes on "Unknown" in Search
If you see "Unknown" in search results initially, it's because the page was crawled before the data was fully hydrated. Our latest SSR (Server-Side Rendering) improvements ensure the correct title is served immediately to the bot.
